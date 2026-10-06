import { GEOMETRY } from './data'
import { plateIdOf } from './types'
import type { Structure, View, ViewGeometry } from './types'

/**
 * 「図で見る」系の入口を出してよいかの判定。
 *
 * #63: 入口（図鑑の「図」・詳細の「解剖図で位置を見る」・保存の「図で見る」）が
 * 図形の有無を見とらんかったので、位置未登録の部位へ飛ぶと
 * 真っ黒キャンバスか点の無い図の行き止まりに着地した。
 * 入口の判定と着地側の向き選択（focusAnatomyPart）はこの同じ基準を使う。
 */

/**
 * その向きで部位が「絵の上に点つきで」出せるか。
 * 図形があるだけでは足りん。着地は structure の層・深さを使うので、
 * 図形がその条件で描画対象になることと、プレート（層の絵）があることの両方が要る。
 * 絵が無いプレートの上は、点が真っ黒なキャンバスに浮くだけになる。
 */
export function partDrawableIn(geometry: ViewGeometry, s: Structure): boolean {
  const part = geometry.parts.find((p) => p.id === s.id)
  if (part === undefined) return false
  // 着地時の layer/depth は structure 側の値。別の層・深さに置いた図形は出せん
  if (part.layer !== s.layer) return false
  const depth = s.depth ?? 'superficial'
  // 深さを持たん図形はどの深さでも描く（visibleParts と同じ約束）
  if (part.depth !== undefined && part.depth !== depth) return false
  return geometry.images[plateIdOf(s.layer, depth)] !== undefined
}

/** 宣言した向きのうち、実際に部位が出せるもの。空ならどこへ飛んでも点は出ん。 */
export function mappableViews(s: Structure): readonly View[] {
  return s.views.filter((view) => partDrawableIn(GEOMETRY[view], s))
}

/** 解剖図への入口を出してよいか。false なら入口は隠して「準備中」を出す。 */
export function canOpenOnMap(s: Structure): boolean {
  return mappableViews(s).length > 0
}
