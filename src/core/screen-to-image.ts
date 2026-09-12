import type { Point, Size, ViewBox } from './types'

/**
 * preserveAspectRatio="xMidYMid meet" のレターボックスを再現する。
 * markerScale() が返す k はこの scale の逆数。片方を変えたら必ずもう片方も変える。
 * renderer が RN でも Web でも、ここを通せばタップ位置の解釈が揃う。
 */
function letterbox(viewBox: ViewBox, container: Size): { scale: number; ox: number; oy: number } {
  if (container.w <= 0 || container.h <= 0 || viewBox.w <= 0 || viewBox.h <= 0) return { scale: 1, ox: 0, oy: 0 }
  const scale = Math.min(container.w / viewBox.w, container.h / viewBox.h)
  return { scale, ox: (container.w - viewBox.w * scale) / 2, oy: (container.h - viewBox.h * scale) / 2 }
}

/** コンテナ内の座標（CSS px） → 画像 px。getScreenCTM の代わり。 */
export function screenToImage(pt: Point, viewBox: ViewBox, container: Size): Point {
  const { scale, ox, oy } = letterbox(viewBox, container)
  return [viewBox.x + (pt[0] - ox) / scale, viewBox.y + (pt[1] - oy) / scale]
}

/** 画像 px → コンテナ内の座標（CSS px）。テストとラベル配置の検算用。 */
export function imageToScreen(pt: Point, viewBox: ViewBox, container: Size): Point {
  const { scale, ox, oy } = letterbox(viewBox, container)
  return [ox + (pt[0] - viewBox.x) * scale, oy + (pt[1] - viewBox.y) * scale]
}
