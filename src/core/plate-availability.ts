import type { Depth, Layer, ViewGeometry } from './types'
import { plateIdOf } from './types'

/**
 * 「条件（層・深さ）→ 図があるか」の判定をここへ寄せる。
 * UI がそれぞれ geometry.images を直接読むと、筋肉だけ深さで絵が分かれる
 * ルールの解釈が画面ごとにずれる。図の無い条件を選ばせない・適用させない
 * 判断は全部この関数群を通す（Issue #64）。
 */

/** その層が深さで図を分けるか。今は筋肉だけ（表層筋・深層筋）。 */
export function layerHasDepth(layer: Layer): boolean {
  return layer === 'muscle'
}

/** その向きで、その層・深さの図が登録済みか。筋肉以外の層は深さを見ない。 */
export function hasPlate(geometry: ViewGeometry, layer: Layer, depth: Depth): boolean {
  return geometry.images[plateIdOf(layer, depth)] !== undefined
}

/**
 * その向きで、層として図が1枚でもあるか。
 * 筋肉は表層・深層どちらかあれば層を選んでよい（深さは fallbackDepth が有効な方へ寄せる）。
 */
export function hasLayerPlate(geometry: ViewGeometry, layer: Layer): boolean {
  if (layerHasDepth(layer)) {
    return hasPlate(geometry, 'muscle', 'superficial') || hasPlate(geometry, 'muscle', 'deep')
  }
  return hasPlate(geometry, layer, 'superficial')
}

/**
 * 選んだ深さの図が無いとき、図のある深さへ寄せる。表層筋から先に試す
 * （画像は表層から揃う前提）。どちらも無ければ元の値を返すので、
 * 呼び出し側は hasPlate で適用可否を別途判定すること。
 */
export function fallbackDepth(geometry: ViewGeometry, depth: Depth): Depth {
  if (hasPlate(geometry, 'muscle', depth)) return depth
  const order: readonly Depth[] = ['superficial', 'deep']
  return order.find((candidate) => hasPlate(geometry, 'muscle', candidate)) ?? depth
}

/**
 * 条件（層・深さ）を実際に出せる深さへ正規化する。深さで図が分かれる層だけ
 * fallbackDepth で寄せ、それ以外の層は深さをそのまま通す（深さを持たないので触らない）。
 * 層・向きを替えるとき、表示用に深さを決めるとき、適用するときは全部ここを通す（Issue #254 R2）。
 */
export function normalizeDepth(geometry: ViewGeometry, layer: Layer, depth: Depth): Depth {
  return layerHasDepth(layer) ? fallbackDepth(geometry, depth) : depth
}
