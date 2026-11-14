import { GEOMETRY } from './data'
import { bbox } from './geometry'
import type { Translator } from './i18n'
import { partDrawableIn } from './map-entry'
import { plateIdOf } from './types'
import type { Depth, ImageRef, Layer, Part, PlateId, Size, Structure, View, ViewBox, ViewGeometry } from './types'

/**
 * 図鑑の詳細に置く「位置の小図」(#272)。
 *
 * 小図は押すと「解剖図で位置を見る」と同じ所へ移る。小図と着地先の絵が食い違うと
 * 「ここだと思ったのに別の所が開いた」になるので、出す条件は canOpenOnMap と同じ
 * （partDrawableIn）、向きは mappableViews の先頭（focusAnatomyPart と同じ）にする。
 * 座標は今ある GEOMETRY だけを使い、ここでは足さない。
 */
export type LocationMap = {
  readonly view: View
  readonly layer: Layer
  readonly depth: Depth
  readonly plate: PlateId
  readonly image: ImageRef
  readonly part: Part
  /** 右側望は左側望の絵を反転して使う。座標はデータ側で反転済みなので絵だけ裏返す。 */
  readonly mirrored: boolean
  /** 下書きの座標。測った値と区別するため、解剖図と同じく破線で描く。 */
  readonly draft: boolean
}

/** 小図を出せない部位（位置未登録・プレートの絵が無い）は null。 */
export function locationMapOf(
  s: Structure,
  geometries: Readonly<Record<View, ViewGeometry>> = GEOMETRY,
): LocationMap | null {
  const view = s.views.find((v) => partDrawableIn(geometries[v], s))
  if (view === undefined) return null
  const geometry = geometries[view]
  const part = geometry.parts.find((p) => p.id === s.id)
  const depth = s.depth ?? 'superficial'
  const plate = plateIdOf(s.layer, depth)
  const image = geometry.images[plate]
  // partDrawableIn が両方の存在を保証しているが、型の上でも絞っておく
  if (part === undefined || image === undefined) return null
  return { view, layer: s.layer, depth, plate, image, part, mirrored: view === 'right', draft: part.source === 'draft' }
}

/**
 * target を余白つきで含み、縦横比が aspect で、可能なら bounds（画像）の内側に収まる viewBox。
 * 画像の外を映すと背景色の帯が出るので、収まる限りは内側へ寄せる。
 */
export function fitViewBox(target: ViewBox, aspect: number, bounds: Size, padRatio = 0.06): ViewBox {
  if (!Number.isFinite(aspect) || aspect <= 0) return target
  const padX = target.w * padRatio
  const padY = target.h * padRatio
  let { x, y, w, h } = { x: target.x - padX, y: target.y - padY, w: target.w + padX * 2, h: target.h + padY * 2 }
  if (w / h < aspect) {
    const nw = h * aspect
    x -= (nw - w) / 2
    w = nw
  } else {
    const nh = w / aspect
    y -= (nh - h) / 2
    h = nh
  }
  if (w <= bounds.w) x = Math.min(Math.max(x, 0), bounds.w - w)
  if (h <= bounds.h) y = Math.min(Math.max(y, 0), bounds.h - h)
  return { x, y, w, h }
}

/**
 * 小図の viewBox。馬体の外接枠と部位を両方含める（部位だけに寄ると馬体のどこか分からん）。
 * 小さい部位は小さく写る（デザインの「縮小して描いた」）。
 */
export function locationMapViewBox(map: LocationMap, geometry: ViewGeometry, aspect: number): ViewBox {
  const frame = bbox(geometry.frame)
  const part = bbox(map.part.points)
  const x0 = Math.min(frame.x, part.x)
  const y0 = Math.min(frame.y, part.y)
  const x1 = Math.max(frame.x + frame.w, part.x + part.w)
  const y1 = Math.max(frame.y + frame.h, part.y + part.h)
  return fitViewBox({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, aspect, geometry.size)
}

/** 小図の下の1行。「左側望 · 筋肉 · 破線は下書きの位置」 */
export function locationMapCaption(map: LocationMap, t: Translator): string {
  const layer = t(`layer.${map.layer}`) + (map.layer === 'muscle' && map.depth === 'deep' ? t('detail.mapDeep') : '')
  const parts = [t(`view.${map.view}`), layer]
  if (map.draft) parts.push(t('detail.mapDraft'))
  return parts.join(' · ')
}
