import { InMemoryRateLimiter } from "@/lib/rate-limiter"

// Create a test-specific rate limiter class to avoid module mocking issues
class TestRateLimiter extends InMemoryRateLimiter {
  constructor(windowMs = 1000, maxRequests = 3) {
    super(windowMs, maxRequests)
  }

  // Expose cleanup for testing
  public testCleanup() {
    this.cleanup()
  }
}

describe("InMemoryRateLimiter", () => {
  let rateLimiter: TestRateLimiter

  beforeEach(() => {
    rateLimiter = new TestRateLimiter(1000, 3) // 3 requests per second for testing
  })

  test("should allow requests within limit", () => {
    expect(rateLimiter.isAllowed("user1")).toBe(true)
    expect(rateLimiter.isAllowed("user1")).toBe(true)
    expect(rateLimiter.isAllowed("user1")).toBe(true)
  })

  test("should block requests over limit", () => {
    // Use up the limit
    rateLimiter.isAllowed("user1")
    rateLimiter.isAllowed("user1")
    rateLimiter.isAllowed("user1")

    // This should be blocked
    expect(rateLimiter.isAllowed("user1")).toBe(false)
  })

  test("should track different users separately", () => {
    // Use up limit for user1
    rateLimiter.isAllowed("user1")
    rateLimiter.isAllowed("user1")
    rateLimiter.isAllowed("user1")

    // user2 should still be allowed
    expect(rateLimiter.isAllowed("user2")).toBe(true)
    expect(rateLimiter.isAllowed("user1")).toBe(false)
  })

  test("should return correct remaining requests", () => {
    expect(rateLimiter.getRemainingRequests("user1")).toBe(3)

    rateLimiter.isAllowed("user1")
    expect(rateLimiter.getRemainingRequests("user1")).toBe(2)

    rateLimiter.isAllowed("user1")
    expect(rateLimiter.getRemainingRequests("user1")).toBe(1)

    rateLimiter.isAllowed("user1")
    expect(rateLimiter.getRemainingRequests("user1")).toBe(0)
  })

  test("should return usage stats", () => {
    rateLimiter.isAllowed("user1")
    rateLimiter.isAllowed("user1")

    const stats = rateLimiter.getUsageStats("user1")
    expect(stats.used).toBe(2)
    expect(stats.limit).toBe(3)
    expect(stats.resetTime).toBeGreaterThan(Date.now())
  })

  test("should reset after window expires", async () => {
    const shortLimiter = new TestRateLimiter(50, 2) // 50ms window

    // Use up the limit
    expect(shortLimiter.isAllowed("user1")).toBe(true)
    expect(shortLimiter.isAllowed("user1")).toBe(true)
    expect(shortLimiter.isAllowed("user1")).toBe(false)

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 60))

    // Should be allowed again
    expect(shortLimiter.isAllowed("user1")).toBe(true)
  })
})
