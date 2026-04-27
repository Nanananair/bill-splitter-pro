import { X, Minus, Plus } from "lucide-react"
import { useBillStore } from "@/store/useBillStore"
import { selectTotals } from "@/store/selectors"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { formatMoney } from "@/lib/money"

const STEP_MILLI = 250 // 0.25 quantity steps

export function BillCardsMobile() {
  const people = useBillStore((s) => s.people)
  const items = useBillStore((s) => s.items)
  const currency = useBillStore((s) => s.currency)
  const removeItem = useBillStore((s) => s.removeItem)
  const setQuantityMilli = useBillStore((s) => s.setQuantityMilli)
  const toggleShared = useBillStore((s) => s.toggleShared)

  const totals = useBillStore(selectTotals)

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
              <div className="flex flex-col gap-0.5">
                <CardTitle className="text-sm">
                  {it.name}
                  {it.isShared ? (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      (shared)
                    </span>
                  ) : null}
                </CardTitle>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {formatMoney(it.unitPriceMinor, currency)} ·{" "}
                  <span className="text-foreground">
                    {formatMoney(alloc?.lineTotalMinor ?? 0, currency)}
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeItem(it.id)}
                aria-label={`Remove ${it.name}`}
                className="text-muted-foreground transition-colors hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="flex flex-col divide-y divide-border/60">
              {people.map((p) => {
                const milli = it.quantitiesMilli[p.id] ?? 0
                const qty = milli / 1000
                const personShare = alloc?.perPersonMinor[p.id] ?? 0
                if (it.isShared) {
                  return (
                    <label
                      key={p.id}
                      className="flex items-center justify-between gap-2 py-2 text-sm"
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
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {formatMoney(personShare, currency)}
                      </span>
                    </label>
                  )
                }
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 py-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          setQuantityMilli(
                            it.id,
                            p.id,
                            Math.max(0, milli - STEP_MILLI),
                          )
                        }
                        aria-label={`Decrease ${p.name} quantity`}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.25"
                        value={qty}
                        onChange={(e) =>
                          setQuantityMilli(
                            it.id,
                            p.id,
                            Math.max(0, Number(e.target.value) * 1000),
                          )
                        }
                        className="h-7 w-14 text-center"
                        aria-label={`${p.name} quantity of ${it.name}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          setQuantityMilli(it.id, p.id, milli + STEP_MILLI)
                        }
                        aria-label={`Increase ${p.name} quantity`}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="ml-1 w-16 text-right font-mono text-xs tabular-nums text-muted-foreground">
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
