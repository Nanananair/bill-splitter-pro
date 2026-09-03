import { beforeEach, describe, expect, it } from "vitest"
import { useBillStore } from "@/store/useBillStore"
import {
  selectBreakdown,
  selectTotals,
  selectUnassignedItems,
} from "@/store/selectors"
import type { PersonBreakdown } from "@/store/selectors"
import type { Item } from "@/types"
import { MILLI } from "@/lib/quantity"

const reset = () => {
  useBillStore.setState({
    people: [],
    items: [],
    pendingReceiptItems: [],
    currency: "INR",
  })
}

describe("useBillStore", () => {
  beforeEach(reset)

  it("rejects empty and duplicate people", () => {
    expect(useBillStore.getState().addPerson("").ok).toBe(false)
    expect(useBillStore.getState().addPerson("Alice").ok).toBe(true)
    expect(useBillStore.getState().addPerson("alice").ok).toBe(false)
    expect(useBillStore.getState().people).toHaveLength(1)
  })

  it("seeds quantities for newly added people on existing items", () => {
    const s = useBillStore.getState()
    s.addPerson("Alice")
    s.addItem({ name: "Pizza", unitPriceMinor: 1000, isShared: false })
    s.addItem({ name: "Bread basket", unitPriceMinor: 500, isShared: true })
    s.addPerson("Bob")
    const [pizza, bread] = useBillStore.getState().items as [Item, Item]
    const ids = useBillStore.getState().people.map((p) => p.id)
    // Non-shared items start unassigned so assigning costs one tap per eater,
    // not N taps to remove everyone who didn't have it.
    expect(pizza.quantitiesMilli[ids[0]!]).toBe(0)
    expect(pizza.quantitiesMilli[ids[1]!]).toBe(0)
    // Shared items still default to everyone.
    expect(bread.quantitiesMilli[ids[0]!]).toBe(1)
    expect(bread.quantitiesMilli[ids[1]!]).toBe(1)
  })

  it("setAllQuantitiesMilli assigns or clears everyone in one write", () => {
    const s = useBillStore.getState()
    s.addPerson("Alice")
    s.addPerson("Bob")
    s.addItem({ name: "Chai", unitPriceMinor: 2000, isShared: false })
    const itemId = useBillStore.getState().items[0]!.id
    const ids = useBillStore.getState().people.map((p) => p.id)

    useBillStore.getState().setAllQuantitiesMilli(itemId, MILLI)
    let item = useBillStore.getState().items[0]!
    expect(item.quantitiesMilli[ids[0]!]).toBe(MILLI)
    expect(item.quantitiesMilli[ids[1]!]).toBe(MILLI)
    expect(selectTotals(useBillStore.getState()).grandTotalMinor).toBe(4000)

    useBillStore.getState().setAllQuantitiesMilli(itemId, 0)
    item = useBillStore.getState().items[0]!
    expect(Object.values(item.quantitiesMilli)).toEqual([0, 0])
    expect(selectTotals(useBillStore.getState()).grandTotalMinor).toBe(0)
  })

  it("an unassigned non-shared item contributes nothing", () => {
    const s = useBillStore.getState()
    s.addPerson("Alice")
    s.addPerson("Bob")
    s.addItem({ name: "Fried rice", unitPriceMinor: 45900, isShared: false })
    const totals = selectTotals(useBillStore.getState())
    expect(totals.grandTotalMinor).toBe(0)
    expect(Object.values(totals.perPersonMinor)).toEqual([0, 0])
    expect(selectUnassignedItems(useBillStore.getState())).toHaveLength(1)
  })

  it("a shared item nobody is in allocates nothing to anybody", () => {
    // Regression: all-zero weights made `allocateByQuantity` fall back to an
    // even split, handing out money the (zero) line total didn't cover.
    const s = useBillStore.getState()
    s.addPerson("Alice")
    s.addPerson("Bob")
    s.addItem({ name: "Service", unitPriceMinor: 999, isShared: true })
    const itemId = useBillStore.getState().items[0]!.id
    const ids = useBillStore.getState().people.map((p) => p.id)
    for (const id of ids) useBillStore.getState().toggleShared(itemId, id, false)

    const totals = selectTotals(useBillStore.getState())
    expect(totals.grandTotalMinor).toBe(0)
    expect(Object.values(totals.perPersonMinor)).toEqual([0, 0])
    const sum = Object.values(totals.perPersonMinor).reduce((a, b) => a + b, 0)
    expect(sum).toBe(totals.grandTotalMinor)
  })

  it("selectBreakdown reports quantities alongside each person's share", () => {
    const s = useBillStore.getState()
    s.addPerson("Alice")
    s.addPerson("Bob")
    s.addItem({ name: "Fried rice", unitPriceMinor: 45900, isShared: false })
    s.addItem({ name: "Bread", unitPriceMinor: 10000, isShared: true })
    const riceId = useBillStore.getState().items[0]!.id
    const aliceId = useBillStore.getState().people[0]!.id
    useBillStore.getState().setQuantityMilli(riceId, aliceId, 2 * MILLI)

    const [alice, bob] = selectBreakdown(useBillStore.getState()) as [
      PersonBreakdown,
      PersonBreakdown,
    ]
    expect(alice.lines.map((l) => [l.name, l.qtyMilli, l.shareMinor])).toEqual([
      ["Fried rice", 2 * MILLI, 91800],
      ["Bread", 1, 5000],
    ])
    expect(alice.totalMinor).toBe(96800)
    // Bob had no rice, so it isn't in his breakdown at all.
    expect(bob.lines.map((l) => l.name)).toEqual(["Bread"])
    expect(bob.totalMinor).toBe(5000)
  })

  it("removing a person also strips their quantities from every item", () => {
    const s = useBillStore.getState()
    s.addPerson("Alice")
    s.addPerson("Bob")
    s.addItem({ name: "Pizza", unitPriceMinor: 1000, isShared: false })
    const aliceId = useBillStore.getState().people[0]!.id
    s.removePerson(aliceId)
    const item = useBillStore.getState().items[0]!
    expect(Object.keys(item.quantitiesMilli)).toHaveLength(1)
    expect(aliceId in item.quantitiesMilli).toBe(false)
  })

  it("per-person totals always sum exactly to the grand total", () => {
    const s = useBillStore.getState()
    s.addPerson("A")
    s.addPerson("B")
    s.addPerson("C")
    s.addItem({ name: "Awkward shared", unitPriceMinor: 10001, isShared: true })
    s.addItem({ name: "One each", unitPriceMinor: 333, isShared: false })
    const totals = selectTotals(useBillStore.getState())
    const sumPerPerson = Object.values(totals.perPersonMinor).reduce(
      (a, b) => a + b,
      0,
    )
    expect(sumPerPerson).toBe(totals.grandTotalMinor)
  })

  describe("discount items (negative prices)", () => {
    it("accepts a negative unit price", () => {
      const s = useBillStore.getState()
      s.addPerson("Alice")
      const result = s.addItem({ name: "Coupon", unitPriceMinor: -500, isShared: true })
      expect(result.ok).toBe(true)
      expect(useBillStore.getState().items).toHaveLength(1)
    })

    it("rejects a zero unit price", () => {
      const s = useBillStore.getState()
      s.addPerson("Alice")
      const result = s.addItem({ name: "Free", unitPriceMinor: 0, isShared: false })
      expect(result.ok).toBe(false)
    })

    it("subtracts discount from grand total and per-person totals", () => {
      const s = useBillStore.getState()
      s.addPerson("Alice")
      s.addPerson("Bob")
      s.addItem({ name: "Pizza", unitPriceMinor: 2000, isShared: true })
      s.addItem({ name: "Discount", unitPriceMinor: -400, isShared: true })
      const totals = selectTotals(useBillStore.getState())
      expect(totals.grandTotalMinor).toBe(1600)
      const sum = Object.values(totals.perPersonMinor).reduce((a, b) => a + b, 0)
      expect(sum).toBe(totals.grandTotalMinor)
    })
  })

  it("migrates legacy v1 persisted state to v2 minor units", () => {
    // Simulate what zustand persist would have written under v0/v1.
    const legacy = {
      state: {
        people: ["Alice", "Bob"],
        items: [
          {
            id: "i1",
            name: "Coffee",
            unitPrice: 1.99,
            isShared: false,
            quantities: { Alice: 2, Bob: 1 },
          },
          {
            id: "i2",
            name: "Service",
            unitPrice: 5,
            isShared: true,
            quantities: { Alice: 1, Bob: 0 },
          },
        ],
        currency: "usd",
      },
      version: 1,
    }
    localStorage.setItem("bill-splitter-pro", JSON.stringify(legacy))
    // Force a fresh hydrate — zustand persist hydrates synchronously from
    // localStorage in jsdom on the next getState call after rehydrate.
    useBillStore.persist.rehydrate()
    const s = useBillStore.getState()
    expect(s.currency).toBe("USD")
    expect(s.people).toHaveLength(2)
    const aliceId = s.people[0]!.id
    const bobId = s.people[1]!.id
    const coffee = s.items.find((it) => it.name === "Coffee")!
    expect(coffee.unitPriceMinor).toBe(199)
    expect(coffee.quantitiesMilli[aliceId]).toBe(2000)
    expect(coffee.quantitiesMilli[bobId]).toBe(1000)
    const service = s.items.find((it) => it.name === "Service")!
    expect(service.unitPriceMinor).toBe(500)
    expect(service.quantitiesMilli[aliceId]).toBe(1)
    expect(service.quantitiesMilli[bobId]).toBe(0)
  })
})
