import { bbox } from './geometry'
import { nearestOnHorse, onHorse } from './mask'
import type { HorseMask, Point, Polygon, Size, ViewBox } from './types'

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

/**
 * はみ出しを許さず、画像の中に収める。
 * mask（実測の馬体範囲）を渡すと、画面の中心が必ず馬体の上に留まるよう
 * もう一段絞る。中心が馬体の上なら絵は絶対に全部は消えん。
 *
 * なぜ矩形（frame や部位 union の bbox）やのうてマスクか: 左側望では
 * 脚の間・首の下に大きな黒い凹みがあり、それらは矩形の「内側」やから
 * 矩形へ絞っても真っ黒な画面に届く（#65）。実測マスクは凹みを「外」と
 * 数えるので、この制限だけが意味を持つ。
 */
export function clamp(vb: ViewBox, size: Size, mask?: HorseMask): ViewBox {
  const maxW = size.w / MIN_ZOOM
  const minW = size.w / MAX_ZOOM
  const { w, h } = lockAspect(Math.min(maxW, Math.max(minW, vb.w)), size)
  let x = Math.min(Math.max(0, vb.x), size.w - w)
  let y = Math.min(Math.max(0, vb.y), size.h - h)
  if (mask !== undefined && !onHorse(mask, x + w / 2, y + h / 2)) {
    // viewBox の中心として実現できる範囲（画像をはみ出さん範囲）の中でだけ
    // 馬体を探す。この中に馬体が無い——全体表示のように中心が動かせん
    // 時——は、画像側の答えがそのまま残る。
    const at = nearestOnHorse(mask, x + w / 2, y + h / 2, {
      x: w / 2,
      y: h / 2,
      w: size.w - w,
      h: size.h - h,
    })
    if (at !== null) {
      x = Math.min(Math.max(0, at[0] - w / 2), size.w - w)
      y = Math.min(Math.max(0, at[1] - h / 2), size.h - h)
    }
  }
  return { x, y, w, h }
}

/** anchor（ユーザー座標）を画面上の同じ位置に留めたまま拡大縮小する。 */
export function zoomAt(vb: ViewBox, anchor: Point, factor: number, size: Size, mask?: HorseMask): ViewBox {
  const target = lockAspect(vb.w / factor, size)
  const rx = vb.w === 0 ? 0.5 : (anchor[0] - vb.x) / vb.w
  const ry = vb.h === 0 ? 0.5 : (anchor[1] - vb.y) / vb.h
  return clamp(
    { x: anchor[0] - rx * target.w, y: anchor[1] - ry * target.h, w: target.w, h: target.h },
    size,
    mask,
  )
}

/** ボタン用。中心を保ったまま倍率だけ動かす。 */
export function zoomByStep(vb: ViewBox, factor: number, size: Size, mask?: HorseMask): ViewBox {
  return zoomAt(vb, [vb.x + vb.w / 2, vb.y + vb.h / 2], factor, size, mask)
}

export function pan(vb: ViewBox, dxUser: number, dyUser: number, size: Size, mask?: HorseMask): ViewBox {
  return clamp({ ...vb, x: vb.x - dxUser, y: vb.y - dyUser }, size, mask)
}

/** 大まかな場所をタップした時に、その領域へ寄る。 */
export function zoomToPolygon(poly: Polygon, size: Size, padding = 0.25, mask?: HorseMask): ViewBox {
  return zoomToBox(bbox(poly), size, padding, mask)
}

/**
 * 複数の領域をまとめて収める。
 * 場所を選んだ時は「その場所の輪郭」やのうて「そこに出る部位の範囲」に寄せる。
 * 前肢のように縦に長い場所は輪郭に合わせると画像全体に戻ってしまい、寄る意味がなくなる。
 */
export function zoomToPolygons(polys: readonly Polygon[], size: Size, padding = 0.2, mask?: HorseMask): ViewBox {
  const boxes = polys.filter((p) => p.length >= 3).map(bbox)
  if (boxes.length === 0) return fit(size)
  const x = Math.min(...boxes.map((b) => b.x))
  const y = Math.min(...boxes.map((b) => b.y))
  const x2 = Math.max(...boxes.map((b) => b.x + b.w))
  const y2 = Math.max(...boxes.map((b) => b.y + b.h))
  return zoomToBox({ x, y, w: x2 - x, h: y2 - y }, size, padding, mask)
}

function zoomToBox(b: ViewBox, size: Size, padding: number, mask?: HorseMask): ViewBox {
  const wanted = Math.max(b.w, (b.h * size.w) / size.h) * (1 + padding * 2)
  const target = lockAspect(Math.max(size.w / MAX_ZOOM, Math.min(size.w, wanted)), size)
  return clamp(
    { x: b.x + b.w / 2 - target.w / 2, y: b.y + b.h / 2 - target.h / 2, w: target.w, h: target.h },
    size,
    mask,
  )
}

/**
 * ピンチ。2本指の中点をアンカーにして、指の距離の比をそのまま倍率にする。
 * 中点は「今の viewBox で」ユーザー座標に直したものを渡す。
 */
export function pinch(vb: ViewBox, midpoint: Point, distanceRatio: number, size: Size, mask?: HorseMask): ViewBox {
  if (!Number.isFinite(distanceRatio) || distanceRatio <= 0) return vb
  return zoomAt(vb, midpoint, distanceRatio, size, mask)
}
