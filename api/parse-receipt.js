import OpenAI from "openai"

const DEFAULT_MODEL = "google/gemini-2.5-flash"

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

export const config = {
  api: {
    bodyParser: { sizeLimit: "5mb" },
  },
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    res.status(405).json({ error: "Method not allowed" })
    return
  }
  if (!process.env.OPENROUTER_API_KEY) {
    res
      .status(500)
      .json({ error: "Server is not configured: OPENROUTER_API_KEY is missing." })
    return
  }

  const body = req.body || {}
  const image = typeof body.image === "string" ? body.image : null
  if (!image || !image.startsWith("data:image/")) {
    res.status(400).json({
      error:
        "Body must be JSON shaped { image: 'data:image/...;base64,...' }.",
    })
    return
  }

  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL
  const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer":
        process.env.PUBLIC_APP_URL || "https://bill-splitter-pro.vercel.app",
      "X-Title": "Bill Splitter Pro",
    },
  })

  let raw
  try {
    const completion = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: USER_PROMPT },
            { type: "image_url", image_url: { url: image } },
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
    res.status(status).json({ error: message })
    return
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    console.error("[parse-receipt] non-JSON response:", String(raw).slice(0, 500))
    res.status(502).json({
      error: "Model returned non-JSON output",
      snippet: typeof raw === "string" ? raw.slice(0, 300) : null,
    })
    return
  }

  const items = Array.isArray(parsed.items)
    ? parsed.items
        .map((it) => ({
          name: typeof it?.name === "string" ? it.name.trim() : "",
          price: Number(it?.price),
        }))
        .filter(
          (it) => it.name.length > 0 && Number.isFinite(it.price) && it.price > 0
        )
    : []

  const currency =
    typeof parsed.currency === "string" && parsed.currency.trim().length > 0
      ? parsed.currency.trim()
      : null

  res.json({ items, currency, model })
}
