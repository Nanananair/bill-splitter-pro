import type { VercelRequest } from "@vercel/node"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

let cached: Ratelimit | null | undefined

function getLimiter(): Ratelimit | null {
  if (cached !== undefined) return cached
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    console.warn(
      "[ratelimit] UPSTASH_REDIS_REST_URL/TOKEN not set — limiter disabled (fail-open).",
    )
    cached = null
    return cached
  }
  const redis = new Redis({ url, token })
  cached = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 h"),
    analytics: false,
    prefix: "bsp",
  })
  return cached
}

export function clientIp(req: VercelRequest): string {
  const xff = req.headers["x-forwarded-for"]
  if (typeof xff === "string" && xff.length > 0) {
    const first = xff.split(",")[0]
    if (first) return first.trim()
  }
  if (Array.isArray(xff) && xff.length > 0) {
    const v = xff[0]
    if (typeof v === "string") return v.split(",")[0]?.trim() ?? "anon"
  }
  const real = req.headers["x-real-ip"]
  if (typeof real === "string" && real.length > 0) return real
  return "anon"
}

export interface RateLimitResult {
  ok: boolean
  remaining: number
  reset: number // ms epoch
  retryAfterSec: number
}

export async function rateLimit(
  ip: string,
  key = "parse-receipt",
): Promise<RateLimitResult> {
  const limiter = getLimiter()
  if (!limiter) {
    return { ok: true, remaining: -1, reset: 0, retryAfterSec: 0 }
  }
  const result = await limiter.limit(`${key}:${ip}`)
  const retryAfterSec = result.success
    ? 0
    : Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))
  return {
    ok: result.success,
    remaining: result.remaining,
    reset: result.reset,
    retryAfterSec,
  }
}
