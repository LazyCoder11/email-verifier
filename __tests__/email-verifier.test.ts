import { EmailVerifier } from "@/lib/email-verifier"
import jest from "jest"
import { promises as dns } from "dns"
import { SMTPClient } from "@/lib/smtp-client"

// Mock the DNS module
jest.mock("dns", () => ({
  promises: {
    resolveMx: jest.fn(),
    resolve4: jest.fn(),
  },
}))

// Mock the SMTP client
jest.mock("@/lib/smtp-client", () => ({
  SMTPClient: jest.fn().mockImplementation(() => ({
    verifyEmail: jest.fn(),
  })),
}))

const mockResolveMx = dns.resolveMx as jest.MockedFunction<typeof dns.resolveMx>
const mockResolve4 = dns.resolve4 as jest.MockedFunction<typeof dns.resolve4>
const mockSMTPClient = SMTPClient as jest.MockedClass<typeof SMTPClient>

describe("EmailVerifier", () => {
  let verifier: EmailVerifier

  beforeEach(() => {
    verifier = new EmailVerifier({
      smtpTimeout: 1000,
      maxConcurrent: 2,
      fromEmail: "test@example.com",
      allowSmtpVerification: true,
    })
    jest.clearAllMocks()
  })

  describe("Single Email Verification", () => {
    test("should mark invalid syntax emails as invalid", async () => {
      const result = await verifier.verifyEmail("invalid-email")

      expect(result.status).toBe("invalid")
      expect(result.details.syntaxOk).toBe(false)
      expect(result.details.timeTakenMs).toBeGreaterThan(0)
    })

    test("should mark disposable emails as disposable", async () => {
      const result = await verifier.verifyEmail("test@mailinator.com")

      expect(result.status).toBe("disposable")
      expect(result.details.syntaxOk).toBe(true)
      expect(result.details.disposable).toBe(true)
    })

    test("should handle emails with no MX records", async () => {
      mockResolveMx.mockRejectedValue(new Error("No MX records"))
      mockResolve4.mockRejectedValue(new Error("No A records"))

      const result = await verifier.verifyEmail("test@nonexistent-domain.com")

      expect(result.status).toBe("not_deliverable")
      expect(result.details.mxRecords).toEqual([])
    })

    test("should handle successful MX lookup", async () => {
      mockResolveMx.mockResolvedValue([
        { exchange: "mx1.example.com", priority: 10 },
        { exchange: "mx2.example.com", priority: 20 },
      ])

      const mockVerifyEmail = jest.fn().mockResolvedValue({
        success: true,
        response: { code: 250, text: "OK" },
      })
      mockSMTPClient.mockImplementation(() => ({ verifyEmail: mockVerifyEmail }) as any)

      const result = await verifier.verifyEmail("test@example.com")

      expect(result.details.mxRecords).toEqual(["mx1.example.com", "mx2.example.com"])
      expect(mockVerifyEmail).toHaveBeenCalledWith("test@example.com", "mx1.example.com")
    })

    test("should handle SMTP verification success", async () => {
      mockResolveMx.mockResolvedValue([{ exchange: "mx1.example.com", priority: 10 }])

      const mockVerifyEmail = jest.fn().mockResolvedValue({
        success: true,
        response: { code: 250, text: "OK" },
      })
      mockSMTPClient.mockImplementation(() => ({ verifyEmail: mockVerifyEmail }) as any)

      const result = await verifier.verifyEmail("test@example.com")

      expect(result.status).toBe("deliverable")
      expect(result.details.smtpResponse).toEqual({ code: 250, text: "OK" })
    })

    test("should handle SMTP verification failure", async () => {
      mockResolveMx.mockResolvedValue([{ exchange: "mx1.example.com", priority: 10 }])

      const mockVerifyEmail = jest.fn().mockResolvedValue({
        success: false,
        response: { code: 550, text: "Mailbox not found" },
      })
      mockSMTPClient.mockImplementation(() => ({ verifyEmail: mockVerifyEmail }) as any)

      const result = await verifier.verifyEmail("test@example.com")

      expect(result.status).toBe("not_deliverable")
      expect(result.details.smtpResponse).toEqual({ code: 550, text: "Mailbox not found" })
    })

    test("should handle SMTP timeout as unknown", async () => {
      mockResolveMx.mockResolvedValue([{ exchange: "mx1.example.com", priority: 10 }])

      const mockVerifyEmail = jest.fn().mockResolvedValue({
        success: false,
        error: "Connection timeout",
      })
      mockSMTPClient.mockImplementation(() => ({ verifyEmail: mockVerifyEmail }) as any)

      const result = await verifier.verifyEmail("test@example.com")

      expect(result.status).toBe("unknown")
      expect(result.details.error).toBe("Connection timeout")
    })
  })

  describe("Bulk Email Verification", () => {
    test("should verify multiple emails concurrently", async () => {
      const emails = ["test1@example.com", "test2@example.com", "invalid-email"]

      mockResolveMx.mockResolvedValue([{ exchange: "mx1.example.com", priority: 10 }])
      const mockVerifyEmail = jest.fn().mockResolvedValue({
        success: true,
        response: { code: 250, text: "OK" },
      })
      mockSMTPClient.mockImplementation(() => ({ verifyEmail: mockVerifyEmail }) as any)

      const results = await verifier.verifyEmails(emails)

      expect(results).toHaveLength(3)
      expect(results[0].status).toBe("deliverable")
      expect(results[1].status).toBe("deliverable")
      expect(results[2].status).toBe("invalid")
    })

    test("should handle mixed results correctly", async () => {
      const emails = ["valid@example.com", "test@mailinator.com", "invalid-email"]

      mockResolveMx.mockResolvedValue([{ exchange: "mx1.example.com", priority: 10 }])
      const mockVerifyEmail = jest.fn().mockResolvedValue({
        success: true,
        response: { code: 250, text: "OK" },
      })
      mockSMTPClient.mockImplementation(() => ({ verifyEmail: mockVerifyEmail }) as any)

      const results = await verifier.verifyEmails(emails)

      expect(results[0].status).toBe("deliverable")
      expect(results[1].status).toBe("disposable")
      expect(results[2].status).toBe("invalid")
    })
  })

  describe("Configuration Options", () => {
    test("should respect SMTP verification disabled", async () => {
      const verifierNoSMTP = new EmailVerifier({
        allowSmtpVerification: false,
      })

      mockResolveMx.mockResolvedValue([{ exchange: "mx1.example.com", priority: 10 }])

      const result = await verifierNoSMTP.verifyEmail("test@example.com")

      expect(result.details.smtpResponse).toBeNull()
      expect(result.status).toBe("unknown")
    })
  })
})
