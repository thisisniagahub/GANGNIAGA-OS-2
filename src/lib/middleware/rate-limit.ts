// ============================================
// IN-MEMORY RATE LIMITER
// ============================================
// Uses a Map to track request counts per identifier+endpoint.
// Entries are automatically cleaned up when they expire.
// Note: This is per-process — in a multi-instance deployment,
// you would want Redis or similar shared state.

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitConfig {
  windowMs: number      // time window in milliseconds
  maxRequests: number   // max requests per window
}

const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Rate limit configuration per endpoint category.
 * Falls back to 'default' if the endpoint is not listed.
 */
const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  chat: { windowMs: 60_000, maxRequests: 20 },       // 20 chat messages per minute
  agents: { windowMs: 60_000, maxRequests: 10 },      // 10 agent tasks per minute
  reports: { windowMs: 300_000, maxRequests: 5 },     // 5 reports per 5 minutes
  forecasts: { windowMs: 60_000, maxRequests: 10 },   // 10 forecasts per minute
  plans: { windowMs: 60_000, maxRequests: 15 },       // 15 plan operations per minute
  exports: { windowMs: 60_000, maxRequests: 10 },     // 10 exports per minute
  workflows: { windowMs: 60_000, maxRequests: 15 },   // 15 workflow operations per minute
  settings: { windowMs: 60_000, maxRequests: 30 },    // 30 settings changes per minute
  auth: { windowMs: 60_000, maxRequests: 10 },        // 10 auth attempts per minute
  default: { windowMs: 60_000, maxRequests: 60 },     // 60 requests per minute default
}

// Cleanup interval — remove expired entries every 2 minutes
const CLEANUP_INTERVAL_MS = 120_000
let lastCleanupAt = 0

/**
 * Clean up expired entries from the rate limit store.
 * Runs automatically but no more than once every 2 minutes.
 */
function cleanupExpiredEntries(): void {
  const now = Date.now()
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) {
    return
  }
  lastCleanupAt = now

  const entriesToDelete: string[] = []
  rateLimitStore.forEach((entry, key) => {
    if (now >= entry.resetAt) {
      entriesToDelete.push(key)
    }
  })
  for (const key of entriesToDelete) {
    rateLimitStore.delete(key)
  }
}

/**
 * Get the rate limit config for a given endpoint.
 * Falls back to default if the endpoint is not configured.
 */
function getRateLimitConfig(endpoint: string): RateLimitConfig {
  return DEFAULT_LIMITS[endpoint] || DEFAULT_LIMITS['default']!
}

/**
 * Check if a request is allowed under the rate limit.
 *
 * @param identifier - Unique identifier (e.g. userId or IP address)
 * @param endpoint - Endpoint category (e.g. 'chat', 'agents', 'reports')
 * @returns Object with allowed status, remaining requests, and reset timestamp
 */
export function checkRateLimit(
  identifier: string,
  endpoint: string
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanupExpiredEntries()

  const config = getRateLimitConfig(endpoint)
  const key = `${identifier}:${endpoint}`
  const now = Date.now()

  const entry = rateLimitStore.get(key)

  if (!entry || now >= entry.resetAt) {
    // No existing entry or window has expired — start fresh
    const resetAt = now + config.windowMs
    rateLimitStore.set(key, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt,
    }
  }

  // Window is still active
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  // Increment count
  entry.count += 1
  rateLimitStore.set(key, entry)

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

/**
 * Generate standard rate limit HTTP headers for the response.
 * These follow the IETF draft standard for rate limit headers.
 *
 * @param identifier - Unique identifier (e.g. userId or IP address)
 * @param endpoint - Endpoint category
 * @returns Object with header names as keys and values as strings
 */
export function getRateLimitHeaders(
  identifier: string,
  endpoint: string
): Record<string, string> {
  const config = getRateLimitConfig(endpoint)
  const result = checkRateLimit(identifier, endpoint)

  return {
    'X-RateLimit-Limit': String(config.maxRequests),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)), // Unix timestamp in seconds
    'X-RateLimit-Window': String(config.windowMs / 1000) + 's',
  }
}

/**
 * Update the rate limit configuration for a specific endpoint.
 * Useful for dynamic rate limit adjustments.
 */
export function setRateLimitConfig(endpoint: string, config: RateLimitConfig): void {
  DEFAULT_LIMITS[endpoint] = config
}

/**
 * Reset rate limit for a specific identifier+endpoint.
 * Useful for admin overrides or after successful auth.
 */
export function resetRateLimit(identifier: string, endpoint: string): void {
  const key = `${identifier}:${endpoint}`
  rateLimitStore.delete(key)
}

/**
 * Get current rate limit store stats (for monitoring/admin).
 */
export function getRateLimitStats(): { totalEntries: number; endpoints: Record<string, number> } {
  const endpoints: Record<string, number> = {}
  let totalEntries = 0

  rateLimitStore.forEach((entry, key) => {
    if (Date.now() < entry.resetAt) {
      totalEntries++
      const endpoint = key.split(':').slice(1).join(':')
      endpoints[endpoint] = (endpoints[endpoint] || 0) + 1
    }
  })

  return { totalEntries, endpoints }
}
