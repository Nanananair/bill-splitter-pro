import { describe, expect, it } from "vitest"
import {
  allocateByQuantity,
  formatMoney,
  fromMinor,
  splitEvenly,
  toMinor,
} from "@/lib/money"
import { exponentFor } from "@/lib/currency"

describe("toMinor / fromMinor", () => {
  it("rounds floating-point arithmetic cleanly", () => {
    expect(toMinor(0.1 + 0.2, "USD")).toBe(30)
    expect(fromMinor(199, "USD")).toBeCloseTo(1.99)
  })

  it("respects currency exponents", () => {
    expect(exponentFor("USD")).toBe(2)
    expect(exponentFor("JPY")).toBe(0)
    expect(exponentFor("BHD")).toBe(3)
    expect(toMinor(1234, "JPY")).toBe(1234)
    expect(toMinor(1.234, "BHD")).toBe(1234)
  })
})

describe("formatMoney", () => {
  it("uses Intl currency formatting for known codes", () => {
    expect(formatMoney(199, "USD", "en-US")).toBe("$1.99")
    expect(formatMoney(1234, "JPY", "en-US")).toBe("¥1,234")
  })

  it("falls back gracefully for unknown codes", () => {
    expect(formatMoney(100, "ZZZ", "en-US")).toContain("ZZZ")
  })
})

describe("splitEvenly", () => {
  it("returns an array whose sum exactly equals the total", () => {
    const shares = splitEvenly(10001, 3)
    expect(shares).toEqual([3334, 3334, 3333])
    expect(shares.reduce((a, b) => a + b, 0)).toBe(10001)
  })

  it("handles n = 1 and n <= 0", () => {
    expect(splitEvenly(500, 1)).toEqual([500])
    expect(splitEvenly(500, 0)).toEqual([])
  })

  it("handles negative totals", () => {
    const shares = splitEvenly(-10001, 3)
    expect(shares.reduce((a, b) => a + b, 0)).toBe(-10001)
  })
})

describe("allocateByQuantity", () => {
  it("equals splitEvenly when weights are equal", () => {
    expect(allocateByQuantity(10001, [1, 1, 1])).toEqual(splitEvenly(10001, 3))
  })

  it("allocates proportionally with no drift", () => {
    const shares = allocateByQuantity(10000, [1, 2, 3])
    expect(shares.reduce((a, b) => a + b, 0)).toBe(10000)
    // Largest weight gets the largest share.
    expect(shares[2]).toBeGreaterThanOrEqual(shares[1]!)
    expect(shares[1]).toBeGreaterThanOrEqual(shares[0]!)
  })

  it("falls back to splitEvenly when all weights are zero", () => {
    expect(allocateByQuantity(99, [0, 0, 0])).toEqual(splitEvenly(99, 3))
  })

  it("handles a single non-zero weight", () => {
    expect(allocateByQuantity(123, [0, 1, 0])).toEqual([0, 123, 0])
  })
})
