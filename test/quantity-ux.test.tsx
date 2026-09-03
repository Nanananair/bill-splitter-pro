import { beforeEach, describe, expect, it } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { BillCardsMobile } from "@/components/BillCardsMobile"
import { useBillStore } from "@/store/useBillStore"
import { selectTotals } from "@/store/selectors"
import { MILLI } from "@/lib/quantity"

const reset = () =>
  useBillStore.setState({ people: [], items: [], pendingReceiptItems: [], currency: "INR" })

const qtyOf = (personIdx: number) =>
  useBillStore.getState().items[0]!.quantitiesMilli[
    useBillStore.getState().people[personIdx]!.id
  ]

function seed() {
  const s = useBillStore.getState()
  s.addPerson("Ayush")
  s.addPerson("Ganesh")
  s.addPerson("Saloni")
  s.addItem({ name: "Mixed Fried Rice", unitPriceMinor: 45900, isShared: false })
}

describe("assigning a non-shared item", () => {
  beforeEach(() => {
    reset()
    seed()
  })

  it("starts everyone at zero and flags the item as unassigned", () => {
    render(<BillCardsMobile />)
    expect(screen.getByText("Unassigned")).toBeInTheDocument()
    expect([qtyOf(0), qtyOf(1), qtyOf(2)]).toEqual([0, 0, 0])
  })

  it("assigns one person in a single tap on their name", () => {
    render(<BillCardsMobile />)

    fireEvent.click(screen.getByRole("button", { name: "Ayush had Mixed Fried Rice" }))

    expect(qtyOf(0)).toBe(MILLI)
    expect([qtyOf(1), qtyOf(2)]).toEqual([0, 0])
    expect(screen.queryByText("Unassigned")).not.toBeInTheDocument()
    // The whole line lands on the one person who had it.
    const totals = selectTotals(useBillStore.getState())
    expect(totals.grandTotalMinor).toBe(45900)
    expect(totals.perPersonMinor[useBillStore.getState().people[0]!.id]).toBe(45900)
  })

  it("unassigns in a single tap too, instead of four steps down", () => {
    render(<BillCardsMobile />)
    const name = screen.getByRole("button", { name: "Ayush had Mixed Fried Rice" })

    fireEvent.click(name)
    fireEvent.click(name)

    expect(qtyOf(0)).toBe(0)
    expect(selectTotals(useBillStore.getState()).grandTotalMinor).toBe(0)
  })

  it("steps by a whole unit, not 0.25", () => {
    render(<BillCardsMobile />)

    fireEvent.click(screen.getByRole("button", { name: "Increase Ayush quantity of Mixed Fried Rice" }))
    expect(qtyOf(0)).toBe(MILLI)
    fireEvent.click(screen.getByRole("button", { name: "Increase Ayush quantity of Mixed Fried Rice" }))
    expect(qtyOf(0)).toBe(2 * MILLI)
    fireEvent.click(screen.getByRole("button", { name: "Decrease Ayush quantity of Mixed Fried Rice" }))
    expect(qtyOf(0)).toBe(MILLI)
  })

  it("never steps below zero", () => {
    render(<BillCardsMobile />)
    expect(screen.getByRole("button", { name: "Decrease Ayush quantity of Mixed Fried Rice" })).toBeDisabled()
    expect(qtyOf(0)).toBe(0)
  })

  it("assigns or clears the whole table at once", () => {
    render(<BillCardsMobile />)

    fireEvent.click(screen.getByRole("button", { name: "Assign Mixed Fried Rice to everyone" }))
    expect([qtyOf(0), qtyOf(1), qtyOf(2)]).toEqual([MILLI, MILLI, MILLI])
    expect(selectTotals(useBillStore.getState()).grandTotalMinor).toBe(3 * 45900)

    fireEvent.click(screen.getByRole("button", { name: "Clear everyone from Mixed Fried Rice" }))
    expect([qtyOf(0), qtyOf(1), qtyOf(2)]).toEqual([0, 0, 0])
  })
})
