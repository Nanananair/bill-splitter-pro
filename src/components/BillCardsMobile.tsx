import { X, Minus, Plus } from "lucide-react"
import { useBillStore } from "@/store/useBillStore"
import { selectTotals } from "@/store/selectors"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { BulkAssign, UnassignedBadge, isUnassigned } from "@/components/ItemControls"
import { formatMoney } from "@/lib/money"
import { MILLI, QTY_STEP_MILLI, formatQty } from "@/lib/quantity"

export function BillCardsMobile() {
  const people = useBillStore((s) => s.people)
  const items = useBillStore((s) => s.items)
  const currency = useBillStore((s) => s.currency)
  const removeItem = useBillStore((s) => s.removeItem)
  const setQuantityMilli = useBillStore((s) => s.setQuantityMilli)
  const toggleShared = useBillStore((s) => s.toggleShared)

  const totals = useBillStore(selectTotals)
  const peopleIds = people.map((p) => p.id)

  if (people.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add people first to start splitting.
      </p>
    )
  }
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No items yet — add one above or scan a receipt.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2 pb-20">
      {items.map((it) => {
        const alloc = totals.perItem.find((a) => a.itemId === it.id)
        return (
          <Card key={it.id}>
            <CardHeader className="flex-row items-start justify-between gap-2 pb-2">
              <div className="flex min-w-0 flex-col gap-1">
                <CardTitle className="flex flex-wrap items-center gap-1.5 text-sm">
                  <span className="truncate">{it.name}</span>
                  {it.isShared ? (
                    <span className="text-xs font-normal text-muted-foreground">
                      (shared)
                    </span>
                  ) : null}
                  {it.unitPriceMinor < 0 ? (
                    <span className="text-xs font-normal text-destructive">
                      (discount)
                    </span>
                  ) : null}
                  {isUnassigned(it, peopleIds) ? <UnassignedBadge /> : null}
                </CardTitle>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {formatMoney(it.unitPriceMinor, currency)} ·{" "}
                  <span className={(alloc?.lineTotalMinor ?? 0) < 0 ? "text-destructive" : "text-foreground"}>
                    {formatMoney(alloc?.lineTotalMinor ?? 0, currency)}
                  </span>
                </span>
                <BulkAssign item={it} />
              </div>
              <button
                type="button"
                onClick={() => removeItem(it.id)}
                aria-label={`Remove ${it.name}`}
                className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border/60">
              {people.map((p) => {
                const milli = it.quantitiesMilli[p.id] ?? 0
                const personShare = alloc?.perPersonMinor[p.id] ?? 0
                if (it.isShared) {
                  return (
                    <label
                      key={p.id}
                      className="flex items-center justify-between gap-2 py-2.5 text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <Checkbox
                          checked={milli > 0}
                          onCheckedChange={(v) =>
                            toggleShared(it.id, p.id, v === true)
                          }
                          aria-label={`${p.name} shares ${it.name}`}
                        />
                        <span className="truncate">{p.name}</span>
                      </span>
                      <span className={`font-mono text-xs tabular-nums${personShare < 0 ? " text-destructive" : " text-muted-foreground"}`}>
                        {formatMoney(personShare, currency)}
                      </span>
                    </label>
                  )
                }
                const included = milli > 0
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 py-2.5 text-sm"
                  >
                    {/* Tapping the name is the fast path: 0 <-> 1 in one tap. */}
                    <button
                      type="button"
                      onClick={() => setQuantityMilli(it.id, p.id, included ? 0 : MILLI)}
                      aria-pressed={included}
                      aria-label={`${p.name} had ${it.name}`}
                      className={`min-w-0 flex-1 truncate rounded-sm py-1 text-left transition-colors hover:bg-accent ${
                        included ? "font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {p.name}
                    </button>
                    <div className={`flex items-center gap-1${included ? "" : " opacity-60"}`}>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() =>
                          setQuantityMilli(
                            it.id,
                            p.id,
                            Math.max(0, milli - QTY_STEP_MILLI),
                          )
                        }
                        disabled={milli === 0}
                        aria-label={`Decrease ${p.name} quantity of ${it.name}`}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="1"
                        value={formatQty(milli)}
                        onChange={(e) =>
                          setQuantityMilli(
                            it.id,
                            p.id,
                            Math.max(0, Number(e.target.value) * MILLI),
                          )
                        }
                        className="h-9 w-14 text-center"
                        aria-label={`${p.name} quantity of ${it.name}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() =>
                          setQuantityMilli(it.id, p.id, milli + QTY_STEP_MILLI)
                        }
                        aria-label={`Increase ${p.name} quantity of ${it.name}`}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className={`ml-1 w-16 shrink-0 text-right font-mono text-xs tabular-nums${personShare < 0 ? " text-destructive" : " text-muted-foreground"}`}>
                      {formatMoney(personShare, currency)}
                    </span>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
