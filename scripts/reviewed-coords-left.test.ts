import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { pointInPolygon } from '../src/core/hit-test'
import type { CoordSource, Point, Polygon } from '../src/core/types'
import { checkAnchor, checkPolygon, maskFromEntry } from './coord-gate'
import { REVIEWED_AREAS_LEFT, REVIEWED_SKIN_PARTS_LEFT } from './reviewed-coords-left'

const targetPoints: Polygon = [
  [551, 1057],
  [566, 1062],
  [583, 1069],
  [603, 1079],
  [600, 1087],
  [595, 1093],
  [585, 1097],
  [565, 1099],
  [544, 1099],
  [532, 1097],
  [528, 1093],
  [532, 1085],
]
const targetLabelAt: Point = [568, 1078]
const targetSource: CoordSource = 'draft'

const region = JSON.parse(readFileSync('src/core/data/regions/left.json', 'utf8')) as {
  size: { w: number; h: number }
  measuredOn: string
  images: Record<string, { src: string }>
  parts: { id: string; layer: string; points: Polygon; labelAt?: Point; source?: CoordSource }[]
  areas: { id: string; points: Polygon; labelAt?: Point; source?: CoordSource }[]
}
const silhouette = JSON.parse(readFileSync('src/core/data/silhouettes.json', 'utf8')) as {
  entries: { file: string; bw: number; bh: number; size: { w: number; h: number }; mask: string }[]
}
const skinHoof = region.parts.find((part) => part.id === 'skin-hoof')!
const hoofPoints = (): Polygon => {
  const reviewed = REVIEWED_SKIN_PARTS_LEFT['skin-hoof']!
  if (!('points' in reviewed)) throw new Error('skin-hoof は頂点ごと固定する')
  return reviewed.points
}
const measuredFile = region.images[region.measuredOn]!.src.split('/').at(-1)!
const measuredMask = maskFromEntry(silhouette.entries.find((entry) => entry.file === measuredFile)!)

function orientation(a: Point, b: Point, c: Point): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
}

function onSegment(a: Point, b: Point, p: Point): boolean {
  return (
    p[0] >= Math.min(a[0], b[0]) &&
    p[0] <= Math.max(a[0], b[0]) &&
    p[1] >= Math.min(a[1], b[1]) &&
    p[1] <= Math.max(a[1], b[1])
  )
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const o1 = orientation(a, b, c)
  const o2 = orientation(a, b, d)
  const o3 = orientation(c, d, a)
  const o4 = orientation(c, d, b)
  if (o1 * o2 < 0 && o3 * o4 < 0) return true
  return (
    (o1 === 0 && onSegment(a, b, c)) ||
    (o2 === 0 && onSegment(a, b, d)) ||
    (o3 === 0 && onSegment(c, d, a)) ||
    (o4 === 0 && onSegment(c, d, b))
  )
}

function isSimplePolygon(points: Polygon): boolean {
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (j === i + 1 || (i === 0 && j === points.length - 1)) continue
      if (segmentsIntersect(points[i]!, points[(i + 1) % points.length]!, points[j]!, points[(j + 1) % points.length]!)) {
        return false
      }
    }
  }
  return true
}

describe('左側望のレビュー済み蹄座標', () => {
  it('left.json とレビュー座標が目標値に一致する', () => {
    const reviewed = REVIEWED_SKIN_PARTS_LEFT['skin-hoof']!
    expect(skinHoof.id).toBe('skin-hoof')
    expect(skinHoof.layer).toBe('skin')
    expect({ points: skinHoof.points, labelAt: skinHoof.labelAt, source: skinHoof.source }).toEqual({
      points: hoofPoints(),
      labelAt: reviewed.labelAt,
      source: reviewed.source,
    })
    expect({ points: hoofPoints(), labelAt: reviewed.labelAt, source: reviewed.source }).toEqual({
      points: targetPoints,
      labelAt: targetLabelAt,
      source: targetSource,
    })
  })

  it('自己交差のない単純ポリゴンである', () => {
    expect(isSimplePolygon(hoofPoints())).toBe(true)
  })

  it('レビュー対象の7点が意図した内外判定になる', () => {
    const points = hoofPoints()
    for (const inside of [[568, 1078], [531, 1093], [599, 1081]] as const) {
      expect(pointInPolygon(inside, points), `${inside}`).toBe(true)
    }
    for (const outside of [[580, 1060], [550, 1103], [665, 1060], [588, 1058]] as const) {
      expect(pointInPolygon(outside, points), `${outside}`).toBe(false)
    }
  })

  it('measuredOn マスクで座標と labelAt がゲートを通る', () => {
    const reviewed = REVIEWED_SKIN_PARTS_LEFT['skin-hoof']!
    expect(
      checkPolygon({
        mask: measuredMask,
        size: region.size,
        kind: 'part',
        id: 'skin-hoof',
        points: hoofPoints(),
      }),
    ).toEqual([])
    expect(checkAnchor({ kind: 'part', id: 'skin-hoof', points: hoofPoints(), labelAt: reviewed.labelAt })).toEqual([])
  })
})

describe('左側望のレビュー済み手修正座標の集約', () => {
  it('手修正座標はこのファイルに集まっている', () => {
    expect(Object.keys(REVIEWED_SKIN_PARTS_LEFT)).toEqual(['skin-hoof', 'skin-tail'])
    expect(Object.keys(REVIEWED_AREAS_LEFT)).toEqual(['tail'])
  })

  it.each(Object.entries(REVIEWED_SKIN_PARTS_LEFT))('部位 %s が left.json と一致する', (id, reviewed) => {
    const committed = region.parts.find((part) => part.id === id)
    expect(committed, id).toBeDefined()
    expect(committed!.labelAt).toEqual(reviewed.labelAt)
    expect(committed!.source).toEqual(reviewed.source)
    if ('points' in reviewed) expect(committed!.points).toEqual(reviewed.points)
    expect(checkAnchor({ kind: 'part', id, points: committed!.points, labelAt: reviewed.labelAt })).toEqual([])
  })

  it.each(Object.entries(REVIEWED_AREAS_LEFT))('エリア %s が left.json と一致する', (id, reviewed) => {
    const committed = region.areas.find((area) => area.id === id)
    expect(committed, id).toBeDefined()
    expect(committed!.points).toEqual(reviewed.points)
    expect(committed!.labelAt).toEqual(reviewed.labelAt)
    expect(checkAnchor({ kind: 'area', id, points: reviewed.points, labelAt: reviewed.labelAt })).toEqual([])
  })
})
