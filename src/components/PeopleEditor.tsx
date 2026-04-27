import * as React from "react"
import { X, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useBillStore } from "@/store/useBillStore"

export function PeopleEditor() {
  const people = useBillStore((s) => s.people)
  const addPerson = useBillStore((s) => s.addPerson)
  const removePerson = useBillStore((s) => s.removePerson)
  const [name, setName] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = addPerson(name)
    if (!result.ok) {
      toast.error(result.error ?? "Could not add person")
      return
    }
    setName("")
    inputRef.current?.focus()
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>People ({people.length})</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form onSubmit={submit} className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <Label htmlFor="person-name">Add person</Label>
            <Input
              id="person-name"
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alice"
              maxLength={60}
              autoComplete="off"
            />
          </div>
          <Button type="submit" size="sm" disabled={!name.trim()}>
            <UserPlus />
            Add
          </Button>
        </form>

        {people.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Add the people sharing this bill to begin.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {people.map((p) => (
              <li
                key={p.id}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-sm"
              >
                <span className="max-w-[14ch] truncate">{p.name}</span>
                <button
                  type="button"
                  onClick={() => removePerson(p.id)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                  aria-label={`Remove ${p.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
