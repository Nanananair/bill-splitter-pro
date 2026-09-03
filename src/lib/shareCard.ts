import type { PersonBreakdown } from "@/store/selectors"
import { formatMoney } from "@/lib/money"
import { MILLI, formatQty } from "@/lib/quantity"

/**
 * Renders a person's share as a PNG so it can go straight into a chat.
 * Drawn with the canvas 2D API rather than a DOM-rasterising dependency:
 * a receipt card is text and hairlines, and this keeps fonts predictable.
 *
 * Always dark, regardless of the sender's theme, so a shared card looks the
 * same in everyone's chat. Colours mirror the `.dark` palette in index.css.
 */
const C = {
  page: "#0a0a0b",
  card: "#111113",
  border: "#2b2b30",
  text: "#fafafa",
  muted: "#9d9daa",
  destructive: "#d33f3f",
}

const W = 1000 // CSS px; rendered at SCALE for a crisp image
const SCALE = 2
const PAD = 56
const ROW_H = 46
const FONT = `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
const MONO = `ui-monospace, SFMono-Regular, Menlo, monospace`

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
    return
  }
  // Older Safari / jsdom.
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Trim to `maxWidth`, appending an ellipsis when it doesn't fit. */
function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let lo = 0
  let hi = text.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (ctx.measureText(text.slice(0, mid) + "…").width <= maxWidth) lo = mid
    else hi = mid - 1
  }
  return text.slice(0, lo) + "…"
}

/** "2 × Mixed Fried Rice", or just the name when the quantity adds nothing. */
export function lineLabel(line: PersonBreakdown["lines"][number]): string {
  const suffix = line.isShared ? " (shared)" : line.isDiscount ? " (discount)" : ""
  if (line.isShared || line.qtyMilli === MILLI || line.qtyMilli === 0) {
    return `${line.name}${suffix}`
  }
  return `${formatQty(line.qtyMilli)} × ${line.name}${suffix}`
}

export function renderPersonCard(
  breakdown: PersonBreakdown,
  currency: string,
): Promise<Blob> {
  const { person, lines, totalMinor } = breakdown

  const headerH = 210
  const footerH = 132
  const H = headerH + Math.max(lines.length, 1) * ROW_H + footerH

  const canvas = document.createElement("canvas")
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext("2d")
  if (!ctx) return Promise.reject(new Error("Canvas is unavailable in this browser."))
  ctx.scale(SCALE, SCALE)
  ctx.textBaseline = "alphabetic"

  // Backdrop + card
  ctx.fillStyle = C.page
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = C.card
  roundRect(ctx, 16, 16, W - 32, H - 32, 28)
  ctx.fill()
  ctx.strokeStyle = C.border
  ctx.lineWidth = 2
  ctx.stroke()

  const left = PAD
  const right = W - PAD

  // Eyebrow
  ctx.fillStyle = C.muted
  ctx.font = `600 22px ${FONT}`
  ctx.textAlign = "left"
  ctx.fillText("BILL SPLITTER PRO", left, 78)

  // Name + amount owed
  ctx.fillStyle = C.text
  ctx.font = `700 46px ${FONT}`
  ctx.fillText(ellipsize(ctx, person.name, right - left), left, 140)

  ctx.font = `700 52px ${MONO}`
  ctx.fillStyle = totalMinor < 0 ? C.destructive : C.text
  ctx.textAlign = "right"
  ctx.fillText(formatMoney(totalMinor, currency), right, 140)

  // Hairline under the header
  ctx.strokeStyle = C.border
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(left, headerH - 34)
  ctx.lineTo(right, headerH - 34)
  ctx.stroke()

  // Item rows
  let y = headerH + 8
  if (lines.length === 0) {
    ctx.textAlign = "left"
    ctx.fillStyle = C.muted
    ctx.font = `26px ${FONT}`
    ctx.fillText("Nothing assigned yet.", left, y)
    y += ROW_H
  }
  for (const line of lines) {
    ctx.font = `600 26px ${MONO}`
    const amount = formatMoney(line.shareMinor, currency)
    const amountW = ctx.measureText(amount).width

    ctx.textAlign = "left"
    ctx.fillStyle = C.text
    ctx.font = `26px ${FONT}`
    ctx.fillText(ellipsize(ctx, lineLabel(line), right - left - amountW - 32), left, y)

    ctx.textAlign = "right"
    ctx.fillStyle = line.shareMinor < 0 ? C.destructive : C.muted
    ctx.font = `600 26px ${MONO}`
    ctx.fillText(amount, right, y)
    y += ROW_H
  }

  // Total
  y += 6
  ctx.strokeStyle = C.border
  ctx.beginPath()
  ctx.moveTo(left, y)
  ctx.lineTo(right, y)
  ctx.stroke()
  y += 48

  ctx.textAlign = "left"
  ctx.fillStyle = C.text
  ctx.font = `700 30px ${FONT}`
  ctx.fillText("Total", left, y)

  ctx.textAlign = "right"
  ctx.fillStyle = totalMinor < 0 ? C.destructive : C.text
  ctx.font = `700 32px ${MONO}`
  ctx.fillText(formatMoney(totalMinor, currency), right, y)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Could not render the summary image.")),
      "image/png",
    )
  })
}
