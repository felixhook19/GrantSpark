// Rate limiting for the cost-sensitive /api/match endpoint.
//
// Two layers, both keyed by Supabase user.id:
//   - burst:  sliding window of N requests per 60s   (default 5)
//   - daily:  fixed window of N requests per 24h     (default 25)
//
// Backed by Upstash Redis (free tier sufficient). If the Upstash env vars
// are not configured we FAIL OPEN with a loud console warning — this keeps
// local dev and preview deploys working, but production MUST have Upstash
// configured or the /api/match endpoint is unprotected from runaway cost.
//
// Tunables (all optional, all read at module load):
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
//   RATE_LIMIT_DAILY_MAX       (default 25)
//   RATE_LIMIT_BURST_PER_MIN   (default 5)

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const DAILY_MAX = Number(process.env.RATE_LIMIT_DAILY_MAX || '25')
const BURST_PER_MIN = Number(process.env.RATE_LIMIT_BURST_PER_MIN || '5')

let burstLimiter: Ratelimit | null = null
let dailyLimiter: Ratelimit | null = null
let warnedMissing = false

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

function getLimiters(): { burst: Ratelimit; daily: Ratelimit } | null {
  if (burstLimiter && dailyLimiter) {
    return { burst: burstLimiter, daily: dailyLimiter }
  }
  const redis = getRedis()
  if (!redis) return null

  burstLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(BURST_PER_MIN, '60 s'),
    prefix: 'gs:rl:burst',
    analytics: false,
  })
  dailyLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(DAILY_MAX, '1 d'),
    prefix: 'gs:rl:daily',
    analytics: false,
  })

  return { burst: burstLimiter, daily: dailyLimiter }
}

export type RateLimitAllowed = {
  allowed: true
  burstRemaining: number | null
  dailyRemaining: number | null
}

export type RateLimitDenied = {
  allowed: false
  limitType: 'burst' | 'daily'
  retryAfterSeconds: number
  message: string
}

export type RateLimitResult = RateLimitAllowed | RateLimitDenied

function formatRetry(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`
  if (seconds < 3600) {
    const m = Math.max(1, Math.round(seconds / 60))
    return `${m} minute${m === 1 ? '' : 's'}`
  }
  const h = Math.max(1, Math.round(seconds / 3600))
  return `${h} hour${h === 1 ? '' : 's'}`
}

export async function tryRateLimit(userId: string): Promise<RateLimitResult> {
  const limiters = getLimiters()

  // No Upstash configured — fail open with a loud one-time warning.
  if (!limiters) {
    if (!warnedMissing) {
      console.warn(
        '[ratelimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set ' +
          '— /api/match is UNPROTECTED. Configure Upstash in Vercel env vars to enable.'
      )
      warnedMissing = true
    }
    return { allowed: true, burstRemaining: null, dailyRemaining: null }
  }

  // Daily quota first — once a user has burned through, every further
  // request should fail fast without touching the burst window.
  let daily
  try {
    daily = await limiters.daily.limit(userId)
  } catch (err) {
    console.error('[ratelimit] daily limiter error, failing open:', err)
    return { allowed: true, burstRemaining: null, dailyRemaining: null }
  }

  if (!daily.success) {
    const retry = Math.max(1, Math.ceil((daily.reset - Date.now()) / 1000))
    return {
      allowed: false,
      limitType: 'daily',
      retryAfterSeconds: retry,
      message: `You've used your daily match quota (${DAILY_MAX} runs). Try again in ${formatRetry(retry)}.`,
    }
  }

  let burst
  try {
    burst = await limiters.burst.limit(userId)
  } catch (err) {
    console.error('[ratelimit] burst limiter error, failing open:', err)
    return { allowed: true, burstRemaining: null, dailyRemaining: daily.remaining }
  }

  if (!burst.success) {
    const retry = Math.max(1, Math.ceil((burst.reset - Date.now()) / 1000))
    return {
      allowed: false,
      limitType: 'burst',
      retryAfterSeconds: retry,
      message: `You're matching too quickly. Try again in ${retry} second${retry === 1 ? '' : 's'}.`,
    }
  }

  return {
    allowed: true,
    burstRemaining: burst.remaining,
    dailyRemaining: daily.remaining,
  }
}

export const rateLimitConfig = {
  dailyMax: DAILY_MAX,
  burstPerMin: BURST_PER_MIN,
}
