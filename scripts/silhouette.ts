import { readFileSync } from 'node:fs'
import jpeg from 'jpeg-js'

export const BLOCK = 8

export type Mask = {
  /** ブロック単位の幅・高さ */
  readonly bw: number
  readonly bh: number
  readonly size: { readonly w: number; readonly h: number }
  /** 1 = 馬体。ブロック単位。 */
  readonly bits: Uint8Array
}

/**
 * 背景は一様な暗色。四隅の色を背景色とみなし、縁から色差でフラッドフィルして
 * 「外から届く背景」を塗る。届かんかったところが馬体。
 *
 * 単純な輝度しきい値やと skin_left の暗い鹿毛（輝度30-40）が背景（20前後）と分離できん。
 * 「縁から連続しとるか」を条件に足すと、暗い毛でも馬体として残る。
 */
export function silhouetteOf(jpegPath: string): Mask {
  const raw = jpeg.decode(readFileSync(jpegPath), { useTArray: true, formatAsRGBA: true })
  const { width: w, height: h, data } = raw
  const bw = Math.ceil(w / BLOCK)
  const bh = Math.ceil(h / BLOCK)

  // ブロック平均色
  const r = new Float64Array(bw * bh)
  const g = new Float64Array(bw * bh)
  const b = new Float64Array(bw * bh)
  const n = new Float64Array(bw * bh)
  for (let y = 0; y < h; y++) {
    const by = (y / BLOCK) | 0
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const k = by * bw + ((x / BLOCK) | 0)
      r[k]! += data[i]!
      g[k]! += data[i + 1]!
      b[k]! += data[i + 2]!
      n[k]! += 1
    }
  }
  for (let k = 0; k < r.length; k++) {
    const c = n[k]! || 1
    r[k]! /= c
    g[k]! /= c
    b[k]! /= c
  }

  // 背景色 = 四隅ブロックの中央値
  const corners = [0, bw - 1, (bh - 1) * bw, bh * bw - 1]
  const bg = {
    r: median(corners.map((k) => r[k]!)),
    g: median(corners.map((k) => g[k]!)),
    b: median(corners.map((k) => b[k]!)),
  }

  const TOL = 26 // 背景とみなす色差。JPEG のブロックノイズと影のグラデを吸収する幅
  const isBgColor = (k: number) =>
    Math.abs(r[k]! - bg.r) <= TOL && Math.abs(g[k]! - bg.g) <= TOL && Math.abs(b[k]! - bg.b) <= TOL

  // 縁からフラッドフィル
  const bgReached = new Uint8Array(bw * bh)
  const stack: number[] = []
  const push = (k: number) => {
    if (!bgReached[k] && isBgColor(k)) {
      bgReached[k] = 1
      stack.push(k)
    }
  }
  for (let x = 0; x < bw; x++) {
    push(x)
    push((bh - 1) * bw + x)
  }
  for (let y = 0; y < bh; y++) {
    push(y * bw)
    push(y * bw + bw - 1)
  }
  while (stack.length > 0) {
    const k = stack.pop()!
    const x = k % bw
    const y = (k / bw) | 0
    if (x > 0) push(k - 1)
    if (x < bw - 1) push(k + 1)
    if (y > 0) push(k - bw)
    if (y < bh - 1) push(k + bw)
  }

  const bits = new Uint8Array(bw * bh)
  for (let k = 0; k < bits.length; k++) bits[k] = bgReached[k] ? 0 : 1
  return { bw, bh, size: { w, h }, bits }
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, z) => a - z)
  const mid = s.length >> 1
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

/** 座標が馬体の上か。tolerance はブロック単位の許容（輪郭のにじみ吸収）。 */
export function isOnHorse(mask: Mask, x: number, y: number, tolerance = 1): boolean {
  const bx = Math.floor(x / BLOCK)
  const by = Math.floor(y / BLOCK)
  for (let dy = -tolerance; dy <= tolerance; dy++) {
    for (let dx = -tolerance; dx <= tolerance; dx++) {
      const nx = bx + dx
      const ny = by + dy
      if (nx < 0 || ny < 0 || nx >= mask.bw || ny >= mask.bh) continue
      if (mask.bits[ny * mask.bw + nx]) return true
    }
  }
  return false
}

export function serialize(mask: Mask): string {
  return Buffer.from(mask.bits).toString('base64')
}

export function coverage(mask: Mask): number {
  let on = 0
  for (const v of mask.bits) on += v
  return on / mask.bits.length
}
