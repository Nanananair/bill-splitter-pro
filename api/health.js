const DEFAULT_MODEL = "google/gemini-2.5-flash"

export default function handler(_req, res) {
  res.json({
    ok: true,
    model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
    configured: !!process.env.OPENROUTER_API_KEY,
  })
}
