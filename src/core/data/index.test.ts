import { describe, expect, it } from 'vitest'
import { GEOMETRY } from './index'
import { STRUCTURES } from './structures'

describe('座標データ', () => {
  it('4つの向きが揃っとる', () => {
    expect(Object.keys(GEOMETRY).sort()).toEqual(['front', 'left', 'rear', 'right'])
  })

  it('左側望は 1600x1200、正面と後面は 1728x1152（実測値）', () => {
    expect(GEOMETRY.left.size).toEqual({ w: 1600, h: 1200 })
    expect(GEOMETRY.right.size).toEqual({ w: 1600, h: 1200 })
    expect(GEOMETRY.front.size).toEqual({ w: 1728, h: 1152 })
    expect(GEOMETRY.rear.size).toEqual({ w: 1728, h: 1152 })
  })

  it('右側望は左側望の鏡像（部位数が一致し、x が反転しとる）', () => {
    expect(GEOMETRY.right.parts.length).toBe(GEOMETRY.left.parts.length)
    const w = GEOMETRY.left.size.w
    for (let i = 0; i < GEOMETRY.left.parts.length; i++) {
      const l = GEOMETRY.left.parts[i]!
      const r = GEOMETRY.right.parts[i]!
      expect(r.id).toBe(l.id)
      expect(r.points[0]![0]).toBeCloseTo(w - l.points[0]![0], 9)
      expect(r.points[0]![1]).toBeCloseTo(l.points[0]![1], 9)
    }
  })

  it('深層筋の絵は存在せん（元アプリにも無い）。無い物を持たせん', () => {
    expect(GEOMETRY.left.images['muscle-deep']).toBeUndefined()
    expect(GEOMETRY.left.images['muscle-superficial']).toBeDefined()
  })
})

describe('解説文', () => {
  it('52件、層の内訳が元アプリと一致', () => {
    expect(STRUCTURES.length).toBe(52)
    const count = (l: string) => STRUCTURES.filter((s) => s.layer === l).length
    expect([count('skin'), count('muscle'), count('skeleton'), count('organs')]).toEqual([11, 17, 14, 10])
  })

  it('座標を持たん（座標は regions/ が正本）', () => {
    for (const s of STRUCTURES) {
      expect(s).not.toHaveProperty('x')
      expect(s).not.toHaveProperty('y')
    }
  })

  it('id が一意で、必須の解説が全部埋まっとる', () => {
    expect(new Set(STRUCTURES.map((s) => s.id)).size).toBe(52)
    for (const s of STRUCTURES) {
      expect(s.nameJa.length).toBeGreaterThan(0)
      expect(s.summary.length).toBeGreaterThan(0)
      expect(s.body.length).toBeGreaterThan(0)
      expect(s.views.length).toBeGreaterThan(0)
    }
  })

  it('深さを持つのは筋肉だけ', () => {
    for (const s of STRUCTURES) {
      if (s.depth !== undefined) expect(s.layer).toBe('muscle')
    }
  })
})
