import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import { ThemeProvider } from "./components/ThemeProvider"
import "./index.css"

const rootEl = document.getElementById("root")
if (!rootEl) throw new Error("Missing #root in index.html")

createRoot(rootEl).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
