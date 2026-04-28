import type { VercelRequest, VercelResponse } from "@vercel/node"

function normalizeOrigin(value: string): string {
  try {
    // URL.origin is the canonical "scheme://host[:port]" form — no path,
    // no trailing slash, lower-cased host.
    return new URL(value).origin
  } catch {
    return value.replace(/\/+$/, "")
  }
}

function parseAllowed(): string[] {
  return (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizeOrigin)
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
  const rawOrigin = typeof req.headers.origin === "string" ? req.headers.origin : ""
  const origin = rawOrigin ? normalizeOrigin(rawOrigin) : ""
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
    // Echo back the raw origin so the browser's CORS check sees an exact match.
    res.setHeader("Access-Control-Allow-Origin", rawOrigin)
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
