# Bill Splitter Pro

A small React + TypeScript SPA for splitting restaurant bills fairly. Add people, add items (per-quantity or shared), or scan a receipt photo and have the line items extracted for you. Per-person totals always reconcile to the bill exactly — no floating-point drift.

Deployed as a single Vercel project: a Vite SPA served as static files, plus serverless functions in `api/` on the same origin.

## Features

- **One-tap assignment.** Non-shared items start unassigned; tap a person's name to give them one, tap again to take it away. `-`/`+` step by a whole unit (type a decimal for halves), and **Everyone** / **Clear** assign or clear a whole item at once. Items nobody is on are flagged `Unassigned` so their money can't quietly go missing.
- **Per-quantity and shared items.** Track "Alice had 1 beer, Bob had 3", or split a tax/appetizer evenly among included people. Anyone can opt out of a shared item.
- **Shareable per-person summaries.** Each person in the breakdown has a share button that renders their itemised summary as a PNG card and opens the native share sheet — straight into WhatsApp. Falls back to sharing text, then to the clipboard, on browsers without file sharing.
- **Installable (PWA).** Web manifest, icons, and a Workbox service worker: install to the home screen and keep splitting with no connection. Only receipt scanning needs the network.
- **Receipt scanning.** Upload a photo; line items + currency are extracted via [OpenRouter](https://openrouter.ai) (default model: `google/gemini-2.5-flash`). Edit the result before adding to the bill.
- **Multi-currency.** Detected from the receipt and overridable from the header. Amounts are formatted with `Intl.NumberFormat` and stored as integer minor units (paise/cents) — per-person sums always equal the displayed grand total.
- **Persistence.** People, items, and currency are saved to `localStorage`; refreshing the tab won't lose your bill.
- **Dark mode by default.** Equal-priority mobile and desktop layouts: a real table on `lg+` screens, per-item cards with a sticky totals sheet on phones.

## Tech stack

- **Frontend:** React 18, Vite, TypeScript (strict), Tailwind CSS, shadcn-style components on Radix primitives, Zustand (with `persist` middleware) for state.
- **API:** Vercel serverless functions in `api/`. `parse-receipt` calls OpenRouter via the `openai` SDK, gated by an Origin allowlist, per-IP rate limiting (Upstash Redis), and a server-side payload-size cap.
- **Tests:** Vitest + React Testing Library. Lint via ESLint flat config.

## Project layout

```
api/
  parse-receipt.ts      POST: hardened receipt OCR
  health.ts             GET:  reports model + configured-flags
  _lib/cors.ts          Origin allowlist + preflight
  _lib/ratelimit.ts     Upstash sliding-window limiter
src/
  components/           UI + feature components
  store/                Zustand store + selectors (totals, per-person breakdown)
  lib/                  money math, currency, quantities, share text + card, fetch helpers
  main.tsx, App.tsx
public/                 PWA icons (generated — see `npm run icons`)
scripts/
  generate-icons.mjs    draws the app icon; no image dependencies
test/                   Vitest specs (money, store, quantity UX, share, XSS, API)
index.html              Vite entry
vercel.json             framework=vite, SPA rewrite to index.html
```

## Running locally

The receipt-scan feature needs the API functions, which `vercel dev` runs alongside the Vite dev server.

```bash
npm install
npm install -g vercel             # one-time
vercel link                        # link this folder to your Vercel project
vercel env pull .env.local         # pulls OPENROUTER_API_KEY etc. from Vercel
npm run dev                        # vercel dev on http://localhost:3000
```

For frontend-only iteration with no scan endpoint:

```bash
npm run dev:vite
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | `vercel dev` — full stack, including `/api/*` |
| `npm run dev:vite` | Vite alone, no serverless functions |
| `npm run build` | TypeScript project build + Vite production build to `dist/` (emits the manifest and service worker) |
| `npm run icons` | Regenerate `public/` icons from `scripts/generate-icons.mjs` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint on `src/`, `api/`, `test/` |
| `npm run typecheck` | `tsc --noEmit` across all references |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

| Var | Required | Purpose |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | yes (production) | Auth for the OpenRouter chat completions API |
| `OPENROUTER_MODEL` | no | Defaults to `google/gemini-2.5-flash` |
| `PUBLIC_APP_URL` | no | Used in OpenRouter attribution headers |
| `ALLOWED_ORIGINS` | yes (production) | Comma-separated list of origins allowed to call `/api/parse-receipt` |
| `UPSTASH_REDIS_REST_URL` | yes (production) | Upstash REST URL for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | yes (production) | Upstash REST token |

The rate limiter is **fail-open** when the Upstash vars are absent (it logs a warning) — fine for local dev, **not** for production. Set them on Vercel before going live.

## Deploying to Vercel

1. Push to GitHub and import as a project on Vercel.
2. Vercel auto-detects `framework: "vite"` (also pinned in `vercel.json`).
3. In **Project → Settings → Environment Variables**, set the variables in the table above.
4. Deploy. Future `git push`es auto-deploy.

Health check after deploy: `https://<your-deploy>.vercel.app/api/health` → `{ ok: true, configured: true, rateLimitConfigured: true, model: "..." }`.

## How splits stay exact

- Every amount is stored as an integer in the currency's minor units (e.g. paise for INR, cents for USD, yen for JPY).
- Even splits use the **largest-remainder** method: e.g. ₹100.01 split three ways becomes `[₹33.34, ₹33.34, ₹33.33]`. Sum = total, by construction.
- Per-item allocations across people use the same method weighted by quantity, so the sum of per-person allocations always equals the line total — and therefore the sum of per-person totals always equals the grand total. There is no floating-point drift.

## Sharing a person's summary

`selectBreakdown` (`src/store/selectors.ts`) derives each person's lines — item, quantity, and their share — from the same `selectTotals` the UI renders, so the shared summary can never disagree with the screen.

`src/lib/shareCard.ts` draws that into a PNG with the canvas 2D API (no DOM-rasterising dependency); the card is always dark so it looks the same in everyone's chat. `src/lib/share.ts` then degrades through three levels, so no browser is a dead end:

1. `navigator.share({ files: [png] })` — the OS share sheet, with WhatsApp in it. Needs a secure context and a user gesture.
2. `navigator.share({ text })` — text only, where file sharing isn't supported.
3. `navigator.clipboard.writeText(text)` (then a hidden-textarea `execCommand` fallback) with a toast.

A dismissed share sheet raises `AbortError` and is treated as a no-op, not an error.

## PWA

`vite-plugin-pwa` (`generateSW`) emits `manifest.webmanifest` and a Workbox service worker that precaches the built shell. `navigateFallbackDenylist` excludes `/api/`, so an offline receipt scan fails honestly instead of being answered with `index.html`. The header's install button uses `beforeinstallprompt` where it exists and points iOS Safari users at Share → *Add to Home Screen*.

Icons are generated by `scripts/generate-icons.mjs`, which rasterises the mark and encodes PNGs using only Node's `zlib` — no ImageMagick, sharp, or canvas dependency. Edit the constants at the top of that file and run `npm run icons` to change the icon.

## Security model for `/api/parse-receipt`

Three guards in order, each early-returns:

1. **Origin allowlist.** Requests with an `Origin` not in `ALLOWED_ORIGINS` get `403`. Same-origin POSTs (no `Origin` header) are allowed only when `NODE_ENV !== "production"` or the request host matches an allowed origin's host.
2. **Per-IP rate limit.** Upstash sliding window (20 req/hr by default). Returns `429` with `Retry-After` and `X-RateLimit-Remaining` headers when the budget is exhausted.
3. **Body-size cap.** Outer Vercel `bodyParser` limits the request to 5 MB. Inside the handler we additionally require a `data:image/{jpeg,png,webp};base64,...` prefix and reject base64 strings longer than ~3.4 MB binary equivalent with `413`.

## Migration from v0/v1

If your browser has `localStorage["bill-splitter-pro"]` from the legacy single-file build, the Zustand `persist` migration runs at `version: 2`: rupee floats become integer minor units, decimal quantities become milli-fixed-point, and people stored as plain strings get fresh ids. Your bill survives the upgrade.

## License

MIT.
