import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type {
  CurrencyCode,
  Item,
  ItemId,
  PendingReceiptItem,
  Person,
  PersonId,
} from "@/types"
import { toMinor } from "@/lib/money"

const DEFAULT_CURRENCY: CurrencyCode = "INR"

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export interface BillState {
  people: Person[]
  items: Item[]
  currency: CurrencyCode
  pendingReceiptItems: PendingReceiptItem[]

  // Actions
  addPerson: (name: string) => { ok: boolean; error?: string }
  removePerson: (id: PersonId) => void
  renamePerson: (id: PersonId, name: string) => void

  addItem: (input: { name: string; unitPriceMinor: number; isShared: boolean }) =>
    { ok: boolean; error?: string }
  removeItem: (id: ItemId) => void
  setQuantityMilli: (itemId: ItemId, personId: PersonId, milli: number) => void
  toggleShared: (itemId: ItemId, personId: PersonId, included: boolean) => void

  setCurrency: (code: CurrencyCode) => void

  // Receipt scan flow
  setPendingReceiptItems: (items: PendingReceiptItem[]) => void
  updatePendingReceiptItem: (
    index: number,
    patch: Partial<PendingReceiptItem>,
  ) => void
  removePendingReceiptItem: (index: number) => void
  confirmPendingReceiptItems: () => { added: number }
  clearPendingReceiptItems: () => void

  clearAll: () => void
}

const initialQuantitiesFor = (people: Person[], isShared: boolean) =>
  Object.fromEntries(
    people.map((p) => [p.id, isShared ? 1 : 1_000]),
  ) as Record<PersonId, number>

export const useBillStore = create<BillState>()(
  persist(
    (set, get) => ({
      people: [],
      items: [],
      currency: DEFAULT_CURRENCY,
      pendingReceiptItems: [],

      addPerson: (rawName) => {
        const name = rawName.trim()
        if (!name) return { ok: false, error: "Name cannot be empty." }
        const exists = get().people.some(
          (p) => p.name.toLowerCase() === name.toLowerCase(),
        )
        if (exists) return { ok: false, error: `${name} is already on the bill.` }
        const newPerson: Person = { id: uid(), name }
        set((s) => ({
          people: [...s.people, newPerson],
          items: s.items.map((it) => ({
            ...it,
            quantitiesMilli: {
              ...it.quantitiesMilli,
              [newPerson.id]: it.isShared ? 1 : 1_000,
            },
          })),
        }))
        return { ok: true }
      },

      removePerson: (id) =>
        set((s) => ({
          people: s.people.filter((p) => p.id !== id),
          items: s.items.map((it) => {
            const next = { ...it.quantitiesMilli }
            delete next[id]
            return { ...it, quantitiesMilli: next }
          }),
        })),

      renamePerson: (id, name) =>
        set((s) => ({
          people: s.people.map((p) =>
            p.id === id ? { ...p, name: name.trim() || p.name } : p,
          ),
        })),

      addItem: ({ name, unitPriceMinor, isShared }) => {
        const trimmed = name.trim()
        if (!trimmed) return { ok: false, error: "Item name cannot be empty." }
        if (!Number.isFinite(unitPriceMinor) || unitPriceMinor <= 0) {
          return { ok: false, error: "Price must be greater than zero." }
        }
        const item: Item = {
          id: uid(),
          name: trimmed,
          unitPriceMinor,
          isShared,
          quantitiesMilli: initialQuantitiesFor(get().people, isShared),
        }
        set((s) => ({ items: [...s.items, item] }))
        return { ok: true }
      },

      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((it) => it.id !== id) })),

      setQuantityMilli: (itemId, personId, milli) =>
        set((s) => ({
          items: s.items.map((it) =>
            it.id === itemId
              ? {
                  ...it,
                  quantitiesMilli: {
                    ...it.quantitiesMilli,
                    [personId]: Math.max(0, Math.round(milli)),
                  },
                }
              : it,
          ),
        })),

      toggleShared: (itemId, personId, included) =>
        set((s) => ({
          items: s.items.map((it) =>
            it.id === itemId
              ? {
                  ...it,
                  quantitiesMilli: {
                    ...it.quantitiesMilli,
                    [personId]: included ? 1 : 0,
                  },
                }
              : it,
          ),
        })),

      setCurrency: (code) =>
        set(() => ({ currency: code.toUpperCase() })),

      setPendingReceiptItems: (items) =>
        set(() => ({ pendingReceiptItems: items })),

      updatePendingReceiptItem: (index, patch) =>
        set((s) => ({
          pendingReceiptItems: s.pendingReceiptItems.map((p, i) =>
            i === index ? { ...p, ...patch } : p,
          ),
        })),

      removePendingReceiptItem: (index) =>
        set((s) => ({
          pendingReceiptItems: s.pendingReceiptItems.filter((_, i) => i !== index),
        })),

      confirmPendingReceiptItems: () => {
        const { pendingReceiptItems, people } = get()
        let added = 0
        const newItems: Item[] = []
        for (const p of pendingReceiptItems) {
          const name = p.name.trim()
          if (!name || !Number.isFinite(p.priceMinor) || p.priceMinor <= 0) continue
          newItems.push({
            id: uid(),
            name,
            unitPriceMinor: p.priceMinor,
            isShared: p.isShared,
            quantitiesMilli: initialQuantitiesFor(people, p.isShared),
          })
          added++
        }
        set((s) => ({
          items: [...s.items, ...newItems],
          pendingReceiptItems: [],
        }))
        return { added }
      },

      clearPendingReceiptItems: () =>
        set(() => ({ pendingReceiptItems: [] })),

      clearAll: () =>
        set(() => ({
          people: [],
          items: [],
          pendingReceiptItems: [],
        })),
    }),
    {
      name: "bill-splitter-pro",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        people: s.people,
        items: s.items,
        currency: s.currency,
      }),
      // Old (v0/v1) persisted state used floating-point rupees and decimal qty.
      // Bring it forward to integer minor units + milli-fixed-point quantities.
      migrate: (persisted: unknown, fromVersion: number) => {
        if (fromVersion >= 2 || !persisted || typeof persisted !== "object") {
          return persisted as Partial<BillState>
        }
        const legacy = persisted as {
          people?: Array<{ id?: string; name?: string } | string>
          items?: Array<{
            id?: string
            name?: string
            unitPrice?: number
            isShared?: boolean
            quantities?: Record<string, number>
          }>
          currency?: string
        }
        const currency = (legacy.currency ?? DEFAULT_CURRENCY).toUpperCase()
        const peopleRaw = legacy.people ?? []
        // v0/v1 may have stored people as plain strings; rebuild them with ids.
        const people: Person[] = peopleRaw.map((p) =>
          typeof p === "string"
            ? { id: uid(), name: p }
            : { id: p.id ?? uid(), name: p.name ?? "" },
        )
        const nameToId = new Map(people.map((p) => [p.name, p.id]))
        const items: Item[] = (legacy.items ?? []).map((it) => {
          const isShared = !!it.isShared
          const quantitiesMilli: Record<PersonId, number> = {}
          for (const [key, qty] of Object.entries(it.quantities ?? {})) {
            // Legacy keys were the person's name; map to the new id when possible.
            const id = nameToId.get(key) ?? key
            quantitiesMilli[id] = isShared
              ? qty > 0 ? 1 : 0
              : Math.max(0, Math.round((qty ?? 0) * 1000))
          }
          return {
            id: it.id ?? uid(),
            name: it.name ?? "",
            unitPriceMinor: toMinor(it.unitPrice ?? 0, currency),
            isShared,
            quantitiesMilli,
          }
        })
        return { people, items, currency }
      },
    },
  ),
)
