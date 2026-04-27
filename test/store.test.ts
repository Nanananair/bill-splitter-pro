import { beforeEach, describe, expect, it } from "vitest"
import { useBillStore } from "@/store/useBillStore"
import { selectTotals } from "@/store/selectors"

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
    s.addPerson("Bob")
    const item = useBillStore.getState().items[0]!
    const ids = useBillStore.getState().people.map((p) => p.id)
    expect(item.quantitiesMilli[ids[0]!]).toBe(1000)
    expect(item.quantitiesMilli[ids[1]!]).toBe(1000)
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
