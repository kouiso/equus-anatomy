import { describe, expect, it } from 'vitest'
import { GEOMETRY, STRUCTURE_BY_ID, STRUCTURES } from './data'
import { canOpenOnMap, mappableViews, partDrawableIn } from './map-entry'
import type { HorseMask, Structure, ViewGeometry } from './types'

/**
 * 「図で見る」入口を出してよいかの判定。
 *
 * #63: 位置未登録の部位でも入口が常に出て、着地先は真っ黒キャンバスか点の無い図の
 * 行き止まりだった。入口の判定と着地側の向き選択は同じ基準を使う。
 * ここで弾けん組合せを入口が出さん限り、行き止まりは再生されへん。
 */
const emptyMask: HorseMask = { block: 1, bw: 1, bh: 1, size: { w: 100, h: 100 }, bits: new Uint8Array(1) }

const base: ViewGeometry = {
  view: 'left',
  size: { w: 100, h: 100 },
  images: { 'muscle-superficial': { src: 'm.png', hash: 'h' } },
  measuredOn: 'muscle-superficial',
  frame: [[0, 0], [100, 0], [100, 100], [0, 100]],
  mask: emptyMask,
  areas: [],
  parts: [],
}

const muscle = (over: Partial<Structure> = {}): Structure => ({
  id: 'm1',
  layer: 'muscle',
  nameJa: '筋',
  nameLa: 'M.',
  nameEn: 'muscle',
  region: '体幹',
  summary: 's',
  body: 'b',
  function: 'f',
  views: ['left'],
  ...over,
})

describe('partDrawableIn', () => {
  it('図形があってプレートもある → 出せる', () => {
    const s = muscle()
    const g: ViewGeometry = {
      ...base,
      parts: [{ id: 'm1', layer: 'muscle', depth: 'superficial', points: [[0, 0], [10, 0], [10, 10]], source: 'draft' }],
    }
    expect(partDrawableIn(g, s)).toBe(true)
  })

  it('図形が無い → 出せん（着地しても点が無い）', () => {
    expect(partDrawableIn(base, muscle())).toBe(false)
  })

  it('図形はあるがプレートの絵が無い → 出せん（真っ黒に点が浮くだけ）', () => {
    const s = muscle({ depth: 'deep' })
    const g: ViewGeometry = {
      ...base,
      parts: [{ id: 'm1', layer: 'muscle', depth: 'deep', points: [[0, 0], [10, 0], [10, 10]], source: 'draft' }],
    }
    expect(partDrawableIn(g, s)).toBe(false)
  })

  it('図形の層が解説と違う → 出せん（着地条件では描画対象にならん）', () => {
    const s = muscle()
    const g: ViewGeometry = {
      ...base,
      parts: [{ id: 'm1', layer: 'skin', points: [[0, 0], [10, 0], [10, 10]], source: 'draft' }],
    }
    expect(partDrawableIn(g, s)).toBe(false)
  })

  it('図形の深さが解説と違う → 出せん', () => {
    const s = muscle({ depth: 'deep' })
    const g: ViewGeometry = {
      ...base,
      images: { ...base.images, 'muscle-deep': { src: 'd.png', hash: 'h' } },
      parts: [{ id: 'm1', layer: 'muscle', depth: 'superficial', points: [[0, 0], [10, 0], [10, 10]], source: 'draft' }],
    }
    expect(partDrawableIn(g, s)).toBe(false)
  })

  it('深さを持たん図形はどの深さでも描けるので、あとはプレート次第', () => {
    const s = muscle({ depth: 'deep' })
    const g: ViewGeometry = {
      ...base,
      images: { ...base.images, 'muscle-deep': { src: 'd.png', hash: 'h' } },
      parts: [{ id: 'm1', layer: 'muscle', points: [[0, 0], [10, 0], [10, 10]], source: 'draft' }],
    }
    expect(partDrawableIn(g, s)).toBe(true)
  })
})

describe('mappableViews', () => {
  it('宣言した向きのうち、実際に出せるものだけ返す', () => {
    // 肝臓は右側の臓器。宣言は ['right'] で、反転した図形が右側望にある
    expect(mappableViews(STRUCTURE_BY_ID.get('organ-liver')!)).toEqual(['right'])
    expect(mappableViews(STRUCTURE_BY_ID.get('organ-spleen')!)).toEqual(['left'])
  })

  it('返した向きでは全部図形がありプレートもある（着地して点が出ることの裏付け）', () => {
    for (const s of STRUCTURES) {
      for (const view of mappableViews(s)) {
        expect(s.views, s.id).toContain(view)
        expect(GEOMETRY[view].parts.some((p) => p.id === s.id), `${s.id} @ ${view}`).toBe(true)
      }
    }
  })
})

describe('canOpenOnMap（#63 回帰）', () => {
  it('位置未登録の6部位は false', () => {
    const unplaced = [
      'muscle-supraspinatus',
      'muscle-infraspinatus',
      'muscle-iliopsoas',
      'muscle-subclavius',
      'organ-bladder',
      'organ-cecum',
    ]
    for (const id of unplaced) {
      expect(canOpenOnMap(STRUCTURE_BY_ID.get(id)!), id).toBe(false)
    }
  })

  it('それ以外の46部位は全部 true（入口を消しすぎとらん）', () => {
    const closed = STRUCTURES.filter((s) => !canOpenOnMap(s)).map((s) => s.id)
    expect(closed.sort()).toEqual([
      'muscle-iliopsoas',
      'muscle-infraspinatus',
      'muscle-subclavius',
      'muscle-supraspinatus',
      'organ-bladder',
      'organ-cecum',
    ])
  })
})
