# Bill Splitter Pro — Backend

Tiny Express service that proxies receipt-image uploads to a vision model on
[OpenRouter](https://openrouter.ai). Keeps the API key out of the browser and
lets you swap models with one env-var change.

## Setup

```bash
cd backend
cp .env.example .env
# edit .env and paste your OpenRouter key (sk-or-...)
npm install
npm start
```

Health check: <http://localhost:3001/api/health>

## Endpoints

### `GET /api/health`
Returns `{ ok: true, model: "<id>" }`.

### `POST /api/parse-receipt`
Multipart form-data with one image field named `receipt`. Returns:

```json
{
  "items": [{ "name": "Beer", "price": 250 }, ...],
  "currency": "INR",
  "model": "google/gemini-2.5-flash"
}
```

## Choosing a model

Set `OPENROUTER_MODEL` in `.env` to any vision-capable model on OpenRouter.
Defaults to `google/gemini-2.5-flash` (cheap + fast + good at OCR).

Other solid picks:
- `anthropic/claude-sonnet-4.5` — best accuracy
- `openai/gpt-4o` — strong all-rounder
- `google/gemini-2.5-pro` — Gemini's flagship

## Deploying

This service requires `OPENROUTER_API_KEY` as a secret, so it isn't auto-deployed
with the static frontend. Easy hosts: Render, Railway, Fly.io. Set
`ALLOWED_ORIGIN` to your frontend URL in production.
