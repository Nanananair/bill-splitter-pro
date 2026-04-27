import { exponentFor } from "./currency"

const SAFE_MAJOR = Number.MAX_SAFE_INTEGER / 1_000_000

export function toMinor(amount: number, currency: string): number {
  if (!Number.isFinite(amount)) return 0
  const clamped = Math.max(-SAFE_MAJOR, Math.min(SAFE_MAJOR, amount))
  const factor = 10 ** exponentFor(currency)
  // Round half-away-from-zero (banker's rounding via Math.round flips for negatives;
  // for currency this is acceptable and matches user expectation).
  return Math.round(clamped * factor)
}

export function fromMinor(minor: number, currency: string): number {
  const factor = 10 ** exponentFor(currency)
  return minor / factor
}

export function formatMoney(
  minor: number,
  currency: string,
  locale: string = typeof navigator !== "undefined" ? navigator.language : "en-US",
): string {
  const code = currency.toUpperCase()
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
    }).format(fromMinor(minor, code))
  } catch {
    // Unknown currency code → render as a plain number with a code suffix.
    return `${fromMinor(minor, code).toFixed(exponentFor(code))} ${code}`
  }
}

/**
 * Split `totalMinor` into `n` shares whose sum equals `totalMinor` exactly.
 * Uses the largest-remainder method: the first `remainder` shares get one extra
 * minor unit. Result length is `n` (returns [] if n <= 0).
 */
export function splitEvenly(totalMinor: number, n: number): number[] {
  if (n <= 0) return []
  const sign = totalMinor < 0 ? -1 : 1
  const abs = Math.abs(totalMinor)
  const base = Math.floor(abs / n)
  const remainder = abs - base * n
  const out = new Array<number>(n)
  for (let i = 0; i < n; i++) out[i] = sign * (base + (i < remainder ? 1 : 0))
  return out
}

/**
 * Allocate `totalMinor` across recipients in proportion to integer `weights`,
 * such that the sum of the result is exactly `totalMinor`.
 * Uses Hamilton/largest-remainder: each recipient gets `floor(total*w/sumW)`
 * minor units, and the leftover units are handed out one at a time to the
 * recipients with the largest fractional remainders (ties broken by index).
 * If all weights are zero, falls back to splitEvenly.
 */
export function allocateByQuantity(totalMinor: number, weights: number[]): number[] {
  const n = weights.length
  if (n === 0) return []
  let sum = 0
  for (const w of weights) sum += Math.max(0, w)
  if (sum === 0) return splitEvenly(totalMinor, n)

  const sign = totalMinor < 0 ? -1 : 1
  const abs = Math.abs(totalMinor)

  const base = new Array<number>(n)
  const remainders: { idx: number; rem: number }[] = []
  let allocated = 0
  for (let i = 0; i < n; i++) {
    const w = Math.max(0, weights[i] ?? 0)
    const exact = (abs * w) / sum
    const floor = Math.floor(exact)
    base[i] = floor
    allocated += floor
    remainders.push({ idx: i, rem: exact - floor })
  }
  let leftover = abs - allocated
  remainders.sort((a, b) => (b.rem - a.rem) || (a.idx - b.idx))
  for (let k = 0; k < remainders.length && leftover > 0; k++) {
    base[remainders[k]!.idx]! += 1
    leftover--
  }
  return base.map((v) => sign * v)
}
