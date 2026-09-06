import type { Point, Polygon, Size, ViewBox } from './types'

/** 面積重み付き重心。頂点の平均やと辺の密なところへ引っ張られる。 */
export function centroid(poly: Polygon): Point {
  if (poly.length === 0) throw new Error('centroid: 空のポリゴン')
  if (poly.length < 3) {
    let sx = 0
    let sy = 0
    for (const p of poly) {
      sx += p[0]
      sy += p[1]
    }
    return [sx / poly.length, sy / poly.length]
  }
  let a2 = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!
    const q = poly[(i + 1) % poly.length]!
    const cross = p[0] * q[1] - q[0] * p[1]
    a2 += cross
    cx += (p[0] + q[0]) * cross
    cy += (p[1] + q[1]) * cross
  }
  // 自己交差や退化で面積0になった時は頂点平均へ落とす
  if (a2 === 0) {
    let sx = 0
    let sy = 0
    for (const p of poly) {
      sx += p[0]
      sy += p[1]
    }
    return [sx / poly.length, sy / poly.length]
  }
  return [cx / (3 * a2), cy / (3 * a2)]
}

/** 符号なし面積。入れ子の領域から一番小さいものを選ぶのに使う。 */
export function area(poly: Polygon): number {
  if (poly.length < 3) return 0
  let a2 = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!
    const q = poly[(i + 1) % poly.length]!
    a2 += p[0] * q[1] - q[0] * p[1]
  }
  return Math.abs(a2) / 2
}

export function bbox(poly: Polygon): ViewBox {
  if (poly.length === 0) throw new Error('bbox: 空のポリゴン')
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of poly) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

/** 右側望は左側望の画像を反転して使い回す。座標も同じ式で反転する。 */
export function flipX(poly: Polygon, width: number): Polygon {
  return poly.map(([x, y]) => [width - x, y] as Point)
}

export function flipPointX(p: Point, width: number): Point {
  return [width - p[0], p[1]]
}

/** ポリゴン → SVG path。当たり判定は不可視なので直線で足りる。 */
export function toPath(poly: Polygon): string {
  if (poly.length === 0) return ''
  const head = poly[0]!
  let d = `M ${round(head[0])} ${round(head[1])}`
  for (let i = 1; i < poly.length; i++) {
    const p = poly[i]!
    d += ` L ${round(p[0])} ${round(p[1])}`
  }
  return `${d} Z`
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

export function viewBoxToString(vb: ViewBox): string {
  return `${vb.x} ${vb.y} ${vb.w} ${vb.h}`
}

/**
 * マーカーとラベルを「画面上で常に同じ CSS px」に保つための倍率。
 *
 * vector-effect="non-scaling-stroke" は線の太さにしか効かん（円の半径も文字サイズも効かんし、
 * non-scaling-size はどのブラウザも未実装）。せやから自前で逆スケールを掛けるしかない。
 *
 * ズームだけやのうてコンテナ幅も式に入れとるのが肝。
 * 1600 幅の絵を 375px のスマホに出すと 0.23 倍になるので、
 * ズームだけ見て補正しても点と文字は小さいままになる。元アプリがそうなっとった。
 *
 * preserveAspectRatio="xMidYMid meet" なので実効倍率は幅と高さの小さい方。
 */
export function markerScale(vb: ViewBox, container: { w: number; h: number }): number {
  if (container.w <= 0 || container.h <= 0 || vb.w <= 0 || vb.h <= 0) return 1
  const pxPerUnit = Math.min(container.w / vb.w, container.h / vb.h)
  return pxPerUnit > 0 ? 1 / pxPerUnit : 1
}

/** 画像実寸に対するズーム倍率。全体表示で 1、寄るほど大きい。 */
export function zoomFactor(size: Size, vb: ViewBox): number {
  return size.w / vb.w
}
