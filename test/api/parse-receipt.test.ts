import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { createMock, limitMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  limitMock: vi.fn(),
}))

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: createMock } },
  })),
}))

vi.mock("../../api/_lib/ratelimit", () => ({
  rateLimit: limitMock,
  clientIp: () => "203.0.113.1",
}))

import handler from "../../api/parse-receipt"

interface MockRes {
  statusCode: number
  body: unknown
  headers: Record<string, string>
  status: (n: number) => MockRes
  json: (v: unknown) => MockRes
  setHeader: (k: string, v: string | string[]) => void
  end: () => MockRes
}

function makeRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(n: number) {
      this.statusCode = n
      return this
    },
    json(v: unknown) {
      this.body = v
      return this
    },
    setHeader(k: string, v: string | string[]) {
      this.headers[k.toLowerCase()] = Array.isArray(v) ? v.join(", ") : String(v)
    },
    end() {
      return this
    },
  }
  return res
}

const tinyImage = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA"

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "test-key"
  process.env.NODE_ENV = "development"
  process.env.ALLOWED_ORIGINS = "https://app.example,http://localhost:3000"
  limitMock.mockReset()
  createMock.mockReset()
})

afterEach(() => {
  delete process.env.OPENROUTER_API_KEY
})

describe("/api/parse-receipt", () => {
  it("returns 429 when the rate limit is exceeded", async () => {
    limitMock.mockResolvedValue({
      ok: false,
      remaining: 0,
      reset: Date.now() + 60_000,
      retryAfterSec: 60,
    })
    const req = {
      method: "POST",
      headers: { origin: "https://app.example" },
      body: { image: tinyImage },
    }
    const res = makeRes()
    await handler(req as never, res as never)
    expect(res.statusCode).toBe(429)
    expect(res.headers["retry-after"]).toBe("60")
    expect(res.headers["x-ratelimit-remaining"]).toBe("0")
  })

  it("rejects disallowed origins with 403", async () => {
    limitMock.mockResolvedValue({ ok: true, remaining: 19, reset: 0, retryAfterSec: 0 })
    const req = {
      method: "POST",
      headers: { origin: "https://evil.example" },
      body: { image: tinyImage },
    }
    const res = makeRes()
    await handler(req as never, res as never)
    expect(res.statusCode).toBe(403)
  })

  it("rejects oversized payloads with 413", async () => {
    limitMock.mockResolvedValue({ ok: true, remaining: 19, reset: 0, retryAfterSec: 0 })
    const huge = "data:image/jpeg;base64," + "A".repeat(4_500_001)
    const req = {
      method: "POST",
      headers: { origin: "https://app.example" },
      body: { image: huge },
    }
    const res = makeRes()
    await handler(req as never, res as never)
    expect(res.statusCode).toBe(413)
  })

  it("rejects bodies without a valid image data URL", async () => {
    limitMock.mockResolvedValue({ ok: true, remaining: 19, reset: 0, retryAfterSec: 0 })
    const req = {
      method: "POST",
      headers: { origin: "https://app.example" },
      body: { image: "not an image" },
    }
    const res = makeRes()
    await handler(req as never, res as never)
    expect(res.statusCode).toBe(400)
  })

  it("happy path: returns parsed items and currency", async () => {
    limitMock.mockResolvedValue({ ok: true, remaining: 19, reset: 0, retryAfterSec: 0 })
    createMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [
                { name: "Latte", price: 4.5 },
                { name: "Bagel", price: 3 },
                { name: "garbage", price: 0 }, // filtered: price not > 0
              ],
              currency: "usd",
            }),
          },
        },
      ],
    })
    const req = {
      method: "POST",
      headers: { origin: "https://app.example" },
      body: { image: tinyImage },
    }
    const res = makeRes()
    await handler(req as never, res as never)
    expect(res.statusCode).toBe(200)
    const body = res.body as { items: Array<{ name: string; price: number }>; currency: string }
    expect(body.items).toHaveLength(2)
    expect(body.currency).toBe("USD")
  })
})
