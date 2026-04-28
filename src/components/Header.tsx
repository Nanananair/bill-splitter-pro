import * as React from "react"
import { Moon, Sun, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTheme } from "@/components/ThemeProvider"
import { useBillStore } from "@/store/useBillStore"

const COMMON_CURRENCIES = ["INR", "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD", "AED"]

export function Header() {
  const { theme, toggle } = useTheme()
  const currency = useBillStore((s) => s.currency)
  const setCurrency = useBillStore((s) => s.setCurrency)
  const clearAll = useBillStore((s) => s.clearAll)
  const peopleCount = useBillStore((s) => s.people.length)
  const itemsCount = useBillStore((s) => s.items.length)

  const onClear = () => {
    if (peopleCount === 0 && itemsCount === 0) return
    if (window.confirm("Clear all people and items? This cannot be undone.")) {
      clearAll()
    }
  }

  const options = React.useMemo(() => {
    const set = new Set([currency, ...COMMON_CURRENCIES])
    return Array.from(set)
  }, [currency])

  return (
    <header className="border-b bg-background/95 backdrop-blur-sm">
      <div className="container flex h-14 max-w-6xl items-center gap-2">
        <h1 className="text-base font-semibold tracking-tight">
          Bill Splitter <span className="text-muted-foreground">Pro</span>
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="h-8 w-[5.5rem] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClear}
            aria-label="Clear bill"
            disabled={peopleCount === 0 && itemsCount === 0}
          >
            <Trash2 />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </Button>
        </div>
      </div>
    </header>
  )
}
