import type { VercelRequest, VercelResponse } from "@vercel/node"

function parseAllowed(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Returns true if the request passes the origin check; the handler should continue.
 * Returns false if the response was already terminated (403 or 204 preflight); the
 * handler must `return` immediately.
 *
 * Allows missing-Origin (same-origin / curl) only when:
 *   - NODE_ENV !== "production", OR
 *   - the env explicitly opts in via ALLOWED_ORIGINS containing "*"
 */
export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  const allowed = parseAllowed()
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : ""
  const matches = origin && (allowed.includes(origin) || allowed.includes("*"))
  const allowMissing =
    !origin && (process.env.NODE_ENV !== "production" || allowed.includes("*"))

  if (origin && !matches) {
    res.status(403).json({ error: "Origin not allowed." })
    return false
  }
  if (!origin && !allowMissing) {
    // Production same-origin POSTs from same host send no Origin header; we
    // still want to allow them. Vercel sets `x-forwarded-host` to the request
    // host, so cross-check.
    const host = (req.headers["x-forwarded-host"] ?? req.headers.host ?? "") as string
    const sameHostAllowed = allowed.some((a) => {
      try {
        return new URL(a).host === host
      } catch {
        return false
      }
    })
    if (!sameHostAllowed) {
      res.status(403).json({ error: "Origin not allowed." })
      return false
    }
  }

  if (matches) {
    res.setHeader("Access-Control-Allow-Origin", origin)
    res.setHeader("Vary", "Origin")
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  }

  if (req.method === "OPTIONS") {
    res.status(204).end()
    return false
  }
  return true
}
