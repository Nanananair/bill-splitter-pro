export interface ParseReceiptItem {
  name: string
  price: number
}

export interface ParseReceiptResponse {
  items: ParseReceiptItem[]
  currency: string | null
  model: string
}

export async function parseReceipt(image: string): Promise<ParseReceiptResponse> {
  const res = await fetch("/api/parse-receipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image }),
  })
  const data = (await res.json().catch(() => ({}))) as
    | ParseReceiptResponse
    | { error?: string }
  if (!res.ok) {
    const msg = "error" in data && data.error ? data.error : `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data as ParseReceiptResponse
}

export async function fileToResizedDataUrl(
  file: File,
  maxDim = 1600,
  quality = 0.85,
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error ?? new Error("Could not read file"))
    r.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error("Could not decode image"))
    i.src = dataUrl
  })
  const longest = Math.max(img.width, img.height)
  const scale = longest > maxDim ? maxDim / longest : 1
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas 2D context unavailable")
  ctx.drawImage(img, 0, 0, w, h)
  return canvas.toDataURL("image/jpeg", quality)
}
