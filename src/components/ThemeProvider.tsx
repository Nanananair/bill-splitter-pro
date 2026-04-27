import * as React from "react"
import type { Theme } from "@/types"

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = "bsp.theme"

function readInitial(): Theme {
  if (typeof document !== "undefined" && document.documentElement.classList.contains("dark")) {
    return "dark"
  }
  try {
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark"
  } catch {
    return "dark"
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(readInitial)

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next === "dark")
    }
  }, [])

  const toggle = React.useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [theme, setTheme],
  )

  const value = React.useMemo(
    () => ({ theme, setTheme, toggle }),
    [theme, setTheme, toggle],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>")
  return ctx
}
