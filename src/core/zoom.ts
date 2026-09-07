import { bbox } from './geometry'
import type { Point, Polygon, Size, ViewBox } from './types'

export const MAX_ZOOM = 8
/** 画像全体より引けんようにする。引けると背景の黒が広がるだけで意味がない。 */
export const MIN_ZOOM = 1

/**
 * viewBox のアスペクトは常に画像のアスペクトに固定する。
 * ここがズレると preserveAspectRatio が効いて余白の入り方が変わり、
 * 「画像だけ動いてマーカーが取り残される」ように見える。
 */
function lockAspect(w: number, size: Size): { w: number; h: number } {
  return { w, h: (w * size.h) / size.w }
}

export function fit(size: Size): ViewBox {
  return { x: 0, y: 0, w: size.w, h: size.h }
}

export function scaleOf(vb: ViewBox, size: Size): number {
  return size.w / vb.w
}

/** はみ出しを許さず、画像の中に収める。 */
export function clamp(vb: ViewBox, size: Size): ViewBox {
  const maxW = size.w / MIN_ZOOM
  const minW = size.w / MAX_ZOOM
  const { w, h } = lockAspect(Math.min(maxW, Math.max(minW, vb.w)), size)
  const x = Math.min(Math.max(0, vb.x), size.w - w)
  const y = Math.min(Math.max(0, vb.y), size.h - h)
  return { x, y, w, h }
}

/** anchor（ユーザー座標）を画面上の同じ位置に留めたまま拡大縮小する。 */
export function zoomAt(vb: ViewBox, anchor: Point, factor: number, size: Size): ViewBox {
  const target = lockAspect(vb.w / factor, size)
  const rx = vb.w === 0 ? 0.5 : (anchor[0] - vb.x) / vb.w
  const ry = vb.h === 0 ? 0.5 : (anchor[1] - vb.y) / vb.h
  return clamp({ x: anchor[0] - rx * target.w, y: anchor[1] - ry * target.h, w: target.w, h: target.h }, size)
}

/** ボタン用。中心を保ったまま倍率だけ動かす。 */
export function zoomByStep(vb: ViewBox, factor: number, size: Size): ViewBox {
  return zoomAt(vb, [vb.x + vb.w / 2, vb.y + vb.h / 2], factor, size)
}

export function pan(vb: ViewBox, dxUser: number, dyUser: number, size: Size): ViewBox {
  return clamp({ ...vb, x: vb.x - dxUser, y: vb.y - dyUser }, size)
}

/** 大まかな場所をタップした時に、その領域へ寄る。 */
export function zoomToPolygon(poly: Polygon, size: Size, padding = 0.25): ViewBox {
  return zoomToBox(bbox(poly), size, padding)
}

/**
 * 複数の領域をまとめて収める。
 * 場所を選んだ時は「その場所の輪郭」やのうて「そこに出る部位の範囲」に寄せる。
 * 前肢のように縦に長い場所は輪郭に合わせると画像全体に戻ってしまい、寄る意味がなくなる。
 */
export function zoomToPolygons(polys: readonly Polygon[], size: Size, padding = 0.2): ViewBox {
  const boxes = polys.filter((p) => p.length >= 3).map(bbox)
  if (boxes.length === 0) return fit(size)
  const x = Math.min(...boxes.map((b) => b.x))
  const y = Math.min(...boxes.map((b) => b.y))
  const x2 = Math.max(...boxes.map((b) => b.x + b.w))
  const y2 = Math.max(...boxes.map((b) => b.y + b.h))
  return zoomToBox({ x, y, w: x2 - x, h: y2 - y }, size, padding)
}

function zoomToBox(b: ViewBox, size: Size, padding: number): ViewBox {
  const wanted = Math.max(b.w, (b.h * size.w) / size.h) * (1 + padding * 2)
  const target = lockAspect(Math.max(size.w / MAX_ZOOM, Math.min(size.w, wanted)), size)
  return clamp(
    { x: b.x + b.w / 2 - target.w / 2, y: b.y + b.h / 2 - target.h / 2, w: target.w, h: target.h },
    size,
  )
}

/**
 * ピンチ。2本指の中点をアンカーにして、指の距離の比をそのまま倍率にする。
 * 中点は「今の viewBox で」ユーザー座標に直したものを渡す。
 */
export function pinch(vb: ViewBox, midpoint: Point, distanceRatio: number, size: Size): ViewBox {
  if (!Number.isFinite(distanceRatio) || distanceRatio <= 0) return vb
  return zoomAt(vb, midpoint, distanceRatio, size)
}
