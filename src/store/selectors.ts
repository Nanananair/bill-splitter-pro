import type { BillState } from "./useBillStore"
import type { Item, PersonId } from "@/types"
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
      lineTotalMinor: item.unitPriceMinor * (includedIdx.length > 0 ? 1 : 0),
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
