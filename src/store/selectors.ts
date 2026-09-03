import type { BillState } from "./useBillStore"
import type { Item, Person, PersonId } from "@/types"
import { allocateByQuantity } from "@/lib/money"

export interface ItemAllocation {
  itemId: string
  perPersonMinor: Record<PersonId, number>
  lineTotalMinor: number
}

export interface BillTotals {
  perPersonMinor: Record<PersonId, number>
  grandTotalMinor: number
  perItem: ItemAllocation[]
}

function allocateForItem(
  item: Item,
  peopleIds: PersonId[],
): ItemAllocation {
  const perPerson: Record<PersonId, number> = {}
  if (item.isShared) {
    // Line total = unit price; split among included people via largest-remainder.
    const includedIdx: number[] = []
    for (let i = 0; i < peopleIds.length; i++) {
      const id = peopleIds[i]!
      if ((item.quantitiesMilli[id] ?? 0) > 0) includedIdx.push(i)
    }
    if (includedIdx.length === 0) {
      // Nobody is in. `allocateByQuantity` would fall back to an even split on
      // all-zero weights, handing out money the line total (0) doesn't cover.
      for (const id of peopleIds) perPerson[id] = 0
      return { itemId: item.id, perPersonMinor: perPerson, lineTotalMinor: 0 }
    }
    const allocations = allocateByQuantity(
      item.unitPriceMinor,
      peopleIds.map((_, i) => (includedIdx.includes(i) ? 1 : 0)),
    )
    for (let i = 0; i < peopleIds.length; i++) {
      perPerson[peopleIds[i]!] = allocations[i] ?? 0
    }
    return {
      itemId: item.id,
      perPersonMinor: perPerson,
      lineTotalMinor: item.unitPriceMinor,
    }
  }

  // Non-shared: each person owes (quantity * unitPrice). Sum all quantities, then
  // allocate the resulting integer line total back proportionally so per-person
  // shares always sum exactly to the line total (avoids floating-point drift).
  const weights = peopleIds.map((id) => item.quantitiesMilli[id] ?? 0)
  const totalQtyMilli = weights.reduce((a, b) => a + b, 0)
  // (unitPriceMinor * totalQtyMilli) / 1000 -> round half to even to integer minor.
  const lineTotal = Math.round((item.unitPriceMinor * totalQtyMilli) / 1000)
  const allocations = allocateByQuantity(lineTotal, weights)
  for (let i = 0; i < peopleIds.length; i++) {
    perPerson[peopleIds[i]!] = allocations[i] ?? 0
  }
  return { itemId: item.id, perPersonMinor: perPerson, lineTotalMinor: lineTotal }
}

export function selectTotals(state: BillState): BillTotals {
  const peopleIds = state.people.map((p) => p.id)
  const perPersonMinor: Record<PersonId, number> = Object.fromEntries(
    peopleIds.map((id) => [id, 0]),
  )
  const perItem: ItemAllocation[] = []
  let grandTotalMinor = 0
  for (const item of state.items) {
    const alloc = allocateForItem(item, peopleIds)
    perItem.push(alloc)
    grandTotalMinor += alloc.lineTotalMinor
    for (const id of peopleIds) {
      perPersonMinor[id] = (perPersonMinor[id] ?? 0) + (alloc.perPersonMinor[id] ?? 0)
    }
  }
  return { perPersonMinor, grandTotalMinor, perItem }
}

export interface PersonLine {
  itemId: string
  name: string
  qtyMilli: number
  isShared: boolean
  isDiscount: boolean
  shareMinor: number
}

export interface PersonBreakdown {
  person: Person
  lines: PersonLine[]
  totalMinor: number
}

/**
 * Per-person "what you had and what you owe", derived from `selectTotals`.
 * Shared by the on-screen breakdown and the shareable summary card so the two
 * can never disagree.
 */
export function selectBreakdown(state: BillState): PersonBreakdown[] {
  const totals = selectTotals(state)
  const allocById = new Map(totals.perItem.map((a) => [a.itemId, a]))
  return state.people.map((person) => {
    const lines: PersonLine[] = []
    for (const item of state.items) {
      const shareMinor = allocById.get(item.id)?.perPersonMinor[person.id] ?? 0
      if (shareMinor === 0) continue
      lines.push({
        itemId: item.id,
        name: item.name,
        qtyMilli: item.quantitiesMilli[person.id] ?? 0,
        isShared: item.isShared,
        isDiscount: item.unitPriceMinor < 0,
        shareMinor,
      })
    }
    return {
      person,
      lines,
      totalMinor: totals.perPersonMinor[person.id] ?? 0,
    }
  })
}

/**
 * Non-shared items nobody has been assigned to. They contribute nothing to the
 * grand total, so the UI has to surface them or money quietly goes missing.
 */
export function selectUnassignedItems(state: BillState) {
  return state.items.filter(
    (it) =>
      !it.isShared &&
      state.people.reduce((sum, p) => sum + (it.quantitiesMilli[p.id] ?? 0), 0) === 0,
  )
}
