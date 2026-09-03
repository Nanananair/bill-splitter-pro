import { beforeEach, describe, expect, it } from "vitest"
import { useBillStore } from "@/store/useBillStore"
import { selectBreakdown } from "@/store/selectors"
import type { PersonBreakdown } from "@/store/selectors"
import { buildPersonText } from "@/lib/share"
import { lineLabel } from "@/lib/shareCard"
import { MILLI } from "@/lib/quantity"

const reset = () =>
  useBillStore.setState({ people: [], items: [], pendingReceiptItems: [], currency: "INR" })

/** Builds the bill from the screenshot in miniature. */
function seed() {
  const s = useBillStore.getState()
  s.addPerson("Ayush")
  s.addPerson("Ganesh")
  s.addItem({ name: "Mixed Fried Rice", unitPriceMinor: 45900, isShared: false })
  s.addItem({ name: "Paneer Tikka", unitPriceMinor: 40000, isShared: true })
  s.addItem({ name: "Coupon", unitPriceMinor: -10000, isShared: true })

  const [rice] = useBillStore.getState().items
  const ayush = useBillStore.getState().people[0]!.id
  useBillStore.getState().setQuantityMilli(rice!.id, ayush, 2 * MILLI)
}

describe("lineLabel", () => {
  it("prefixes a quantity only when it is not exactly one", () => {
    const base = { itemId: "i", name: "Rice", isShared: false, isDiscount: false, shareMinor: 100 }
    expect(lineLabel({ ...base, qtyMilli: MILLI })).toBe("Rice")
    expect(lineLabel({ ...base, qtyMilli: 2 * MILLI })).toBe("2 × Rice")
    expect(lineLabel({ ...base, qtyMilli: 500 })).toBe("0.5 × Rice")
  })

  it("tags shared and discount lines, never with a quantity", () => {
    expect(
      lineLabel({
        itemId: "i", name: "Bread", qtyMilli: 1,
        isShared: true, isDiscount: false, shareMinor: 100,
      }),
    ).toBe("Bread (shared)")
    expect(
      lineLabel({
        itemId: "i", name: "Coupon", qtyMilli: 1,
        isShared: true, isDiscount: true, shareMinor: -100,
      }),
    ).toBe("Coupon (shared)")
  })
})

describe("buildPersonText", () => {
  beforeEach(reset)

  it("renders an itemised, WhatsApp-ready summary", () => {
    seed()
    const [ayush, ganesh] = selectBreakdown(useBillStore.getState()) as [
      PersonBreakdown,
      PersonBreakdown,
    ]

    expect(buildPersonText(ayush, "INR")).toBe(
      [
        "Ayush — ₹1,068.00",
        "",
        "2 × Mixed Fried Rice: ₹918.00",
        "Paneer Tikka (shared): ₹200.00",
        "Coupon (shared): -₹50.00",
        "",
        "Total: ₹1,068.00",
      ].join("\n"),
    )

    // Ganesh had no rice, so it never appears in his message.
    expect(buildPersonText(ganesh, "INR")).not.toContain("Fried Rice")
    expect(buildPersonText(ganesh, "INR")).toContain("Total: ₹150.00")
  })

  it("stays coherent for someone who owes nothing", () => {
    const s = useBillStore.getState()
    s.addPerson("Ayush")
    s.addItem({ name: "Rice", unitPriceMinor: 45900, isShared: false })
    const [ayush] = selectBreakdown(useBillStore.getState()) as [PersonBreakdown]
    expect(ayush.lines).toHaveLength(0)
    expect(buildPersonText(ayush, "INR")).toBe("Ayush — ₹0.00\n\n\nTotal: ₹0.00")
  })
})
