import { Receipt } from "lucide-react"
import { useBillStore } from "@/store/useBillStore"
import { selectTotals } from "@/store/selectors"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { formatMoney } from "@/lib/money"

interface SummarySheetProps {
  variant?: "stickyMobile" | "panelDesktop"
}

export function SummarySheet({ variant = "stickyMobile" }: SummarySheetProps) {
  const people = useBillStore((s) => s.people)
  const items = useBillStore((s) => s.items)
  const currency = useBillStore((s) => s.currency)
  const totals = useBillStore(selectTotals)

  const grand = formatMoney(totals.grandTotalMinor, currency)

  if (variant === "panelDesktop") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-end justify-between">
          <h2 className="text-sm font-semibold">Summary</h2>
          <span className="font-mono text-lg font-semibold tabular-nums">{grand}</span>
        </div>
        <Separator />
        {people.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing to total yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {people.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="truncate">{p.name}</span>
                <span className="font-mono tabular-nums">
                  {formatMoney(totals.perPersonMinor[p.id] ?? 0, currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {items.length > 0 ? (
          <>
            <Separator />
            <Breakdown />
          </>
        ) : null}
      </div>
    )
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t bg-background px-4 py-3 shadow-lg lg:hidden"
        >
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            <Receipt className="h-4 w-4" />
            Totals
          </span>
          <span className="font-mono text-base font-semibold tabular-nums">{grand}</span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-auto">
        <SheetHeader>
          <SheetTitle>Bill summary</SheetTitle>
          <SheetDescription>{grand} across {people.length || 0} {people.length === 1 ? "person" : "people"}</SheetDescription>
        </SheetHeader>
        <div className="mt-3 flex flex-col gap-3">
          {people.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing to total yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {people.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="truncate">{p.name}</span>
                  <span className="font-mono tabular-nums">
                    {formatMoney(totals.perPersonMinor[p.id] ?? 0, currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {items.length > 0 ? (
            <>
              <Separator />
              <Breakdown />
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Breakdown() {
  const people = useBillStore((s) => s.people)
  const items = useBillStore((s) => s.items)
  const currency = useBillStore((s) => s.currency)
  const totals = useBillStore(selectTotals)

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Breakdown
      </h3>
      {people.map((p) => {
        const lines = items.flatMap((it) => {
          const alloc = totals.perItem.find((a) => a.itemId === it.id)
          const share = alloc?.perPersonMinor[p.id] ?? 0
          if (share <= 0) return []
          return [
            <li
              key={`${p.id}-${it.id}`}
              className="flex justify-between gap-2 text-xs text-muted-foreground"
            >
              <span className="truncate">
                {it.name}
                {it.isShared ? " (shared)" : null}
              </span>
              <span className="font-mono tabular-nums">
                {formatMoney(share, currency)}
              </span>
            </li>,
          ]
        })
        if (lines.length === 0) return null
        return (
          <div key={p.id} className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between gap-2 text-sm font-medium">
              <span>{p.name}</span>
              <span className="font-mono tabular-nums">
                {formatMoney(totals.perPersonMinor[p.id] ?? 0, currency)}
              </span>
            </div>
            <ul className="flex flex-col gap-0.5 pl-2">{lines}</ul>
          </div>
        )
      })}
    </div>
  )
}
