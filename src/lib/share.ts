import type { PersonBreakdown } from "@/store/selectors"
import { formatMoney } from "@/lib/money"
import { lineLabel, renderPersonCard } from "@/lib/shareCard"

export type ShareOutcome = "shared-image" | "shared-text" | "copied" | "cancelled"

/** Plain-text version — the fallback, and the "Copy text" action. */
export function buildPersonText(b: PersonBreakdown, currency: string): string {
  const head = `${b.person.name} — ${formatMoney(b.totalMinor, currency)}`
  const body = b.lines.map(
    (l) => `${lineLabel(l)}: ${formatMoney(l.shareMinor, currency)}`,
  )
  const foot = `Total: ${formatMoney(b.totalMinor, currency)}`
  return [head, "", ...body, "", foot].join("\n")
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "share"
}

function isAbort(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError"
}

async function copyText(text: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return
    }
  } catch {
    // Fall through to the legacy path below.
  }
  // Non-secure contexts and older browsers have no async clipboard.
  const ta = document.createElement("textarea")
  ta.value = text
  ta.setAttribute("readonly", "")
  ta.style.position = "fixed"
  ta.style.opacity = "0"
  document.body.appendChild(ta)
  ta.select()
  try {
    if (!document.execCommand("copy")) throw new Error("Copy was blocked.")
  } finally {
    document.body.removeChild(ta)
  }
}

export async function copyPersonText(
  b: PersonBreakdown,
  currency: string,
): Promise<ShareOutcome> {
  await copyText(buildPersonText(b, currency))
  return "copied"
}

/**
 * Open the OS share sheet with the person's summary as an image, so it can be
 * sent to WhatsApp in one step. Degrades: image -> text share -> clipboard,
 * so no browser is left without a way to hand someone their share.
 */
export async function sharePersonCard(
  b: PersonBreakdown,
  currency: string,
): Promise<ShareOutcome> {
  const text = buildPersonText(b, currency)
  const title = `${b.person.name} — ${formatMoney(b.totalMinor, currency)}`

  let file: File | undefined
  try {
    const blob = await renderPersonCard(b, currency)
    file = new File([blob], `${slugify(b.person.name)}-share.png`, {
      type: "image/png",
    })
  } catch {
    // Rendering failed — still worth sharing the text below.
  }

  // Sharing files needs a secure context, a user gesture, and platform support.
  if (file && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text })
      return "shared-image"
    } catch (err) {
      if (isAbort(err)) return "cancelled"
      // Some platforms advertise file sharing then refuse it; keep degrading.
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({ title, text })
      return "shared-text"
    } catch (err) {
      if (isAbort(err)) return "cancelled"
    }
  }

  await copyText(text)
  return "copied"
}
