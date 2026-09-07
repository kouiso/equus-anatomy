/**
 * マスクや領域を画像に焼いて目で確かめるための道具。
 * 数字だけ見て「合っとるはず」で進めると、前身と同じ間違いをやる。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import jpeg from 'jpeg-js'
import { BLOCK, type Mask } from './silhouette'
import { maskFromEntry } from './coord-gate'
import type { Point, Polygon } from '../src/core/types'

export function loadMask(file: string): Mask {
  const sil = JSON.parse(readFileSync('src/core/data/silhouettes.json', 'utf8')) as {
    entries: { file: string; bw: number; bh: number; size: { w: number; h: number }; mask: string }[]
  }
  const e = sil.entries.find((x) => x.file === file)
  if (!e) throw new Error(`${file} のマスクが無い`)
  return maskFromEntry(e)
}

export type Overlay = { points: Polygon; color: [number, number, number]; label?: string }

/** 元画像の上にマスクの縁と領域を重ねて JPEG に落とす。 */
export function renderDebug(args: {
  imageFile: string
  mask?: Mask
  overlays?: Overlay[]
  dots?: { at: Point; color: [number, number, number] }[]
  out: string
  scale?: number
}): void {
  const raw = jpeg.decode(readFileSync(`public/anatomy/${args.imageFile}`), { useTArray: true, formatAsRGBA: true })
  const { width: w, height: h } = raw
  const px = new Uint8Array(raw.data)

  if (args.mask) {
    // マスクの縁を緑で描く（馬体判定の境界がどこかを見る）
    const m = args.mask
    for (let by = 0; by < m.bh; by++) {
      for (let bx = 0; bx < m.bw; bx++) {
        if (!m.bits[by * m.bw + bx]) continue
        const edge =
          bx === 0 || by === 0 || bx === m.bw - 1 || by === m.bh - 1 ||
          !m.bits[by * m.bw + bx - 1] || !m.bits[by * m.bw + bx + 1] ||
          !m.bits[(by - 1) * m.bw + bx] || !m.bits[(by + 1) * m.bw + bx]
        if (!edge) continue
        for (let y = by * BLOCK; y < Math.min(h, (by + 1) * BLOCK); y++) {
          for (let x = bx * BLOCK; x < Math.min(w, (bx + 1) * BLOCK); x++) {
            const i = (y * w + x) * 4
            px[i] = 60; px[i + 1] = 255; px[i + 2] = 120
          }
        }
      }
    }
  }

  for (const ov of args.overlays ?? []) {
    for (let i = 0; i < ov.points.length; i++) {
      line(px, w, h, ov.points[i]!, ov.points[(i + 1) % ov.points.length]!, ov.color, 5)
    }
  }
  for (const d of args.dots ?? []) {
    disc(px, w, h, d.at, 9, d.color)
  }

  writeFileSync(args.out, jpeg.encode({ data: Buffer.from(px), width: w, height: h }, 82).data)
}

function line(px: Uint8Array, w: number, h: number, a: Point, b: Point, c: [number, number, number], thick: number) {
  const steps = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])))
  for (let s = 0; s <= steps; s++) {
    const t = s / steps
    disc(px, w, h, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], thick, c)
  }
}
function disc(px: Uint8Array, w: number, h: number, p: Point, r: number, c: [number, number, number]) {
  const x0 = Math.round(p[0])
  const y0 = Math.round(p[1])
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue
      const x = x0 + dx
      const y = y0 + dy
      if (x < 0 || y < 0 || x >= w || y >= h) continue
      const i = (y * w + x) * 4
      px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]
    }
  }
}

/** 画像を切り出して座標グリッドを焼く。目盛りを読んで座標を決めるための道具。 */
export function renderGrid(args: {
  imageFile: string
  crop: { x: number; y: number; w: number; h: number }
  step?: number
  overlays?: Overlay[]
  out: string
}): void {
  const raw = jpeg.decode(readFileSync(`public/anatomy/${args.imageFile}`), { useTArray: true, formatAsRGBA: true })
  const { width: iw, height: ih } = raw
  const { x: cx, y: cy, w: cw, h: ch } = args.crop
  const step = args.step ?? 50
  const out = new Uint8Array(cw * ch * 4)
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const sx = cx + x
      const sy = cy + y
      const o = (y * cw + x) * 4
      if (sx < 0 || sy < 0 || sx >= iw || sy >= ih) {
        out[o] = 0; out[o + 1] = 0; out[o + 2] = 0; out[o + 3] = 255
        continue
      }
      const i = (sy * iw + sx) * 4
      out[o] = raw.data[i]!; out[o + 1] = raw.data[i + 1]!; out[o + 2] = raw.data[i + 2]!; out[o + 3] = 255
    }
  }
  // 100 の倍数は明るく、それ以外は暗く
  for (let sx = Math.ceil(cx / step) * step; sx < cx + cw; sx += step) {
    const strong = sx % (step * 2) === 0
    for (let y = 0; y < ch; y++) {
      const o = (y * cw + (sx - cx)) * 4
      out[o] = strong ? 255 : 90; out[o + 1] = strong ? 255 : 200; out[o + 2] = strong ? 60 : 255
    }
  }
  for (let sy = Math.ceil(cy / step) * step; sy < cy + ch; sy += step) {
    const strong = sy % (step * 2) === 0
    for (let x = 0; x < cw; x++) {
      const o = ((sy - cy) * cw + x) * 4
      out[o] = strong ? 255 : 90; out[o + 1] = strong ? 255 : 200; out[o + 2] = strong ? 60 : 255
    }
  }
  for (const ov of args.overlays ?? []) {
    const shifted = ov.points.map((p) => [p[0] - cx, p[1] - cy] as Point)
    for (let i = 0; i < shifted.length; i++) {
      line(out, cw, ch, shifted[i]!, shifted[(i + 1) % shifted.length]!, ov.color, 3)
    }
  }
  writeFileSync(args.out, jpeg.encode({ data: Buffer.from(out), width: cw, height: ch }, 92).data)
}
