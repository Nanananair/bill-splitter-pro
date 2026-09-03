import * as React from "react"
import { Copy, Receipt, Share2 } from "lucide-react"
import { toast } from "sonner"
import { useBillStore } from "@/store/useBillStore"
import {
  selectBreakdown,
  selectTotals,
  selectUnassignedItems,
} from "@/store/selectors"
import type { PersonBreakdown } from "@/store/selectors"
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
import { lineLabel } from "@/lib/shareCard"
import { copyPersonText, sharePersonCard } from "@/lib/share"

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
            {people.map((p) => {
              const amt = totals.perPersonMinor[p.id] ?? 0
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="truncate">{p.name}</span>
                  <span className={`font-mono tabular-nums${amt < 0 ? " text-destructive" : ""}`}>
                    {formatMoney(amt, currency)}
                  </span>
                </li>
              )
            })}
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
              {people.map((p) => {
              const amt = totals.perPersonMinor[p.id] ?? 0
              return (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="truncate">{p.name}</span>
                  <span className={`font-mono tabular-nums${amt < 0 ? " text-destructive" : ""}`}>
                    {formatMoney(amt, currency)}
                  </span>
                </li>
              )
            })}
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

function UnassignedNotice() {
  const currency = useBillStore((s) => s.currency)
  const unassigned = useBillStore(selectUnassignedItems)
  if (unassigned.length === 0) return null

  const faceValue = unassigned.reduce((sum, it) => sum + it.unitPriceMinor, 0)
  return (
    <p className="rounded-md bg-amber-500/10 px-2.5 py-2 text-xs text-amber-600 dark:text-amber-400">
      {unassigned.length} {unassigned.length === 1 ? "item is" : "items are"} unassigned
      {" · "}
      {formatMoney(faceValue, currency)} at face value isn&apos;t counted.
    </p>
  )
}

function ShareButtons({ breakdown }: { breakdown: PersonBreakdown }) {
  const currency = useBillStore((s) => s.currency)
  const [busy, setBusy] = React.useState(false)

  const run = async (fn: () => Promise<string>, copiedMessage: string) => {
    setBusy(true)
    try {
      const outcome = await fn()
      if (outcome === "copied") toast.success(copiedMessage)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not share that.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="flex items-center gap-0.5">
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          run(
            () => sharePersonCard(breakdown, currency),
            `Copied ${breakdown.person.name}'s summary to the clipboard.`,
          )
        }
        aria-label={`Share ${breakdown.person.name}'s summary`}
        className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
      >
        <Share2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          run(
            () => copyPersonText(breakdown, currency),
            `Copied ${breakdown.person.name}'s summary to the clipboard.`,
          )
        }
        aria-label={`Copy ${breakdown.person.name}'s summary as text`}
        className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
    </span>
  )
}

function Breakdown() {
  const currency = useBillStore((s) => s.currency)
  const breakdowns = useBillStore(selectBreakdown)

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Breakdown
      </h3>
      <UnassignedNotice />
      {breakdowns.map((b) => {
        if (b.lines.length === 0) return null
        return (
          <div key={b.person.id} className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between gap-2 text-sm font-medium">
              <span className="flex min-w-0 items-center gap-1">
                <span className="truncate">{b.person.name}</span>
                <ShareButtons breakdown={b} />
              </span>
              <span className={`font-mono tabular-nums${b.totalMinor < 0 ? " text-destructive" : ""}`}>
                {formatMoney(b.totalMinor, currency)}
              </span>
            </div>
            <ul className="flex flex-col gap-0.5 pl-2">
              {b.lines.map((line) => (
                <li
                  key={line.itemId}
                  className="flex justify-between gap-2 text-xs text-muted-foreground"
                >
                  <span className="truncate">{lineLabel(line)}</span>
                  <span className={`font-mono tabular-nums${line.shareMinor < 0 ? " text-destructive" : ""}`}>
                    {formatMoney(line.shareMinor, currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
