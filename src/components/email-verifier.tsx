/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useCallback } from "react"
import { Card } from "./ui/card"
import { EmailInput } from "./email-input"
import { CsvUploader } from "./csv-uploader"
import { ResultsTable } from "./results-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Alert, AlertDescription } from "./ui/alert"
import { AlertTriangle, Zap } from "lucide-react"
import DarkVeil from "../../components/backgrounds/DarkVeil/DarkVeil"

export interface VerificationResult {
  email: string
  status: "deliverable" | "not_deliverable" | "invalid" | "disposable" | "unknown"
  details: {
    syntaxOk: boolean
    disposable: boolean
    mxRecords: string[]
    smtpResponse: { code: number; text: string } | null
    timeTakenMs: number
    error?: string
  }
}

interface RateLimitInfo {
  isLimited: boolean
  resetTime?: number
  remaining?: number
  message?: string
}

export function EmailVerifier() {
  const [emails, setEmails] = useState<string[]>([])
  const [results, setResults] = useState<VerificationResult[]>([])
  const [isVerifying, setIsVerifying] = useState(false)
  const [progress, setProgress] = useState({ processed: 0, total: 0 })
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo>({ isLimited: false })
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null)

  const handleEmailsChange = (newEmails: string[]) => {
    setEmails(newEmails)
    setResults([])
    setProgress({ processed: 0, total: 0 })
    setVerificationError(null)
    setRateLimitInfo({ isLimited: false })
  }

  const handleVerify = useCallback(async () => {
    if (emails.length === 0) return

    setIsVerifying(true)
    setProgress({ processed: 0, total: emails.length })
    setResults([])
    setVerificationError(null)
    setRateLimitInfo({ isLimited: false })

    const startTime = Date.now()

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      })

      // Handle rate limiting
      if (response.status === 429) {
        const errorData = await response.json()
        const resetTime = errorData.resetTime
        const resetDate = new Date(resetTime)
        const minutesUntilReset = Math.ceil((resetTime - Date.now()) / 1000 / 60)

        setRateLimitInfo({
          isLimited: true,
          resetTime,
          message: `Rate limit exceeded. You can try again in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? "s" : ""
            } (at ${resetDate.toLocaleTimeString()}).`,
        })
        setVerificationError(errorData.message || "Rate limit exceeded")
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      // Extract rate limit info from headers
      const remaining = response.headers.get("X-RateLimit-Remaining")
      const resetTime = response.headers.get("X-RateLimit-Reset")

      if (remaining && resetTime) {
        setRateLimitInfo({
          isLimited: false,
          remaining: Number.parseInt(remaining),
          resetTime: Number.parseInt(resetTime),
        })
      }

      const data = await response.json()

      // Simulate real-time progress updates for better UX
      if (data.results && data.results.length > 0) {
        const totalResults = data.results.length
        const batchSize = Math.max(1, Math.floor(totalResults / 10)) // Update in 10% increments

        for (let i = 0; i < totalResults; i += batchSize) {
          const batch = data.results.slice(i, Math.min(i + batchSize, totalResults))

          setResults((prev) => [...prev, ...batch])
          setProgress({ processed: Math.min(i + batchSize, totalResults), total: totalResults })

          // Calculate estimated time remaining
          const elapsed = Date.now() - startTime
          const avgTimePerEmail = elapsed / Math.min(i + batchSize, totalResults)
          const remaining = totalResults - Math.min(i + batchSize, totalResults)
          setEstimatedTimeRemaining(remaining > 0 ? Math.ceil((remaining * avgTimePerEmail) / 1000) : null)

          // Add a small delay to show progress animation
          if (i + batchSize < totalResults) {
            await new Promise((resolve) => setTimeout(resolve, 100))
          }
        }
      }

      setEstimatedTimeRemaining(null)
    } catch (error) {
      console.error("Verification failed:", error)
      setVerificationError(error instanceof Error ? error.message : "An unexpected error occurred")
    } finally {
      setIsVerifying(false)
      setEstimatedTimeRemaining(null)
    }
  }, [emails])

  const handleClear = () => {
    setEmails([])
    setResults([])
    setProgress({ processed: 0, total: 0 })
    setVerificationError(null)
    setRateLimitInfo({ isLimited: false })
    setEstimatedTimeRemaining(null)
  }

  // Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <div className="space-y-6 grid grid-cols-2 gap-10 relative">
      <Card className="p-6 shadow-lg h-full border-none bg-white backdrop-blur-xl">
        <div className="border-l-4 border-green-500 pl-4 mb-6">
          <h2 className="text-xl font-semibold">Input Emails</h2>
          <p className="text-sm text-gray-600">Add emails to verify using any of the methods below</p>
        </div>

        {/* Rate Limit Warning */}
        {/* {rateLimitInfo.isLimited && (
          <Alert className="mb-4 border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">{rateLimitInfo.message}</AlertDescription>
          </Alert>
        )} */}

        {/* Rate Limit Info */}
        {/* {!rateLimitInfo.isLimited && rateLimitInfo.remaining !== undefined && (
          <Alert className="mb-4 border-blue-200 bg-blue-50">
            <Zap className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              {rateLimitInfo.remaining} verification requests remaining this hour.
              {rateLimitInfo.resetTime && (
                <span className="ml-1">Resets at {new Date(rateLimitInfo.resetTime).toLocaleTimeString()}.</span>
              )}
            </AlertDescription>
          </Alert>
        )} */}

        {/* Verification Error */}
        {verificationError && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{verificationError}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="paste" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="paste">Paste Emails</TabsTrigger>
            <TabsTrigger value="upload">Upload CSV</TabsTrigger>
          </TabsList>

          <TabsContent value="paste" className="mt-4">
            <EmailInput
              emails={emails}
              onEmailsChange={handleEmailsChange}
              onVerify={handleVerify}
              onClear={handleClear}
              isVerifying={isVerifying}
            />
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <CsvUploader
              onEmailsLoaded={handleEmailsChange}
              onVerify={handleVerify}
              onClear={handleClear}
              isVerifying={isVerifying}
              emailCount={emails.length}
            />
          </TabsContent>
        </Tabs>
      </Card>

      {results.length === 0 && !isVerifying ? (
        <Card className="p-6 shadow-lg h-full border-none bg-white backdrop-blur-xl flex justify-center text-center text-gray-500">
          Results will appear here
        </Card>
      ) : (
        <ResultsTable
          results={results}
          isVerifying={isVerifying}
          progress={progress}
          estimatedTimeRemaining={estimatedTimeRemaining}
        />
      )}

    </div>
  )
}
