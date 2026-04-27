import type { VercelRequest, VercelResponse } from "@vercel/node"

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.json({
    ok: true,
    model: process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash",
    configured: Boolean(process.env.OPENROUTER_API_KEY),
    rateLimitConfigured: Boolean(
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
    ),
  })
}
