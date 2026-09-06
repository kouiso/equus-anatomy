/**
 * ブロックマスクから輪郭ポリゴンを取り出す。
 * 領域を手で描かず「馬体そのものの輪郭を切り出す」ことで、
 * 人の判断は切り取り線だけに限定される。輪郭は実測のまま。
 */
import { BLOCK, type Mask } from './silhouette'
import { pointInPolygon } from '../src/core/hit-test'
import type { Point, Polygon } from '../src/core/types'

export type Grid = { bw: number; bh: number; bits: Uint8Array }

/** マスクを切り取り多角形（画像px）で削る。 */
export function clip(mask: Mask, roi: Polygon): Grid {
  const bits = new Uint8Array(mask.bw * mask.bh)
  for (let by = 0; by < mask.bh; by++) {
    for (let bx = 0; bx < mask.bw; bx++) {
      if (!mask.bits[by * mask.bw + bx]) continue
      const p: Point = [bx * BLOCK + BLOCK / 2, by * BLOCK + BLOCK / 2]
      if (pointInPolygon(p, roi)) bits[by * mask.bw + bx] = 1
    }
  }
  return { bw: mask.bw, bh: mask.bh, bits }
}

/** 一番大きい連結成分だけ残す。切り取りで飛び散った小片を捨てる。 */
export function largestComponent(g: Grid): Grid {
  const seen = new Int32Array(g.bw * g.bh).fill(-1)
  let best = -1
  let bestSize = 0
  let label = 0
  for (let i = 0; i < g.bits.length; i++) {
    if (!g.bits[i] || seen[i]! >= 0) continue
    const stack = [i]
    seen[i] = label
    let size = 0
    while (stack.length) {
      const k = stack.pop()!
      size++
      const x = k % g.bw
      const y = (k / g.bw) | 0
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= g.bw || ny >= g.bh) continue
        const nk = ny * g.bw + nx
        if (g.bits[nk] && seen[nk]! < 0) {
          seen[nk] = label
          stack.push(nk)
        }
      }
    }
    if (size > bestSize) {
      bestSize = size
      best = label
    }
    label++
  }
  const bits = new Uint8Array(g.bits.length)
  for (let i = 0; i < bits.length; i++) if (seen[i] === best) bits[i] = 1
  return { bw: g.bw, bh: g.bh, bits }
}

/** Moore 近傍による境界追跡。ブロック格子の外周を反時計回りに拾う。 */
export function traceContour(g: Grid): Polygon {
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= g.bw || y >= g.bh ? 0 : g.bits[y * g.bw + x]!)
  let sx = -1
  let sy = -1
  outer: for (let y = 0; y < g.bh; y++) {
    for (let x = 0; x < g.bw; x++) {
      if (at(x, y)) {
        sx = x
        sy = y
        break outer
      }
    }
  }
  if (sx < 0) return []

  // 8近傍を時計回りに並べたもの
  const N: readonly (readonly [number, number])[] = [
    [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1],
  ]
  const out: Point[] = []
  let cx = sx
  let cy = sy
  let dir = 6 // 上から入ってきた想定
  const limit = g.bw * g.bh * 8
  for (let step = 0; step < limit; step++) {
    out.push([cx * BLOCK + BLOCK / 2, cy * BLOCK + BLOCK / 2])
    let found = false
    for (let i = 0; i < 8; i++) {
      const d = (dir + 6 + i) % 8
      const [dx, dy] = N[d]!
      if (at(cx + dx, cy + dy)) {
        cx += dx
        cy += dy
        dir = d
        found = true
        break
      }
    }
    if (!found) break
    if (cx === sx && cy === sy && out.length > 2) break
  }
  return out
}

/** Ramer-Douglas-Peucker。頂点を減らして扱いやすい多角形にする。 */
export function simplify(poly: Polygon, epsilon: number): Polygon {
  if (poly.length < 3) return poly
  const keep = new Uint8Array(poly.length)
  keep[0] = 1
  keep[poly.length - 1] = 1
  const stack: [number, number][] = [[0, poly.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()!
    let far = -1
    let maxD = epsilon
    for (let i = a + 1; i < b; i++) {
      const d = perpendicular(poly[i]!, poly[a]!, poly[b]!)
      if (d > maxD) {
        maxD = d
        far = i
      }
    }
    if (far >= 0) {
      keep[far] = 1
      stack.push([a, far], [far, b])
    }
  }
  return poly.filter((_, i) => keep[i] === 1)
}

function perpendicular(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy)
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len
}

/** 切り取り → 最大成分 → 輪郭 → 簡略化 をまとめて。 */
export function regionFromMask(mask: Mask, roi: Polygon, epsilon = 12): Polygon {
  return simplify(traceContour(largestComponent(clip(mask, roi))), epsilon)
}
