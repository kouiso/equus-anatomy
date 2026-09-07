import { flipPointX, flipX } from '../geometry'
import type { Area, CoordSource, Depth, ImageRef, Part, PlateId, Point, Polygon, Size, View, ViewGeometry } from '../types'
import left from './regions/left.json'
import front from './regions/front.json'
import rear from './regions/rear.json'

type RawPolygon = number[][]
type RawGeometry = {
  view: string
  size: Size
  images: Record<string, ImageRef>
  measuredOn: string
  frame: RawPolygon
  areas: { id: string; nameJa: string; points: RawPolygon; labelAt?: number[]; source?: string }[]
  parts: { id: string; layer: string; depth?: string; points: RawPolygon; labelAt?: number[]; source?: string }[]
}

/** 出どころが書いてへん座標は下書き扱い。測った証拠が無いものを measured と名乗らせん。 */
function asSource(v: string | undefined): CoordSource {
  return v === 'measured' ? 'measured' : 'draft'
}

function toPolygon(raw: RawPolygon): Polygon {
  return raw.map((p) => [p[0] ?? 0, p[1] ?? 0] as Point)
}

function parse(raw: unknown): ViewGeometry {
  const r = raw as RawGeometry
  return {
    view: r.view as View,
    size: r.size,
    images: r.images as Readonly<Partial<Record<PlateId, ImageRef>>>,
    measuredOn: r.measuredOn as PlateId,
    frame: toPolygon(r.frame),
    areas: r.areas.map((a): Area => {
      const base: Area = { id: a.id, nameJa: a.nameJa, points: toPolygon(a.points), source: asSource(a.source) }
      return a.labelAt === undefined ? base : { ...base, labelAt: [a.labelAt[0] ?? 0, a.labelAt[1] ?? 0] as Point }
    }),
    parts: r.parts.map((p): Part => {
      const base: Part = { id: p.id, layer: p.layer as Part['layer'], points: toPolygon(p.points), source: asSource(p.source) }
      const withDepth: Part = p.depth === undefined ? base : { ...base, depth: p.depth as Depth }
      return p.labelAt === undefined
        ? withDepth
        : { ...withDepth, labelAt: [p.labelAt[0] ?? 0, p.labelAt[1] ?? 0] as Point }
    }),
  }
}

/**
 * 右側望は左側望の画像を左右反転して使う。座標も同じ式で反転する。
 * 反転を描画側の transform に任せると当たり判定と食い違うので、データを作る時点で反転しておく。
 */
function mirrorPart(p: Part, w: number): Part {
  // exactOptionalPropertyTypes 下ではスプレッドで optional を運ぶと undefined が混じる。
  // 省略可能な項目は「あるときだけ足す」形で組み直す。
  const base: Part = { id: p.id, layer: p.layer, points: flipX(p.points, w), source: p.source }
  const withDepth: Part = p.depth === undefined ? base : { ...base, depth: p.depth }
  return p.labelAt === undefined ? withDepth : { ...withDepth, labelAt: flipPointX(p.labelAt, w) }
}

function mirror(g: ViewGeometry): ViewGeometry {
  const w = g.size.w
  return {
    ...g,
    view: 'right',
    frame: flipX(g.frame, w),
    areas: g.areas.map((a): Area => {
      const base: Area = { id: a.id, nameJa: a.nameJa, points: flipX(a.points, w), source: a.source }
      return a.labelAt === undefined ? base : { ...base, labelAt: flipPointX(a.labelAt, w) }
    }),
    parts: g.parts.map((p) => mirrorPart(p, w)),
  }
}

const LEFT = parse(left)

export const GEOMETRY: Readonly<Record<View, ViewGeometry>> = {
  left: LEFT,
  right: mirror(LEFT),
  front: parse(front),
  rear: parse(rear),
}

export function geometryOf(view: View): ViewGeometry {
  return GEOMETRY[view]
}

export { STRUCTURES, STRUCTURE_BY_ID } from './structures'
