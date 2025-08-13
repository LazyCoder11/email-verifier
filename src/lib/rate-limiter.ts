interface RateLimitEntry {
  count: number
  resetTime: number
}

// Export the class as a named export for testing
export class InMemoryRateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private windowMs: number
  private maxRequests: number

  constructor(windowMs: number = 60 * 60 * 1000, maxRequests = 60) {
    this.windowMs = windowMs
    this.maxRequests = maxRequests

    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key)
      }
    }
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const entry = this.store.get(identifier)

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.store.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      })
      return true
    }

    if (entry.count >= this.maxRequests) {
      return false
    }

    entry.count++
    return true
  }

  getRemainingRequests(identifier: string): number {
    const entry = this.store.get(identifier)
    if (!entry || Date.now() > entry.resetTime) {
      return this.maxRequests
    }
    return Math.max(0, this.maxRequests - entry.count)
  }

  getResetTime(identifier: string): number {
    const entry = this.store.get(identifier)
    if (!entry || Date.now() > entry.resetTime) {
      return Date.now() + this.windowMs
    }
    return entry.resetTime
  }

  getUsageStats(identifier: string): { used: number; limit: number; resetTime: number } {
    const entry = this.store.get(identifier)
    const now = Date.now()

    if (!entry || now > entry.resetTime) {
      return {
        used: 0,
        limit: this.maxRequests,
        resetTime: now + this.windowMs,
      }
    }

    return {
      used: entry.count,
      limit: this.maxRequests,
      resetTime: entry.resetTime,
    }
  }
}

// Global rate limiter instance
export const rateLimiter = new InMemoryRateLimiter(
  Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || "3600000"), // 1 hour default
  Number.parseInt(process.env.RATE_LIMIT_PER_HOUR || "60"),
)
