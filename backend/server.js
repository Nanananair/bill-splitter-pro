import "dotenv/config"
import express from "express"
import cors from "cors"
import multer from "multer"
import OpenAI from "openai"

const PORT = Number(process.env.PORT) || 3001
const DEFAULT_MODEL = "google/gemini-2.5-flash"
const MODEL = process.env.OPENROUTER_MODEL || DEFAULT_MODEL
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN?.trim() || true
const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || "http://localhost:8080"

if (!process.env.OPENROUTER_API_KEY) {
  console.error(
    "[backend] OPENROUTER_API_KEY is not set. Copy .env.example to .env and add your key."
  )
  process.exit(1)
}

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": PUBLIC_APP_URL,
    "X-Title": "Bill Splitter Pro",
  },
})

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true)
    else cb(new Error("Only image uploads are allowed"))
  },
})

const app = express()
app.use(cors({ origin: ALLOWED_ORIGIN }))

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: MODEL })
})

const SYSTEM_PROMPT =
  "You extract line items from receipt photos. Reply ONLY with JSON matching the requested schema. Ignore subtotals and grand totals; include taxes and service charges as separate items so the user can decide how to split them."

const USER_PROMPT = `Extract every individual line item from this receipt.

Return JSON of the shape:
{
  "items": [{ "name": string, "price": number }, ...],
  "currency": string | null
}

Rules:
- "name" is the item description as printed (cleaned up; no quantity prefix).
- "price" is the line total in the receipt's currency, as a positive number (no symbols, no commas).
- If a line shows quantity x unit price, return one entry whose price is the line total.
- Include taxes, service charges, tips as their own items.
- Skip the SUBTOTAL and the GRAND TOTAL.
- "currency" is an ISO 4217 code if you can infer it (e.g. "INR", "USD"), otherwise null.
- Return strictly the JSON object - no prose, no markdown.`

app.post("/api/parse-receipt", (req, res) => {
  upload.single("receipt")(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ error: uploadErr.message })
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded (field name: 'receipt')" })
    }

    const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`

    let raw
    try {
      const completion = await client.chat.completions.create({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: USER_PROMPT },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      })
      raw = completion.choices?.[0]?.message?.content ?? ""
    } catch (err) {
      const status = err?.status || 502
      const message =
        err?.error?.message || err?.message || "Upstream model request failed"
      console.error("[parse-receipt] upstream error:", message)
      return res.status(status).json({ error: message })
    }

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      console.error("[parse-receipt] non-JSON response:", raw?.slice(0, 500))
      return res.status(502).json({
        error: "Model returned non-JSON output",
        snippet: typeof raw === "string" ? raw.slice(0, 300) : null,
      })
    }

    const items = Array.isArray(parsed.items)
      ? parsed.items
          .map((it) => ({
            name: typeof it?.name === "string" ? it.name.trim() : "",
            price: Number(it?.price),
          }))
          .filter((it) => it.name.length > 0 && Number.isFinite(it.price) && it.price > 0)
      : []

    const currency =
      typeof parsed.currency === "string" && parsed.currency.trim().length > 0
        ? parsed.currency.trim()
        : null

    res.json({ items, currency, model: MODEL })
  })
})

app.listen(PORT, () => {
  console.log(`[backend] listening on http://localhost:${PORT} (model: ${MODEL})`)
})
