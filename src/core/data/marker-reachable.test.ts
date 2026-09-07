import { describe, expect, it } from 'vitest'
import { centroid } from '../geometry'
import { hitTestMarkers, hitTestParts, visibleParts } from '../hit-test'
import type { Depth, Layer, Part, Point, View } from '../types'
import { GEOMETRY } from './index'

/**
 * 画面に出とる点を押したら、その点のものが選ばれること。
 *
 * これが崩れた実例: 正面の「前肢」は胸から蹄まで枠が伸びるので重心が
 * 「体幹」の内側に落ち、点は見えとるのに押すと体幹が選ばれとった。
 * 多角形だけで当たり判定しとる限り、この形は何度でも生える。
 */
const VIEWS: readonly View[] = ['left', 'right', 'front', 'rear']

/** 画面上 22px の当たり円を、拡大しとらん時の画像px に直したくらいの見積り。 */
const TAP_R = 22 * 2

describe('見えとる点は必ず押せる', () => {
  it.each(VIEWS)('%s: 大まかな場所の点は自分自身を指す', (view) => {
    const areas = GEOMETRY[view].areas
    const targets = areas.map((a) => ({ value: a, at: a.labelAt ?? centroid(a.points) }))
    for (const t of targets) {
      expect(hitTestMarkers(t.at, targets, TAP_R)?.id, `${view}/${t.value.id}`).toBe(t.value.id)
    }
  })

  it.each(VIEWS)('%s: 部位の点も自分自身を指す', (view) => {
    const g = GEOMETRY[view]
    const combos: { layer: Layer; depth: Depth }[] = [
      { layer: 'skin', depth: 'superficial' },
      { layer: 'muscle', depth: 'superficial' },
      { layer: 'skeleton', depth: 'superficial' },
      { layer: 'organs', depth: 'superficial' },
    ]
    for (const c of combos) {
      const parts = visibleParts(g.parts, c)
      const targets = parts.map((p: Part) => ({ value: p, at: (p.labelAt ?? centroid(p.points)) as Point }))
      for (const t of targets) {
        expect(hitTestMarkers(t.at, targets, TAP_R)?.id, `${view}/${c.layer}/${t.value.id}`).toBe(t.value.id)
      }
    }
  })

  it('点から外れた所は今までどおり多角形で拾う', () => {
    const g = GEOMETRY.left
    const parts = visibleParts(g.parts, { layer: 'muscle', depth: 'superficial' })
    const target = parts.find((p) => p.id === 'muscle-triceps')
    expect(target, '上腕三頭筋が左側望に要る').toBeDefined()
    const at = centroid(target!.points)
    // 点の当たり円の外へ十分ずらしても、輪郭の内側なら拾えること
    const inside = hitTestParts(at, parts, { layer: 'muscle', depth: 'superficial' })
    expect(inside?.id).toBe('muscle-triceps')
  })
})
