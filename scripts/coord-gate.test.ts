import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { checkPolygon, maskFromEntry } from './coord-gate'
import { isOnHorse } from './silhouette'
import { centroid } from '../src/core/geometry'
import type { Point } from '../src/core/types'

const sil = JSON.parse(readFileSync('src/core/data/silhouettes.json', 'utf8')) as {
  entries: { file: string; bw: number; bh: number; size: { w: number; h: number }; mask: string }[]
}
const entry = sil.entries.find((e) => e.file === 'muscle_left.jpg')!
const mask = maskFromEntry(entry)
const size = entry.size
const square = (cx: number, cy: number, r = 34): Point[] => [
  [cx - r, cy - r],
  [cx + r, cy - r],
  [cx + r, cy + r],
  [cx - r, cy + r],
]

describe('シルエット抽出', () => {
  it('12枚すべてでマスクが取れとる', () => {
    expect(sil.entries.length).toBe(12)
    for (const e of sil.entries) expect(e.mask.length).toBeGreaterThan(100)
  })

  it('鹿毛の暗い体色でも背景と分離できとる（skin_left）', () => {
    const skin = maskFromEntry(sil.entries.find((e) => e.file === 'skin_left.jpg')!)
    // 胴の中ほど。輝度だけのしきい値やと暗い毛が背景に落ちる場所
    expect(isOnHorse(skin, 850, 500, 0)).toBe(true)
    // 左上の隅は背景
    expect(isOnHorse(skin, 40, 40, 0)).toBe(false)
  })
})

describe('座標ゲート', () => {
  it('馬体の上に置いた領域は通る', () => {
    expect(checkPolygon({ mask, size, kind: 'part', id: 'ok', points: square(850, 500) })).toEqual([])
  })

  it('grok 版の「頭部」マーカー (320,480) は喉の下の背景なので落ちる', () => {
    const problems = checkPolygon({ mask, size, kind: 'part', id: 'legacy-head', points: square(320, 480) })
    expect(problems.length).toBeGreaterThan(0)
    expect(problems.map((p) => p.message).join(' ')).toContain('馬体の外')
  })

  it('grok 版の「後肢」マーカー (1120,672) は脚の間の背景なので落ちる', () => {
    expect(checkPolygon({ mask, size, kind: 'part', id: 'legacy-hind', points: square(1120, 672) }).length).toBeGreaterThan(0)
  })

  it('画像の外は落ちる', () => {
    const problems = checkPolygon({ mask, size, kind: 'part', id: 'oob', points: square(1590, 1190, 100) })
    expect(problems.map((p) => p.message).join(' ')).toContain('画像の外')
  })

  it('頂点が2つでは領域にならん', () => {
    const problems = checkPolygon({
      mask,
      size,
      kind: 'part',
      id: 'line',
      points: [
        [800, 500],
        [820, 520],
      ],
    })
    expect(problems.map((p) => p.message).join(' ')).toContain('多角形になってへん')
  })

  it('潰れた領域（誤クリック）は落ちる', () => {
    const problems = checkPolygon({ mask, size, kind: 'part', id: 'tiny', points: square(850, 500, 2) })
    expect(problems.map((p) => p.message).join(' ')).toContain('小さすぎる')
  })
})

describe('実データ', () => {
  const VIEWS = ['left', 'front', 'rear'] as const
  type RegionFile = {
    size: { w: number; h: number }
    measuredOn: string
    images: Record<string, { src: string }>
    areas: { id: string; points: Point[]; source?: string }[]
    parts: { id: string; layer: string; depth?: string; points: Point[]; source?: string }[]
  }
  const load = (v: string): RegionFile =>
    JSON.parse(readFileSync(`src/core/data/regions/${v}.json`, 'utf8')) as RegionFile

  for (const view of VIEWS) {
    it(`${view}: 置いた座標が全部ゲートを通る`, () => {
      const rf = load(view)
      const file = rf.images[rf.measuredOn]!.src.replace('/anatomy/', '')
      const m = maskFromEntry(sil.entries.find((e) => e.file === file)!)
      for (const a of rf.areas) {
        expect(checkPolygon({ mask: m, size: rf.size, kind: 'area', id: a.id, points: a.points }), a.id).toEqual([])
      }
      for (const p of rf.parts) {
        expect(checkPolygon({ mask: m, size: rf.size, kind: 'part', id: p.id, points: p.points }), p.id).toEqual([])
      }
    })
  }

  it('左側望の大まかな場所は6つとも実測（切り出し元がマスクなので draft やない）', () => {
    const rf = load('left')
    expect(rf.areas.map((a) => a.id).sort()).toEqual(['fore', 'head', 'hind', 'neck', 'tail', 'trunk'])
    for (const a of rf.areas) expect(a.source, a.id).toBe('measured')
  })

  it('表層筋13件は下書きとして記録されとる（実測と混ぜん）', () => {
    const rf = load('left')
    const muscles = rf.parts.filter((p) => p.layer === 'muscle' && p.depth === 'superficial')
    expect(muscles.length).toBe(13)
    for (const p of muscles) expect(p.source, p.id).toBe('draft')
  })

  it('場所の重心が互いに十分離れとる（マーカーが重ならん）', () => {
    const rf = load('left')
    const cs = rf.areas.map((a) => ({ id: a.id, c: centroid(a.points) }))
    for (let i = 0; i < cs.length; i++) {
      for (let j = i + 1; j < cs.length; j++) {
        const d = Math.hypot(cs[i]!.c[0] - cs[j]!.c[0], cs[i]!.c[1] - cs[j]!.c[1])
        expect(d, `${cs[i]!.id} と ${cs[j]!.id}`).toBeGreaterThan(120)
      }
    }
  })
})
