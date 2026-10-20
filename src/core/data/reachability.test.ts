import { describe, expect, it } from 'vitest'
import { centroid, markerScale } from '../geometry'
import { hitTestMarkers, visibleParts } from '../hit-test'
import { imageToScreen, screenToImage } from '../screen-to-image'
import type { Depth, Layer, Part, Point, Size, View, ViewBox } from '../types'
import { fit, MAX_ZOOM, pan, zoomAt } from '../zoom'
import { GEOMETRY } from './index'

/**
 * #175 拡大・移動・反転の後でも、全部の部位を選べること。
 *
 * 画面の当たり判定は anatomy-canvas.tsx の onTap と同じ順で、最初に「見えとる点」を
 * 半径 HIT_R（画面 px）× k で拾う。点の真上を押した時はこの段で決まるので、
 * ここでは その段だけを本物の core 関数で通す。
 * 右側望は左側望を反転したデータ（GEOMETRY.right）で、反転の確認を兼ねる。
 */
const VIEWS: readonly View[] = ['left', 'right', 'front', 'rear']
const COMBOS: readonly { layer: Layer; depth: Depth }[] = [
  { layer: 'skin', depth: 'superficial' },
  { layer: 'muscle', depth: 'superficial' },
  { layer: 'skeleton', depth: 'superficial' },
  { layer: 'organs', depth: 'superficial' },
]
/** anatomy-canvas.tsx の HIT_R と RING_R（画面 px）。 */
const HIT_R = 22
const RING_R = 10
/** スマホ縦（390x844 の図の箱）とデスクトップ（900x1000 の図の箱）。e2e/canvas-layout.ts の実測。 */
const CONTAINERS: readonly Size[] = [
  { w: 390, h: 460 },
  { w: 580, h: 1000 },
]
const ZOOMS = [1, 2, 4, MAX_ZOOM] as const
/** 指のずれ。点の輪（RING_R）の内側を押した時を見る。 */
const JITTER = 6

const anchorOf = (p: Part): Point => p.labelAt ?? centroid(p.points)

function tap(screen: Point, vb: ViewBox, container: Size, parts: readonly Part[]): string | null {
  const pt = screenToImage(screen, vb, container)
  const k = markerScale(vb, container)
  const hit = hitTestMarkers(
    pt,
    parts.map((p) => ({ value: p, at: anchorOf(p) })),
    HIT_R * k,
  )
  return hit?.id ?? null
}

function onScreen(s: Point, container: Size): boolean {
  return s[0] >= RING_R && s[1] >= RING_R && s[0] <= container.w - RING_R && s[1] <= container.h - RING_R
}

type Case = { view: View; combo: (typeof COMBOS)[number]; part: Part; parts: readonly Part[] }
const cases: Case[] = VIEWS.flatMap((view) =>
  COMBOS.flatMap((combo) => {
    const parts = visibleParts(GEOMETRY[view].parts, combo)
    return parts.map((part) => ({ view, combo, part, parts }))
  }),
)

describe('拡大・移動・反転の後も全部位を選べる（#175）', () => {
  it('対象は4向きの配置済み部位すべて', () => {
    const total = VIEWS.reduce((n, v) => n + GEOMETRY[v].parts.length, 0)
    expect(cases.length).toBe(total)
    expect(GEOMETRY.right.parts.length).toBe(GEOMETRY.left.parts.length)
  })

  it.each(cases.map((c) => [`${c.view}/${c.combo.layer}/${c.part.id}`, c] as const))(
    '%s: その部位へ寄った時、画面内の点を押すとその部位が選ばれ、点が画面内に出る倍率がある',
    (_name, c) => {
      const g = GEOMETRY[c.view]
      const at = anchorOf(c.part)
      for (const container of CONTAINERS) {
        let shown = 0
        for (const z of ZOOMS) {
          const vb = zoomAt(fit(g.size), at, z, g.size, g.mask)
          const s = imageToScreen(at, vb, container)
          if (!onScreen(s, container)) continue
          shown++
          expect(tap(s, vb, container, c.parts), `${z}倍 ${container.w}x${container.h}`).toBe(c.part.id)
        }
        expect(shown, `${container.w}x${container.h}`).toBeGreaterThan(0)
      }
    },
  )

  /**
   * 寄ったのに点が画面から外れる組み合わせ。#65 の制限（画面の中心は馬体の上）で、
   * 鼻先のように縁にある部位は 4 倍で中心が体側へ押し戻され、点が画面の外へ出る。
   * 2 倍と 8 倍では画面内に出て押せる。直すかは別に決める。増減したらここで気づく。
   */
  it('寄っても点が画面外に出る組み合わせは既知の一覧どおり', () => {
    const offscreen: string[] = []
    for (const c of cases) {
      const g = GEOMETRY[c.view]
      const at = anchorOf(c.part)
      for (const container of CONTAINERS) {
        for (const z of ZOOMS) {
          const vb = zoomAt(fit(g.size), at, z, g.size, g.mask)
          if (!onScreen(imageToScreen(at, vb, container), container)) {
            offscreen.push(`${c.view}/${c.part.id}@${z}x/${container.w}x${container.h}`)
          }
        }
      }
    }
    expect(offscreen.sort()).toEqual([
      'left/skin-muzzle@4x/390x460',
      'left/skin-muzzle@4x/580x1000',
      'right/skin-muzzle@4x/390x460',
      'right/skin-muzzle@4x/580x1000',
    ])
  })

  it.each(cases.map((c) => [`${c.view}/${c.combo.layer}/${c.part.id}`, c] as const))(
    '%s: 寄った後に上下左右へ動かしても、画面内に残った点を押せばその部位',
    (_name, c) => {
      const g = GEOMETRY[c.view]
      const at = anchorOf(c.part)
      for (const container of CONTAINERS) {
        const vb0 = zoomAt(fit(g.size), at, 4, g.size, g.mask)
        for (const [fx, fy] of [
          [0.3, 0],
          [-0.3, 0],
          [0, 0.3],
          [0, -0.3],
        ] as const) {
          const vb = pan(vb0, vb0.w * fx, vb0.h * fy, g.size, g.mask)
          const s = imageToScreen(at, vb, container)
          if (!onScreen(s, container)) continue
          expect(tap(s, vb, container, c.parts), `pan ${fx},${fy}`).toBe(c.part.id)
        }
      }
    },
  )

  it.each(cases.map((c) => [`${c.view}/${c.combo.layer}/${c.part.id}`, c] as const))(
    '%s: 指が少しずれても選べる倍率がある',
    (_name, c) => {
      const g = GEOMETRY[c.view]
      const at = anchorOf(c.part)
      for (const container of CONTAINERS) {
        const ok = ZOOMS.some((z) => {
          const vb = zoomAt(fit(g.size), at, z, g.size, g.mask)
          const s = imageToScreen(at, vb, container)
          return [
            [JITTER, 0],
            [-JITTER, 0],
            [0, JITTER],
            [0, -JITTER],
          ].every(([dx, dy]) => tap([s[0] + dx!, s[1] + dy!], vb, container, c.parts) === c.part.id)
        })
        expect(ok, `${container.w}x${container.h}`).toBe(true)
      }
    },
  )

  it('右側望の点は左側望の点の左右反転', () => {
    const w = GEOMETRY.left.size.w
    for (const p of GEOMETRY.left.parts) {
      const r = GEOMETRY.right.parts.find((q) => q.id === p.id && q.depth === p.depth)
      expect(r, p.id).toBeDefined()
      const a = anchorOf(p)
      const b = anchorOf(r!)
      expect(b[0]).toBeCloseTo(w - a[0], 6)
      expect(b[1]).toBeCloseTo(a[1], 6)
    }
  })
})
