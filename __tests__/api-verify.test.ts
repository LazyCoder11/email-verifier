import { POST } from "@/app/api/verify/route"
import { NextRequest } from "next/server"
import jest from "jest"

// Mock the email verifier
jest.mock("@/lib/email-verifier", () => ({
  EmailVerifier: jest.fn().mockImplementation(() => ({
    verifyEmails: jest.fn(),
  })),
}))

// Mock the rate limiter
jest.mock("@/lib/rate-limiter", () => ({
  rateLimiter: {
    isAllowed: jest.fn(),
    getRemainingRequests: jest.fn(),
    getResetTime: jest.fn(),
  },
}))

import { EmailVerifier } from "@/lib/email-verifier"
import { rateLimiter } from "@/lib/rate-limiter"

const mockEmailVerifier = EmailVerifier as jest.MockedClass<typeof EmailVerifier>
const mockRateLimiter = rateLimiter as jest.Mocked<typeof rateLimiter>

describe("/api/verify", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRateLimiter.isAllowed.mockReturnValue(true)
    mockRateLimiter.getRemainingRequests.mockReturnValue(50)
    mockRateLimiter.getResetTime.mockReturnValue(Date.now() + 3600000)
  })

  const createRequest = (body: any) => {
    return new NextRequest("http://localhost:3000/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  }

  test("should verify valid emails successfully", async () => {
    const mockVerifyEmails = jest.fn().mockResolvedValue([
      {
        email: "test@example.com",
        status: "deliverable",
        details: {
          syntaxOk: true,
          disposable: false,
          mxRecords: ["mx1.example.com"],
          smtpResponse: { code: 250, text: "OK" },
          timeTakenMs: 150,
        },
      },
    ])

    mockEmailVerifier.mockImplementation(() => ({ verifyEmails: mockVerifyEmails }) as any)

    const request = createRequest({ emails: ["test@example.com"] })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results).toHaveLength(1)
    expect(data.results[0].status).toBe("deliverable")
    expect(data.meta.totalEmails).toBe(1)
  })

  test("should handle rate limiting", async () => {
    mockRateLimiter.isAllowed.mockReturnValue(false)
    mockRateLimiter.getResetTime.mockReturnValue(Date.now() + 1800000) // 30 minutes

    const request = createRequest({ emails: ["test@example.com"] })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.error).toBe("Rate limit exceeded")
    expect(data.message).toContain("Try again in")
  })

  test("should reject invalid request body", async () => {
    const request = createRequest({ invalid: "data" })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Invalid request")
    expect(data.message).toBe("emails array is required")
  })

  test("should reject empty email list", async () => {
    const request = createRequest({ emails: [] })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Invalid request")
    expect(data.message).toBe("No valid emails provided")
  })

  test("should reject too many emails", async () => {
    const manyEmails = Array.from({ length: 201 }, (_, i) => `test${i}@example.com`)

    const request = createRequest({ emails: manyEmails })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe("Too many emails")
    expect(data.message).toContain("Maximum 200 emails allowed")
  })

  test("should handle string input parsing", async () => {
    const mockVerifyEmails = jest.fn().mockResolvedValue([
      {
        email: "test1@example.com",
        status: "deliverable",
        details: { syntaxOk: true, disposable: false, mxRecords: [], smtpResponse: null, timeTakenMs: 100 },
      },
      {
        email: "test2@example.com",
        status: "deliverable",
        details: { syntaxOk: true, disposable: false, mxRecords: [], smtpResponse: null, timeTakenMs: 100 },
      },
    ])

    mockEmailVerifier.mockImplementation(() => ({ verifyEmails: mockVerifyEmails }) as any)

    const request = createRequest({ emails: ["test1@example.com, test2@example.com"] })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockVerifyEmails).toHaveBeenCalledWith(["test1@example.com", "test2@example.com"])
  })

  test("should handle verification errors gracefully", async () => {
    const mockVerifyEmails = jest.fn().mockRejectedValue(new Error("Verification failed"))
    mockEmailVerifier.mockImplementation(() => ({ verifyEmails: mockVerifyEmails }) as any)

    const request = createRequest({ emails: ["test@example.com"] })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe("Internal server error")
  })

  test("should include rate limit headers in response", async () => {
    const mockVerifyEmails = jest.fn().mockResolvedValue([])
    mockEmailVerifier.mockImplementation(() => ({ verifyEmails: mockVerifyEmails }) as any)

    mockRateLimiter.getRemainingRequests.mockReturnValue(45)
    mockRateLimiter.getResetTime.mockReturnValue(1234567890)

    const request = createRequest({ emails: ["test@example.com"] })
    const response = await POST(request)

    expect(response.headers.get("X-RateLimit-Remaining")).toBe("45")
    expect(response.headers.get("X-RateLimit-Reset")).toBe("1234567890")
  })
})
