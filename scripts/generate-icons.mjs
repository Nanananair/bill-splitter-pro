/**
 * Generates the PWA icon PNGs from a single procedural mark, using only Node
 * built-ins (no ImageMagick / sharp / canvas dependency).
 *
 *   npm run icons
 *
 * The mark: a pie split into three unequal wedges — one bill, three shares.
 * `public/icon.svg` is the vector twin used as the browser favicon.
 */
import { deflateSync } from "node:zlib"
import { writeFileSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "public")

const BG = [10, 10, 11]
const WEDGES = [
  { frac: 0.5, rgb: [250, 250, 250] },
  { frac: 0.3, rgb: [113, 113, 122] },
  { frac: 0.2, rgb: [63, 63, 70] },
]
const GAP_DEG = 5
const SS = 4 // supersampling factor per axis, for antialiasing

// --- PNG encoding -----------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, "ascii"), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** `rgba` is a size*size*4 Uint8Array. */
function encodePng(rgba, size) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  // 10..12: deflate / adaptive filtering / no interlace, all 0

  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0 // filter type: None
    Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

// --- the mark ---------------------------------------------------------------

/** Which wedge covers this angle, or -1 for a gap / outside the pie. */
function wedgeAt(dx, dy, radius) {
  if (dx * dx + dy * dy > radius * radius) return -1
  // 0 at 12 o'clock, increasing clockwise.
  let deg = (Math.atan2(dx, -dy) * 180) / Math.PI
  if (deg < 0) deg += 360
  let start = 0
  for (let i = 0; i < WEDGES.length; i++) {
    const end = start + WEDGES[i].frac * 360
    if (deg >= start + GAP_DEG / 2 && deg <= end - GAP_DEG / 2) return i
    start = end
  }
  return -1
}

function insideRoundedSquare(x, y, size, radius) {
  const cx = Math.min(Math.max(x, radius), size - radius)
  const cy = Math.min(Math.max(y, radius), size - radius)
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= radius * radius
}

/**
 * @param {number} size    output edge length in px
 * @param {boolean} rounded  rounded corners (false = full bleed, for maskable
 *                           and apple-touch, where the platform masks for us)
 * @param {number} pieScale  pie diameter as a fraction of the edge
 */
function drawIcon(size, rounded, pieScale) {
  const rgba = new Uint8Array(size * size * 4)
  const corner = size * 0.22
  const radius = (size * pieScale) / 2
  const c = size / 2
  const samples = SS * SS

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Accumulate subpixel coverage per layer for smooth edges.
      let bgHits = 0
      const wedgeHits = [0, 0, 0]
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS
          const py = y + (sy + 0.5) / SS
          if (rounded && !insideRoundedSquare(px, py, size, corner)) continue
          bgHits++
          const w = wedgeAt(px - c, py - c, radius)
          if (w >= 0) wedgeHits[w]++
        }
      }
      if (bgHits === 0) continue

      const alpha = bgHits / samples
      let r = BG[0] * bgHits
      let g = BG[1] * bgHits
      let b = BG[2] * bgHits
      for (let i = 0; i < WEDGES.length; i++) {
        const hits = wedgeHits[i]
        if (!hits) continue
        r += (WEDGES[i].rgb[0] - BG[0]) * hits
        g += (WEDGES[i].rgb[1] - BG[1]) * hits
        b += (WEDGES[i].rgb[2] - BG[2]) * hits
      }
      const o = (y * size + x) * 4
      rgba[o] = Math.round(r / bgHits)
      rgba[o + 1] = Math.round(g / bgHits)
      rgba[o + 2] = Math.round(b / bgHits)
      rgba[o + 3] = Math.round(alpha * 255)
    }
  }
  return encodePng(rgba, size)
}

function svgMark() {
  const c = 256
  const radius = 150
  const paths = []
  let start = 0
  for (const { frac, rgb } of WEDGES) {
    const end = start + frac * 360
    const a0 = ((start + GAP_DEG / 2) * Math.PI) / 180
    const a1 = ((end - GAP_DEG / 2) * Math.PI) / 180
    const p = (a) => [
      (c + radius * Math.sin(a)).toFixed(2),
      (c - radius * Math.cos(a)).toFixed(2),
    ]
    const [x0, y0] = p(a0)
    const [x1, y1] = p(a1)
    const large = end - start > 180 ? 1 : 0
    paths.push(
      `<path d="M${c} ${c} L${x0} ${y0} A${radius} ${radius} 0 ${large} 1 ${x1} ${y1} Z" fill="rgb(${rgb.join(",")})"/>`,
    )
    start = end
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="113" fill="rgb(${BG.join(",")})"/>
  ${paths.join("\n  ")}
</svg>
`
}

mkdirSync(OUT, { recursive: true })
const files = [
  ["pwa-192.png", drawIcon(192, true, 0.62)],
  ["pwa-512.png", drawIcon(512, true, 0.62)],
  ["pwa-maskable-512.png", drawIcon(512, false, 0.5)], // 0.5 keeps it inside the 80% safe zone
  ["apple-touch-icon-180.png", drawIcon(180, false, 0.62)],
  ["favicon-32.png", drawIcon(32, true, 0.62)],
  ["icon.svg", Buffer.from(svgMark(), "utf8")],
]
for (const [name, data] of files) {
  writeFileSync(resolve(OUT, name), data)
  console.log(`${name}  ${(data.length / 1024).toFixed(1)} kB`)
}
