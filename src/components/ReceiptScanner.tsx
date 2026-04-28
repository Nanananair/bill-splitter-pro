import * as React from "react"
import { Camera, Loader2, Trash2, Check } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useBillStore } from "@/store/useBillStore"
import { fileToResizedDataUrl, parseReceipt } from "@/lib/api"
import { toMinor, fromMinor, formatMoney } from "@/lib/money"
import { isValidCurrency } from "@/lib/currency"

export function ReceiptScanner() {
  const currency = useBillStore((s) => s.currency)
  const setCurrency = useBillStore((s) => s.setCurrency)
  const pending = useBillStore((s) => s.pendingReceiptItems)
  const setPending = useBillStore((s) => s.setPendingReceiptItems)
  const updatePending = useBillStore((s) => s.updatePendingReceiptItem)
  const removePending = useBillStore((s) => s.removePendingReceiptItem)
  const confirmPending = useBillStore((s) => s.confirmPendingReceiptItems)
  const clearPending = useBillStore((s) => s.clearPendingReceiptItems)
  const peopleCount = useBillStore((s) => s.people.length)

  const [scanning, setScanning] = React.useState(false)

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setScanning(true)
    try {
      const image = await fileToResizedDataUrl(file)
      const result = await parseReceipt(image)
      if (result.currency && isValidCurrency(result.currency)) {
        setCurrency(result.currency)
      }
      const target = result.currency ?? currency
      const items = result.items.map((it) => ({
        name: it.name,
        priceMinor: toMinor(it.price, target),
        isShared: false,
      }))
      if (items.length === 0) {
        toast.warning("No items detected. Try a sharper photo.")
        return
      }
      setPending(items)
      toast.success(`Found ${items.length} item${items.length === 1 ? "" : "s"}.`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Scan failed"
      toast.error(msg)
    } finally {
      setScanning(false)
    }
  }

  const onConfirm = () => {
    if (peopleCount === 0) {
      toast.error("Add at least one person before importing items.")
      return
    }
    const { added } = confirmPending()
    if (added > 0) toast.success(`Added ${added} item${added === 1 ? "" : "s"}.`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan receipt</CardTitle>
        <CardDescription>
          Upload a photo and review the line items before adding them.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Button asChild size="sm" disabled={scanning}>
            <label className="cursor-pointer">
              {scanning ? <Loader2 className="animate-spin" /> : <Camera />}
              {scanning ? "Scanning…" : "Choose photo"}
              <Input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPick}
                disabled={scanning}
              />
            </label>
          </Button>
          {pending.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearPending}
            >
              Discard
            </Button>
          ) : null}
        </div>

        {pending.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/20 p-2">
            <div className="grid grid-cols-[1fr_7rem_3rem_2rem] gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <span>Item</span>
              <span>Price</span>
              <span>Shared</span>
              <span className="sr-only">Remove</span>
            </div>
            {pending.map((p, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_7rem_3rem_2rem] items-center gap-2 px-1"
              >
                <Input
                  value={p.name}
                  onChange={(e) => updatePending(i, { name: e.target.value })}
                  className="h-8"
                />
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={fromMinor(p.priceMinor, currency)}
                  onChange={(e) =>
                    updatePending(i, {
                      priceMinor: toMinor(Number(e.target.value), currency),
                    })
                  }
                  className="h-8"
                />
                <div className="flex justify-center">
                  <Checkbox
                    checked={p.isShared}
                    onCheckedChange={(v) =>
                      updatePending(i, { isShared: v === true })
                    }
                    aria-label={`${p.name} shared`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePending(i)}
                  aria-label={`Remove ${p.name}`}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="flex items-center justify-between gap-2 pt-1">
              <Label className="text-xs">
                Total:{" "}
                {formatMoney(
                  pending.reduce((s, p) => s + (Number.isFinite(p.priceMinor) ? p.priceMinor : 0), 0),
                  currency,
                )}
              </Label>
              <Button size="sm" onClick={onConfirm} disabled={peopleCount === 0}>
                <Check />
                Add to bill
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
