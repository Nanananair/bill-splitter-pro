import * as React from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useBillStore } from "@/store/useBillStore"
import { toMinor } from "@/lib/money"

export function ItemEditor() {
  const currency = useBillStore((s) => s.currency)
  const peopleCount = useBillStore((s) => s.people.length)
  const addItem = useBillStore((s) => s.addItem)

  const [name, setName] = React.useState("")
  const [price, setPrice] = React.useState("")
  const [isShared, setIsShared] = React.useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const priceFloat = Number(price)
    if (!Number.isFinite(priceFloat) || priceFloat <= 0) {
      toast.error("Price must be greater than zero.")
      return
    }
    const result = addItem({
      name,
      unitPriceMinor: toMinor(priceFloat, currency),
      isShared,
    })
    if (!result.ok) {
      toast.error(result.error ?? "Could not add item")
      return
    }
    setName("")
    setPrice("")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add item</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="flex flex-col gap-1">
            <Label htmlFor="item-name">Name</Label>
            <Input
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Paneer tikka"
              maxLength={120}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="item-price">Unit price</Label>
            <Input
              id="item-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="w-32"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim() || !price || peopleCount === 0}
            >
              <Plus />
              Add item
            </Button>
          </div>
          <label className="col-span-full inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={isShared}
              onCheckedChange={(v) => setIsShared(v === true)}
            />
            Shared (split between included people instead of per-quantity)
          </label>
        </form>
        {peopleCount === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Add at least one person before adding items.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
