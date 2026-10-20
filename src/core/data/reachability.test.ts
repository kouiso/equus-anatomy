import { describe, expect, it } from 'vitest'
import { canvasOverlayRects, MARKER_HIT_R, MARKER_RING_R } from '../canvas-overlay'
import { bbox, centroid, markerScale } from '../geometry'
import { hitTestMarkers, hitTestParts, pointInPolygon, visibleParts } from '../hit-test'
import { imageToScreen, screenToImage } from '../screen-to-image'
import type { Depth, Layer, Part, Point, Size, View, ViewBox } from '../types'
import { fit, MAX_ZOOM, pan, zoomAt } from '../zoom'
import { GEOMETRY } from './index'

/**
 * #175 拡大・移動・反転の後でも、全部の部位を選べること。
 *
 * 当たり判定は anatomy-canvas.tsx の onTap と同じ順で core の関数を通す。
 * 先に「見えとる点」を半径 MARKER_HIT_R（画面 px）× k で拾い、外れたら部位の多角形で拾う。
 * ラベルを押す段は通さん（ラベルは自分の部位を指すので、選べる・選べんの答えは変わらん）。
 * 右側望は左側望を反転したデータ（GEOMETRY.right）で、反転の確認を兼ねる。
 *
 * 図の上に重ねた操作（部位一覧・ズーム・1つ戻る）の領域は、画面が宣言しとる矩形
 * （canvasOverlayRects）で塞ぐ。実際のボタンは文字の幅しか取らんので、ここは厳しめになる。
 */
const VIEWS: readonly View[] = ['left', 'right', 'front', 'rear']
const COMBOS: readonly { layer: Layer; depth: Depth }[] = [
  { layer: 'skin', depth: 'superficial' },
  { layer: 'muscle', depth: 'superficial' },
  { layer: 'skeleton', depth: 'superficial' },
  { layer: 'organs', depth: 'superficial' },
]
/** スマホ縦（390x844 の図の箱）とデスクトップ（900x1000 の図の箱）。e2e/canvas-layout.ts の実測。 */
const CONTAINERS: readonly Size[] = [
  { w: 390, h: 460 },
  { w: 580, h: 1000 },
]
const ZOOMS = [1, 2, 4, MAX_ZOOM] as const
/** 指のずれ。点の輪（MARKER_RING_R）の内側を押した時を見る。 */
const JITTER = 6

const anchorOf = (p: Part): Point => p.labelAt ?? centroid(p.points)

type Case = { view: View; combo: (typeof COMBOS)[number]; part: Part; parts: readonly Part[] }
const cases: Case[] = VIEWS.flatMap((view) =>
  COMBOS.flatMap((combo) => {
    const parts = visibleParts(GEOMETRY[view].parts, combo)
    return parts.map((part) => ({ view, combo, part, parts }))
  }),
)
const named = cases.map((c) => [`${c.view}/${c.combo.layer}/${c.part.id}`, c] as const)

/** onTap の点→多角形の段。返すのは選ばれた部位の id */
function tap(screen: Point, vb: ViewBox, container: Size, c: Case): string | null {
  const pt = screenToImage(screen, vb, container)
  const k = markerScale(vb, container)
  const marker = hitTestMarkers(
    pt,
    c.parts.map((p) => ({ value: p, at: anchorOf(p) })),
    MARKER_HIT_R * k,
  )
  if (marker) return marker.id
  return hitTestParts(pt, c.parts, c.combo)?.id ?? null
}

/** 画面の中で、重ねた操作に隠れてへん点か */
function tappable(s: Point, container: Size): boolean {
  const r0 = MARKER_RING_R
  if (s[0] < r0 || s[1] < r0 || s[0] > container.w - r0 || s[1] > container.h - r0) return false
  return !canvasOverlayRects({ canvasWidth: container.w, showBack: true, shortCanvas: false }).some(
    (r) => s[0] >= r.x && s[0] <= r.x + r.w && s[1] >= r.y && s[1] <= r.y + r.h,
  )
}

/** その部位へ寄った viewBox（ピンチの中心を部位の点に置いた時） */
const zoomedOn = (c: Case, z: number) => {
  const g = GEOMETRY[c.view]
  return zoomAt(fit(g.size), anchorOf(c.part), z, g.size, g.mask)
}

/** 多角形の内側を画面上 8px 間隔で探し、押せばその部位が選ばれる点を1つ返す */
function polygonTapPoint(c: Case, vb: ViewBox, container: Size): Point | null {
  const b = bbox(c.part.points)
  const step = 8 * markerScale(vb, container)
  for (let y = b.y + step / 2; y < b.y + b.h; y += step) {
    for (let x = b.x + step / 2; x < b.x + b.w; x += step) {
      if (!pointInPolygon([x, y], c.part.points)) continue
      const s = imageToScreen([x, y], vb, container)
      if (tappable(s, container) && tap(s, vb, container, c) === c.part.id) return s
    }
  }
  return null
}

describe('拡大・移動・反転の後も全部位を選べる（#175）', () => {
  it('対象は4向きの配置済み部位すべて', () => {
    const total = VIEWS.reduce((n, v) => n + GEOMETRY[v].parts.length, 0)
    expect(cases.length).toBe(total)
    expect(GEOMETRY.right.parts.length).toBe(GEOMETRY.left.parts.length)
  })

  it.each(named)('%s: 寄った時に点が押せるなら、押すとその部位が選ばれる', (_name, c) => {
    for (const container of CONTAINERS) {
      for (const z of ZOOMS) {
        const vb = zoomedOn(c, z)
        const s = imageToScreen(anchorOf(c.part), vb, container)
        if (!tappable(s, container)) continue
        expect(tap(s, vb, container, c), `${z}倍 ${container.w}x${container.h}`).toBe(c.part.id)
      }
    }
  })

  it.each(named)('%s: どの画面でも、点か輪郭の内側を押して選べる倍率がある', (_name, c) => {
    for (const container of CONTAINERS) {
      const ok = ZOOMS.some((z) => {
        const vb = zoomedOn(c, z)
        const s = imageToScreen(anchorOf(c.part), vb, container)
        if (tappable(s, container) && tap(s, vb, container, c) === c.part.id) return true
        return polygonTapPoint(c, vb, container) !== null
      })
      expect(ok, `${container.w}x${container.h}`).toBe(true)
    }
  })

  it.each(named)('%s: 寄った後に上下左右へ動かしても、押せる点はその部位を指す', (_name, c) => {
    const g = GEOMETRY[c.view]
    const at = anchorOf(c.part)
    for (const container of CONTAINERS) {
      for (const z of [2, 4] as const) {
        const vb0 = zoomedOn(c, z)
        for (const [fx, fy] of [
          [0.3, 0],
          [-0.3, 0],
          [0, 0.3],
          [0, -0.3],
        ] as const) {
          const vb = pan(vb0, vb0.w * fx, vb0.h * fy, g.size, g.mask)
          const s = imageToScreen(at, vb, container)
          if (!tappable(s, container)) continue
          expect(tap(s, vb, container, c), `${z}倍 pan ${fx},${fy} ${container.w}x${container.h}`).toBe(c.part.id)
        }
      }
    }
  })

  it.each(named)('%s: 点が押せる倍率では、指が少しずれても選べる倍率がある', (_name, c) => {
    for (const container of CONTAINERS) {
      const usable = ZOOMS.filter((z) => tappable(imageToScreen(anchorOf(c.part), zoomedOn(c, z), container), container))
      if (usable.length === 0) continue
      const ok = usable.some((z) => {
        const vb = zoomedOn(c, z)
        const s = imageToScreen(anchorOf(c.part), vb, container)
        return [
          [JITTER, 0],
          [-JITTER, 0],
          [0, JITTER],
          [0, -JITTER],
        ].every(([dx, dy]) => tap([s[0] + dx!, s[1] + dy!], vb, container, c) === c.part.id)
      })
      expect(ok, `${container.w}x${container.h}`).toBe(true)
    }
  })

  /**
   * 寄っても点そのものは押せん組み合わせ（画面の外、または重ねた操作の下）。
   * 主な理由は #65 の制限（画面の中心は馬体の上）で、縁の部位は中心が体側へ押し戻される。
   * 輪郭の内側を押せば選べることは上の試験で見とる。直すかは別に決める。増減したらここで気づく。
   */
  it('寄っても点が押せん組み合わせは既知の一覧どおり', () => {
    const hidden: string[] = []
    for (const c of cases) {
      for (const container of CONTAINERS) {
        for (const z of ZOOMS) {
          if (!tappable(imageToScreen(anchorOf(c.part), zoomedOn(c, z), container), container)) {
            hidden.push(`${c.view}/${c.part.id}@${z}x/${container.w}x${container.h}`)
          }
        }
      }
    }
    expect(hidden.sort()).toEqual(KNOWN_HIDDEN_MARKERS)
  })

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

const KNOWN_HIDDEN_MARKERS: readonly string[] = []
