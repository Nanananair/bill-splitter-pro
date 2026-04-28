export type CurrencyCode = string // ISO 4217, e.g. "INR"
export type PersonId = string
export type ItemId = string

export interface Person {
  id: PersonId
  name: string
}

/**
 * `unitPriceMinor` is an integer in the bill's currency minor units (e.g. paise, cents).
 * `quantitiesMilli[personId]` is:
 *   - for shared items: 1 = included, 0 = excluded
 *   - for non-shared items: the quantity multiplied by 1000 (3-decimal fixed point)
 */
export interface Item {
  id: ItemId
  name: string
  unitPriceMinor: number
  isShared: boolean
  quantitiesMilli: Record<PersonId, number>
}

export interface PendingReceiptItem {
  name: string
  priceMinor: number
  isShared: boolean
}

export type Theme = "light" | "dark"
