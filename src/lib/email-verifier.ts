import { promises as dns } from "dns"
import { SMTPClient, type SMTPVerificationResult } from "./smtp-client"
import { validateEmailSyntax, extractDomain } from "./verifier"
import { isDisposableDomain } from "./disposable-domains"
import pLimit from "p-limit"

export interface VerificationDetails {
  syntaxOk: boolean
  disposable: boolean
  mxRecords: string[]
  smtpResponse: { code: number; text: string } | null
  timeTakenMs: number
  error?: string
}

export interface EmailVerificationResult {
  email: string
  status: "deliverable" | "not_deliverable" | "invalid" | "disposable" | "unknown"
  details: VerificationDetails
}

export class EmailVerifier {
  private smtpTimeout: number
  private maxConcurrent: number
  private fromEmail: string
  private allowSmtpVerification: boolean
  private limit: ReturnType<typeof pLimit>

  constructor(
    options: {
      smtpTimeout?: number
      maxConcurrent?: number
      fromEmail?: string
      allowSmtpVerification?: boolean
    } = {},
  ) {
    this.smtpTimeout = options.smtpTimeout || 8000
    this.maxConcurrent = options.maxConcurrent || 5
    this.fromEmail = options.fromEmail || "no-reply@example.com"
    this.allowSmtpVerification = options.allowSmtpVerification !== false
    this.limit = pLimit(this.maxConcurrent)
  }

  private async resolveMxRecords(domain: string): Promise<string[]> {
    try {
      const mxRecords = await dns.resolveMx(domain)
      return mxRecords.sort((a, b) => a.priority - b.priority).map((record) => record.exchange)
    } catch (error) {
      // If MX lookup fails, try A record as fallback
      try {
        const aRecords = await dns.resolve4(domain)
        return aRecords.length > 0 ? [domain] : []
      } catch (aError) {
        return []
      }
    }
  }

  private async performSmtpVerification(email: string, mxRecords: string[]): Promise<SMTPVerificationResult> {
    if (!this.allowSmtpVerification || mxRecords.length === 0) {
      return { success: false, error: "SMTP verification disabled or no MX records" }
    }

    const smtpClient = new SMTPClient(this.smtpTimeout, this.fromEmail)

    // Try each MX record in order of priority
    for (const mxHost of mxRecords) {
      try {
        const result = await smtpClient.verifyEmail(email, mxHost)
        if (result.success || result.response) {
          return result
        }
      } catch (error) {
        // Continue to next MX record
        continue
      }
    }

    return { success: false, error: "All MX servers failed or unreachable" }
  }

  private determineStatus(
    syntaxOk: boolean,
    disposable: boolean,
    mxRecords: string[],
    smtpResult: SMTPVerificationResult,
  ): "deliverable" | "not_deliverable" | "invalid" | "disposable" | "unknown" {
    // Priority order as specified
    if (!syntaxOk) return "invalid"
    if (disposable) return "disposable"

    if (mxRecords.length === 0) {
      return "not_deliverable"
    }

    if (smtpResult.success) {
      return "deliverable"
    } else if (smtpResult.response && smtpResult.response.code >= 500) {
      return "not_deliverable"
    }

    return "unknown"
  }

  async verifyEmail(email: string): Promise<EmailVerificationResult> {
    const startTime = Date.now()
    const normalizedEmail = email.trim().toLowerCase()

    // Initialize result structure
    const details: VerificationDetails = {
      syntaxOk: false,
      disposable: false,
      mxRecords: [],
      smtpResponse: null,
      timeTakenMs: 0,
    }

    try {
      // Step 1: Syntax validation
      details.syntaxOk = validateEmailSyntax(normalizedEmail)
      if (!details.syntaxOk) {
        details.timeTakenMs = Date.now() - startTime
        return {
          email: normalizedEmail,
          status: "invalid",
          details,
        }
      }

      // Step 2: Extract domain and check if disposable
      const domain = extractDomain(normalizedEmail)
      details.disposable = isDisposableDomain(domain)

      if (details.disposable) {
        details.timeTakenMs = Date.now() - startTime
        return {
          email: normalizedEmail,
          status: "disposable",
          details,
        }
      }

      // Step 3: MX record lookup
      details.mxRecords = await this.resolveMxRecords(domain)

      // Step 4: SMTP verification (if enabled and MX records exist)
      const smtpResult = await this.performSmtpVerification(normalizedEmail, details.mxRecords)

      if (smtpResult.response) {
        details.smtpResponse = smtpResult.response
      }

      if (smtpResult.error) {
        details.error = smtpResult.error
      }

      // Step 5: Determine final status
      const status = this.determineStatus(details.syntaxOk, details.disposable, details.mxRecords, smtpResult)

      details.timeTakenMs = Date.now() - startTime

      return {
        email: normalizedEmail,
        status,
        details,
      }
    } catch (error) {
      details.timeTakenMs = Date.now() - startTime
      details.error = error instanceof Error ? error.message : "Unknown verification error"

      return {
        email: normalizedEmail,
        status: "unknown",
        details,
      }
    }
  }

  async verifyEmails(emails: string[]): Promise<EmailVerificationResult[]> {
    // Use p-limit to control concurrency
    const verificationPromises = emails.map((email) => this.limit(() => this.verifyEmail(email)))

    return Promise.all(verificationPromises)
  }
}
