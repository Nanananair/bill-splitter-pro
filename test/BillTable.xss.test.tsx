import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { BillTableDesktop } from "@/components/BillTableDesktop"
import { BillCardsMobile } from "@/components/BillCardsMobile"
import { useBillStore } from "@/store/useBillStore"

const NASTY_NAME = '<img src=x onerror=alert(1)>'
const NASTY_ITEM = "x'); alert(1); //"

const seed = () => {
  useBillStore.setState({
    people: [
      { id: "p1", name: NASTY_NAME },
      { id: "p2", name: "Bob" },
    ],
    items: [
      {
        id: "i1",
        name: NASTY_ITEM,
        unitPriceMinor: 500,
        isShared: false,
        quantitiesMilli: { p1: 1000, p2: 1000 },
      },
    ],
    currency: "USD",
    pendingReceiptItems: [],
  })
}

describe("XSS regression — bill views never execute injected payloads", () => {
  beforeEach(() => {
    seed()
    vi.spyOn(window, "alert").mockImplementation(() => {
      throw new Error("alert was fired")
    })
  })

  it("desktop table renders names as inert text", () => {
    const { container } = render(<BillTableDesktop />)
    expect(container.querySelectorAll("img").length).toBe(0)
    expect(container.querySelectorAll("script").length).toBe(0)
    // Literal payload must appear as visible text, not as a parsed tag.
    expect(screen.getAllByText(NASTY_NAME).length).toBeGreaterThan(0)
    expect(screen.getAllByText(NASTY_ITEM).length).toBeGreaterThan(0)
    expect(window.alert).not.toHaveBeenCalled()
  })

  it("mobile cards render names as inert text", () => {
    const { container } = render(<BillCardsMobile />)
    expect(container.querySelectorAll("img").length).toBe(0)
    expect(container.querySelectorAll("script").length).toBe(0)
    expect(screen.getAllByText(NASTY_NAME).length).toBeGreaterThan(0)
    expect(screen.getAllByText(NASTY_ITEM).length).toBeGreaterThan(0)
    expect(window.alert).not.toHaveBeenCalled()
  })
})
