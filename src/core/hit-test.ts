import { area } from './geometry'
import type { Area, Depth, Layer, Part, Point, Polygon } from './types'

/**
 * レイキャスティング。境界上の点は「内側」として扱う。
 * ブラウザの pointer-events に頼らんのは、react-native-skia でも同じ判定を出すため。
 * 判定を1箇所に集めておけば、テストも1本で済むし renderer を替えても挙動が変わらん。
 */
export function pointInPolygon(pt: Point, poly: Polygon): boolean {
  if (poly.length < 3) return false
  const [px, py] = pt
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!
    const b = poly[j]!
    if (onSegment(pt, a, b)) return true
    const intersects = a[1] > py !== b[1] > py && px < ((b[0] - a[0]) * (py - a[1])) / (b[1] - a[1]) + a[0]
    if (intersects) inside = !inside
  }
  return inside
}

function onSegment(p: Point, a: Point, b: Point): boolean {
  const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
  if (Math.abs(cross) > 1e-9) return false
  const dot = (p[0] - a[0]) * (p[0] - b[0]) + (p[1] - a[1]) * (p[1] - b[1])
  return dot <= 1e-9
}

export type PartFilter = { readonly layer: Layer; readonly depth?: Depth }

export function visibleParts(parts: readonly Part[], filter: PartFilter): readonly Part[] {
  return parts.filter((p) => {
    if (p.layer !== filter.layer) return false
    // 深さは筋肉だけの概念。持たん部位は層が一致すれば出す。
    if (p.depth === undefined) return true
    return p.depth === filter.depth
  })
}

/**
 * 一番小さい領域を返す。大きい領域の中に小さい部位が入っとる時、
 * 素直に「最後に描いたもの」を取ると描画順で結果が変わってしまう。
 */
export function hitTestParts(pt: Point, parts: readonly Part[], filter: PartFilter): Part | null {
  let best: Part | null = null
  let bestArea = Infinity
  for (const part of visibleParts(parts, filter)) {
    if (!pointInPolygon(pt, part.points)) continue
    const a = area(part.points)
    if (a < bestArea) {
      best = part
      bestArea = a
    }
  }
  return best
}

export function hitTestAreas(pt: Point, areas: readonly Area[]): Area | null {
  let best: Area | null = null
  let bestArea = Infinity
  for (const a of areas) {
    if (!pointInPolygon(pt, a.points)) continue
    const size = area(a.points)
    if (size < bestArea) {
      best = a
      bestArea = size
    }
  }
  return best
}

/**
 * 画面に出とる点そのものを当たり判定にする。
 *
 * 領域や部位の多角形だけで判定すると、大きい図形の重心が小さい図形の内側に
 * 落ちた時に「見えとる点を押しても別のものが選ばれる」状態になる（正面の前肢が
 * 体幹の中に埋まっとった）。人が狙うのは点なので、点を最優先で拾う。
 *
 * radius は画像px。画面上の半径を markerScale で画像px に直して渡す。
 */
export function hitTestMarkers<T>(
  pt: Point,
  markers: readonly { readonly value: T; readonly at: Point }[],
  radius: number,
): T | null {
  let best: T | null = null
  let bestDist = radius
  for (const m of markers) {
    const d = Math.hypot(pt[0] - m.at[0], pt[1] - m.at[1])
    if (d <= bestDist) {
      best = m.value
      bestDist = d
    }
  }
  return best
}
