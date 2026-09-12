import { describe, expect, it } from 'vitest'
import { kanaOf } from './data/kana'
import { STRUCTURES } from './data/structures'
import { filterStructures, normalizeQuery } from './search'

describe('normalizeQuery', () => {
  it('前後の空白と大文字を落とす', () => {
    expect(normalizeQuery('  Heart ')).toBe('heart')
  })

  it('カタカナをひらがなに畳む', () => {
    expect(normalizeQuery('カンゾウ')).toBe('かんぞう')
  })
})

describe('filterStructures', () => {
  it('何も指定せんと全件', () => {
    expect(filterStructures(STRUCTURES, {}).length).toBe(STRUCTURES.length)
  })

  it('和名で引ける', () => {
    const rows = filterStructures(STRUCTURES, { query: '咬筋' })
    expect(rows.map((s) => s.id)).toEqual(['muscle-masseter'])
  })

  it('ラテン名と英名で引ける', () => {
    expect(filterStructures(STRUCTURES, { query: 'masseter' }).map((s) => s.id)).toContain('muscle-masseter')
    expect(filterStructures(STRUCTURES, { query: 'liver' }).map((s) => s.id)).toEqual(['organ-liver'])
  })

  it('読み仮名で引ける（漢字が難しい部位用）', () => {
    expect(filterStructures(STRUCTURES, { query: 'きこう' }).map((s) => s.id)).toEqual(['skin-withers'])
    expect(filterStructures(STRUCTURES, { query: 'かんぞう' }).map((s) => s.id)).toEqual(['organ-liver'])
  })

  it('カタカナ入力も読み仮名に当たる', () => {
    expect(filterStructures(STRUCTURES, { query: 'カンゾウ' }).map((s) => s.id)).toEqual(['organ-liver'])
  })

  it('層で絞れる', () => {
    const rows = filterStructures(STRUCTURES, { layer: 'skeleton' })
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((s) => s.layer === 'skeleton')).toBe(true)
  })

  it('大まかな場所で絞れる（頸部は頸へ寄る）', () => {
    const rows = filterStructures(STRUCTURES, { area: 'neck' })
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.map((s) => s.region)).toContain('頸部')
    expect(rows.map((s) => s.id)).not.toContain('organ-liver')
  })

  it('向きで絞れる（後面に出ない部位は落ちる）', () => {
    const rows = filterStructures(STRUCTURES, { view: 'rear' })
    expect(rows.length).toBe(10)
    expect(rows.every((s) => s.views.includes('rear'))).toBe(true)
  })

  it('組み合わせ: 筋肉かつ前肢', () => {
    const rows = filterStructures(STRUCTURES, { layer: 'muscle', area: 'fore' })
    expect(rows.every((s) => s.layer === 'muscle')).toBe(true)
    expect(rows.map((s) => s.id)).toContain('muscle-triceps')
    expect(rows.map((s) => s.id)).not.toContain('muscle-masseter')
  })

  it('引けん時は空（行き止まりを誤魔化さん）', () => {
    expect(filterStructures(STRUCTURES, { query: 'そんな部位はない' })).toEqual([])
  })
})

describe('読み仮名の網羅', () => {
  it('全52件に読みがある（抜けると読みで引けん部位が黙って出る）', () => {
    const missing = STRUCTURES.filter((s) => kanaOf(s.id) === undefined).map((s) => s.id)
    expect(missing).toEqual([])
  })
})
