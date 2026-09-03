import { useBillStore } from "@/store/useBillStore"
import { MILLI } from "@/lib/quantity"
import type { Item } from "@/types"

/** True when a non-shared item has no quantity against anyone. */
export function isUnassigned(item: Item, peopleIds: string[]): boolean {
  if (item.isShared) return false
  return peopleIds.reduce((sum, id) => sum + (item.quantitiesMilli[id] ?? 0), 0) === 0
}

export function UnassignedBadge() {
  return (
    <span className="rounded-sm bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
      Unassigned
    </span>
  )
}

/**
 * "Everyone" / "Clear" for one item — the escape hatch for the all-at-once
 * cases, so neither default costs a tap per person.
 */
export function BulkAssign({ item }: { item: Item }) {
  const setAllQuantitiesMilli = useBillStore((s) => s.setAllQuantitiesMilli)
  const allOn = item.isShared ? 1 : MILLI

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setAllQuantitiesMilli(item.id, allOn)}
        aria-label={`Assign ${item.name} to everyone`}
        className="rounded-sm px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        Everyone
      </button>
      <span className="text-xs text-muted-foreground/40">·</span>
      <button
        type="button"
        onClick={() => setAllQuantitiesMilli(item.id, 0)}
        aria-label={`Clear everyone from ${item.name}`}
        className="rounded-sm px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        Clear
      </button>
    </div>
  )
}
