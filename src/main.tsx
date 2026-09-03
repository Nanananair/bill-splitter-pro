import { StrictMode } from "react"
import { registerSW } from "virtual:pwa-register"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import { ThemeProvider } from "./components/ThemeProvider"
import "./index.css"

// Keep the installed app up to date without prompting.
registerSW({ immediate: true })

const rootEl = document.getElementById("root")
if (!rootEl) throw new Error("Missing #root in index.html")

createRoot(rootEl).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
