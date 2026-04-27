import { X } from "lucide-react"
import { useBillStore } from "@/store/useBillStore"
import { selectTotals } from "@/store/selectors"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatMoney } from "@/lib/money"

export function BillTableDesktop() {
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="min-w-[10rem]">Item</TableHead>
          <TableHead className="w-32">Unit</TableHead>
          {people.map((p) => (
            <TableHead key={p.id} className="text-center">
              {p.name}
            </TableHead>
          ))}
          <TableHead className="text-right">Line total</TableHead>
          <TableHead className="w-8" aria-label="Remove" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((it) => {
          const alloc = totals.perItem.find((a) => a.itemId === it.id)
          return (
            <TableRow key={it.id}>
              <TableCell className="font-medium">
                {it.name}
                {it.isShared ? (
                  <span className="ml-1 text-xs text-muted-foreground">(shared)</span>
                ) : null}
              </TableCell>
              <TableCell className="font-mono text-xs tabular-nums">
                {formatMoney(it.unitPriceMinor, currency)}
              </TableCell>
              {people.map((p) => {
                const milli = it.quantitiesMilli[p.id] ?? 0
                if (it.isShared) {
                  return (
                    <TableCell key={p.id} className="text-center">
                      <Checkbox
                        checked={milli > 0}
                        onCheckedChange={(v) =>
                          toggleShared(it.id, p.id, v === true)
                        }
                        aria-label={`${p.name} shares ${it.name}`}
                      />
                    </TableCell>
                  )
                }
                return (
                  <TableCell key={p.id} className="text-center">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.25"
                      value={milli / 1000}
                      onChange={(e) =>
                        setQuantityMilli(
                          it.id,
                          p.id,
                          Math.max(0, Number(e.target.value) * 1000),
                        )
                      }
                      className="mx-auto h-8 w-20 text-center"
                      aria-label={`${p.name} quantity of ${it.name}`}
                    />
                  </TableCell>
                )
              })}
              <TableCell className="text-right font-mono tabular-nums">
                {formatMoney(alloc?.lineTotalMinor ?? 0, currency)}
              </TableCell>
              <TableCell>
                <button
                  type="button"
                  onClick={() => removeItem(it.id)}
                  aria-label={`Remove ${it.name}`}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell className="font-semibold">Total owed</TableCell>
          <TableCell />
          {people.map((p) => (
            <TableCell
              key={p.id}
              className="text-center font-mono font-semibold tabular-nums"
            >
              {formatMoney(totals.perPersonMinor[p.id] ?? 0, currency)}
            </TableCell>
          ))}
          <TableCell className="text-right font-mono font-semibold tabular-nums">
            {formatMoney(totals.grandTotalMinor, currency)}
          </TableCell>
          <TableCell />
        </TableRow>
      </TableFooter>
    </Table>
  )
}
