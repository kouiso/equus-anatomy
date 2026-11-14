import { describe, expect, it } from 'vitest'
import {
  checkReferenceSet,
  compareMasks,
  distanceTo,
  evaluate,
  percentile,
  plateOf,
  rasterize,
  summarize,
  validateReference,
  type ReferenceFile,
  type Target,
} from './measure-independent-mask'
import type { Point, Size } from '../src/core/types'

const SIZE: Size = { w: 64, h: 48 }
const SHA = `sha256:${'a'.repeat(64)}`
const rect = (x: number, y: number, w: number, h: number): Point[] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
]
const count = (m: Uint8Array) => m.reduce((n, v) => n + v, 0)

const reference = (over: Partial<ReferenceFile> = {}): ReferenceFile => ({
  view: 'left',
  plate: 'skin',
  image: 'skin_left.jpg',
  imageSha256: SHA,
  size: SIZE,
  annotator: 'test',
  blindToCandidates: true,
  createdAt: '2026-10-20',
  method: 'fixture',
  parts: [{ id: 'skin-a', polygons: [rect(10, 10, 20, 20)] }],
  ...over,
})
const target = (id: string, points: Point[]): Target => ({ view: 'left', id, layer: 'skin', plate: 'skin', source: 'draft', points })
const run = (targets: Target[], refs: ReferenceFile[], current: string | null = SHA, candidate: string | null = SHA) =>
  evaluate({
    targets,
    references: refs,
    currentImageSha: () => current,
    candidateImageSha: () => candidate,
    imageFileOf: () => 'skin_left.jpg',
    sizeOf: () => SIZE,
  })

describe('rasterize', () => {
  it('整数頂点の矩形は w×h 画素を塗る', () => {
    expect(count(rasterize([rect(10, 10, 20, 20)], SIZE))).toBe(400)
  })
  it('離れた多角形は和集合で塗る', () => {
    expect(count(rasterize([rect(0, 0, 4, 4), rect(30, 30, 4, 4)], SIZE))).toBe(32)
  })
  it('画像の外へはみ出した分は捨てる', () => {
    expect(count(rasterize([rect(-10, -10, 20, 20)], SIZE))).toBe(100)
  })
})

describe('distanceTo', () => {
  it('ユークリッド距離を返す（3-4-5）', () => {
    const seeds = new Uint8Array(SIZE.w * SIZE.h)
    seeds[0] = 1
    const d = distanceTo(seeds, SIZE)
    expect(d[4 * SIZE.w + 3]).toBeCloseTo(5, 9)
  })
})

describe('percentile', () => {
  it('最近順位法で、補間した値を作らん', () => {
    const xs = Array.from({ length: 100 }, (_, i) => i + 1)
    expect(percentile(xs, 95)).toBe(95)
    expect(percentile([0, 10], 95)).toBe(10)
  })
})

describe('compareMasks', () => {
  it('同じ領域なら IoU 1・境界距離 0', () => {
    const a = rasterize([rect(10, 10, 20, 20)], SIZE)
    const r = compareMasks(a, a, SIZE)
    expect(r.iou).toBe(1)
    expect(r.boundaryP95Px).toBe(0)
  })
  it('2px ずらすと IoU は 360/440、境界は 2px 前後', () => {
    const a = rasterize([rect(10, 10, 20, 20)], SIZE)
    const b = rasterize([rect(12, 10, 20, 20)], SIZE)
    const r = compareMasks(a, b, SIZE)
    expect(r.iou).toBeCloseTo(360 / 440, 9)
    expect(r.boundaryP95Px).toBe(2)
  })
  it('候補が外へ大きくはみ出すと、両向きの距離で拾う', () => {
    const a = rasterize([rect(10, 10, 10, 10)], SIZE)
    const b = rasterize([rect(10, 10, 40, 10)], SIZE)
    expect(compareMasks(a, b, SIZE).boundaryP95Px).toBeGreaterThan(10)
  })
  it('片側だけのずれは2つの向きの大きい方で拾い、混ぜて薄めない', () => {
    // 候補に離れた小島がある。参照→候補は 0、候補→参照だけが大きい
    const a = rasterize([rect(10, 10, 20, 20)], SIZE)
    const b = rasterize([rect(10, 10, 20, 20), rect(50, 30, 4, 4)], SIZE)
    const r = compareMasks(a, b, SIZE)
    expect(r.referenceToCandidateP95Px).toBe(0)
    expect(r.candidateToReferenceP95Px).toBeGreaterThan(3)
    expect(r.boundaryP95Px).toBe(r.candidateToReferenceP95Px)
  })
  it('空のマスクは比べずに落とす', () => {
    const a = rasterize([rect(10, 10, 10, 10)], SIZE)
    expect(() => compareMasks(a, new Uint8Array(a.length), SIZE)).toThrow()
  })
})

describe('evaluate', () => {
  it('参照が無い部位は unmeasured のままで数字を持たん', () => {
    const [row] = run([target('skin-b', rect(10, 10, 20, 20))], [reference()])
    expect(row!.status).toBe('unmeasured')
    expect(row!.iou).toBeNull()
    expect(row!.boundaryP95Px).toBeNull()
  })
  it('参照ファイルが1枚も無ければ全件 unmeasured で受け入れを満たさん', () => {
    const rows = run([target('skin-a', rect(10, 10, 20, 20))], [])
    expect(summarize(rows)).toMatchObject({ targets: 1, measured: 0, unmeasured: 1, acceptanceMet: false })
  })
  it('一致すれば pass、ずれれば fail', () => {
    const rows = run([target('skin-a', rect(10, 10, 20, 20))], [reference()])
    expect(rows[0]!.status).toBe('pass')
    const off = run([target('skin-a', rect(16, 10, 20, 20))], [reference()])
    expect(off[0]!.status).toBe('fail')
  })
  it('原画の SHA が参照と違えば stale にして測らん', () => {
    const rows = run([target('skin-a', rect(10, 10, 20, 20))], [reference()], `sha256:${'b'.repeat(64)}`, `sha256:${'b'.repeat(64)}`)
    expect(rows[0]!.status).toBe('stale')
    expect(rows[0]!.iou).toBeNull()
  })
  it('当たり領域が古い原画で測られとれば stale', () => {
    const rows = run([target('skin-a', rect(10, 10, 20, 20))], [reference()], SHA, `sha256:${'c'.repeat(64)}`)
    expect(rows[0]!.status).toBe('stale')
  })
  it('参照の原画ファイルが当たり領域の原画と違えば stale', () => {
    const rows = run([target('skin-a', rect(10, 10, 20, 20))], [reference({ image: 'muscle_left.jpg' })])
    expect(rows[0]!.status).toBe('stale')
    expect(rows[0]!.iou).toBeNull()
  })
  it('合格しても当たり領域の source は変えない', () => {
    const t = target('skin-a', rect(10, 10, 20, 20))
    const [row] = run([t], [reference()])
    expect(row!.status).toBe('pass')
    expect(row!.source).toBe('draft')
    expect(t.source).toBe('draft')
  })
  it('向きや層が違う参照は使わん', () => {
    const rows = run([target('skin-a', rect(10, 10, 20, 20))], [reference({ plate: 'skeleton' }), reference({ view: 'front' })])
    expect(rows[0]!.status).toBe('unmeasured')
  })
  it('候補座標を見て作った参照は数字だけ出して合否に数えん', () => {
    const rows = run([target('skin-a', rect(10, 10, 20, 20))], [reference({ blindToCandidates: false })])
    expect(rows[0]!.status).toBe('not-independent')
    expect(rows[0]!.iou).toBe(1)
    expect(summarize(rows)).toMatchObject({ measured: 0, pass: 0, acceptanceMet: false })
  })
  it('全対象が合格した時だけ受け入れを満たす', () => {
    const refs = [reference({ parts: [{ id: 'skin-a', polygons: [rect(10, 10, 20, 20)] }, { id: 'skin-b', polygons: [rect(40, 10, 10, 10)] }] })]
    const ok = run([target('skin-a', rect(10, 10, 20, 20)), target('skin-b', rect(40, 10, 10, 10))], refs)
    expect(summarize(ok).acceptanceMet).toBe(true)
    const partial = run([target('skin-a', rect(10, 10, 20, 20)), target('skin-c', rect(40, 10, 10, 10))], refs)
    expect(summarize(partial)).toMatchObject({ pass: 1, unmeasured: 1, acceptanceMet: false })
  })
})

describe('validateReference', () => {
  it('SHA と独立性の申告が無い参照は読まん', () => {
    expect(() => validateReference({ ...reference(), imageSha256: 'abc' }, 'x.json')).toThrow(/imageSha256/)
    const withoutDeclaration: Partial<ReferenceFile> = { ...reference() }
    delete withoutDeclaration.blindToCandidates
    expect(() => validateReference(withoutDeclaration, 'x.json')).toThrow(/blindToCandidates/)
  })
})

describe('validateReference の頂点', () => {
  it('有限でない頂点は読まん', () => {
    const bad = reference({ parts: [{ id: 'skin-a', polygons: [[[0, 0], [10, Number.NaN], [10, 10]]] }] })
    expect(() => validateReference(bad, 'x.json')).toThrow(/有限/)
  })
})

describe('checkReferenceSet', () => {
  it('同じ部位の参照の重複と、対象に当たらん id を拾う', () => {
    const t = [target('skin-a', rect(10, 10, 20, 20))]
    const r = checkReferenceSet([reference(), reference({ parts: [{ id: 'skin-a', polygons: [rect(0, 0, 4, 4)] }, { id: 'skin-typo', polygons: [rect(0, 0, 4, 4)] }] })], t)
    expect(r.duplicates).toEqual(['left/skin/skin-a'])
    expect(r.orphans).toEqual(['left/skin/skin-typo'])
  })
})

describe('plateOf', () => {
  it('筋は深さ付きのプレート、他は層の名前', () => {
    expect(plateOf('muscle', 'superficial')).toBe('muscle-superficial')
    expect(plateOf('skeleton', undefined)).toBe('skeleton')
  })
})
