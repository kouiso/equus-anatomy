import { describe, expect, it } from 'vitest'
import { areaOfStructure } from './area-map'
import { GEOMETRY, STRUCTURE_BY_ID, STRUCTURES } from './data'
import { makeChoices, pickQuestion, questionPool } from './quiz'

/** 決定的な乱数で検証する（乱数まみれのテストは落ちた時に追えん） */
const seq = (...values: number[]) => {
  let i = 0
  return () => values[i++ % values.length]!
}

describe('出題母数', () => {
  it('層と深さで絞る（表層筋・左側望は13件）', () => {
    const pool = questionPool(GEOMETRY.left, { layer: 'muscle', depth: 'superficial', area: 'all' })
    expect(pool.length).toBe(13)
    expect(pool.every((p) => p.layer === 'muscle')).toBe(true)
  })

  it('場所で絞る（前肢・前躯の表層筋だけ）', () => {
    const pool = questionPool(GEOMETRY.left, { layer: 'muscle', depth: 'superficial', area: 'fore' })
    expect(pool.map((p) => p.id).sort()).toEqual([
      'muscle-deltoid',
      'muscle-ecr',
      'muscle-pectoral',
      'muscle-trapezius',
      'muscle-triceps',
    ])
  })

  it('座標が無い部位は母数に入らん', () => {
    const pool = questionPool(GEOMETRY.left, { layer: 'organs', depth: 'superficial', area: 'all' })
    // organ-bladder / organ-cecum は左側望に座標が無い
    expect(pool.map((p) => p.id)).not.toContain('organ-bladder')
    expect(pool.map((p) => p.id)).not.toContain('organ-cecum')
  })
})

describe('pickQuestion', () => {
  it('母数が空なら出さん', () => {
    expect(pickQuestion([], Math.random)).toBeNull()
  })

  it('母数の中から1件返す', () => {
    const pool = questionPool(GEOMETRY.left, { layer: 'muscle', depth: 'superficial', area: 'fore' })
    const q = pickQuestion(pool, seq(0))
    expect(q).not.toBeNull()
    expect(pool).toContainEqual(q)
  })
})

describe('4択の作成', () => {
  it('正解を含めて4件、重複なし', () => {
    const answer = STRUCTURE_BY_ID.get('muscle-gluteus')!
    const choices = makeChoices(answer, STRUCTURES, seq(0.1, 0.5, 0.9, 0.3))
    expect(choices.length).toBe(4)
    expect(new Set(choices.map((c) => c.id)).size).toBe(4)
    expect(choices.map((c) => c.id)).toContain('muscle-gluteus')
  })

  it('ダミーは同じ層・同じ場所を優先する', () => {
    const answer = STRUCTURE_BY_ID.get('muscle-gluteus')!
    const choices = makeChoices(answer, STRUCTURES, seq(0))
    const dummies = choices.filter((c) => c.id !== 'muscle-gluteus')
    // 後肢の筋は2件しかないので両方入り、3件目は同じ層から埋まる
    expect(dummies.every((d) => d.layer === 'muscle')).toBe(true)
    expect(dummies.filter((d) => areaOfStructure(d) === 'hind').length).toBe(2)
  })

  it('どんな乱数でも4件揃う', () => {
    const answer = STRUCTURE_BY_ID.get('skin-hoof')!
    for (const v of [0, 0.25, 0.5, 0.75, 0.999]) {
      const choices = makeChoices(answer, STRUCTURES, () => v)
      expect(new Set(choices.map((c) => c.id)).size).toBe(4)
    }
  })
})
