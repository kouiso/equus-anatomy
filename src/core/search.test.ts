import { describe, expect, it } from 'vitest'
import { kanaAliasOf, kanaOf } from './data/kana'
import { regionEnOf } from './i18n/content'
import { STRUCTURES } from './data/structures'
import { kanaToRomaji } from './romaji'
import { filterStructures, normalizeQuery } from './search'

describe('normalizeQuery', () => {
  it('前後の空白と大文字を落とす', () => {
    expect(normalizeQuery('  Heart ')).toBe('heart')
  })

  it('カタカナをひらがなに畳む', () => {
    expect(normalizeQuery('カンゾウ')).toBe('かんぞう')
  })

  it('半角カナもひらがなに畳む（#69）', () => {
    expect(normalizeQuery('ｶﾝｿﾞｳ')).toBe('かんぞう')
  })

  it('全角英数を半角に揃える（#69）', () => {
    expect(normalizeQuery('ＢＯＮＥ')).toBe('bone')
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

  it('半角カナ入力も読み仮名に当たる（#69）', () => {
    expect(filterStructures(STRUCTURES, { query: 'ｶﾝｿﾞｳ' }).map((s) => s.id)).toEqual(['organ-liver'])
  })

  it('読みのローマ字で引ける（#71）', () => {
    const kubi = filterStructures(STRUCTURES, { query: 'kubi' }).map((s) => s.id)
    expect(kubi).toContain('skin-neck')
    expect(kubi).toContain('bone-cervical')
    expect(filterStructures(STRUCTURES, { query: 'kyouzen' }).map((s) => s.id)).toEqual(['skin-chest'])
  })

  it('総称は region / layer から導出される（#71: ずれたら落ちる）', () => {
    // region 頭部 の部位は全部 atama で出る。頸部→kubi、前肢/後肢→ashi も同じ対応。
    // フィルタが 0 件だとループ自体が空振りするので、件数を先に固定する
    const atama = new Set(filterStructures(STRUCTURES, { query: 'atama' }).map((s) => s.id))
    const headRegion = STRUCTURES.filter((s) => s.region === '頭部')
    expect(headRegion.length, '頭部の部位が無いと総なめループが空振りする').toBeGreaterThan(0)
    for (const s of headRegion) {
      expect(atama, `${s.id} が atama で引けん`).toContain(s.id)
    }
    const kubi = new Set(filterStructures(STRUCTURES, { query: 'kubi' }).map((s) => s.id))
    const neckRegion = STRUCTURES.filter((s) => s.region === '頸部')
    expect(neckRegion.length, '頸部の部位が無いと総なめループが空振りする').toBeGreaterThan(0)
    for (const s of neckRegion) {
      expect(kubi, `${s.id} が kubi で引けん`).toContain(s.id)
    }
    const ashi = new Set(filterStructures(STRUCTURES, { query: 'ashi' }).map((s) => s.id))
    const limbRegion = STRUCTURES.filter((s) => s.region === '前肢' || s.region === '後肢')
    expect(limbRegion.length, '四肢の部位が無いと総なめループが空振りする').toBeGreaterThan(0)
    for (const s of limbRegion) {
      expect(ashi, `${s.id} が ashi で引けん`).toContain(s.id)
    }
    // 骨は層で張る。skeleton 全件が hone で出る
    const hone = new Set(filterStructures(STRUCTURES, { query: 'hone' }).map((s) => s.id))
    const skeletons = STRUCTURES.filter((s) => s.layer === 'skeleton')
    expect(skeletons.length, 'skeleton の部位が無いと総なめループが空振りする').toBeGreaterThan(0)
    for (const s of skeletons) {
      expect(hone, `${s.id} が hone で引けん`).toContain(s.id)
    }
  })

  it('総称のローマ字で引ける（#71: hone→骨、ashi→四肢の部位）', () => {
    const hone = filterStructures(STRUCTURES, { query: 'hone' })
    expect(hone.length).toBeGreaterThan(0)
    expect(hone.every((s) => s.id.startsWith('bone-'))).toBe(true)
    expect(hone.map((s) => s.id)).toContain('bone-cannon')
    const ashi = filterStructures(STRUCTURES, { query: 'ashi' })
    expect(ashi.map((s) => s.id)).toContain('muscle-triceps')
    expect(ashi.map((s) => s.id)).toContain('bone-tibia')
  })

  it('長音・促音の書き方の揺れも拾う（#71）', () => {
    expect(filterStructures(STRUCTURES, { query: 'kyozen' }).map((s) => s.id)).toEqual(['skin-chest'])
    expect(filterStructures(STRUCTURES, { query: 'rokotsu' }).map((s) => s.id)).toEqual(['bone-ribs'])
  })

  it('ヘボン式と訓令式がモーラごとに混ざった綴りでも引ける（#130）', () => {
    // じょ は訓令式 zyo、つ は Hepburn tsu
    expect(filterStructures(STRUCTURES, { query: 'zyouwankotsu' }).map((s) => s.id)).toEqual(['bone-humerus'])
    expect(filterStructures(STRUCTURES, { query: 'jouwankotu' }).map((s) => s.id)).toEqual(['bone-humerus'])
    expect(filterStructures(STRUCTURES, { query: 'sinnzou' }).map((s) => s.id)).toEqual(['organ-heart'])
  })

  it('長音 ei→e を書かない綴りでも引ける（#130）', () => {
    expect(filterStructures(STRUCTURES, { query: 'ketsui' }).map((s) => s.id)).toEqual(['bone-cervical'])
    expect(filterStructures(STRUCTURES, { query: 'keitsui' }).map((s) => s.id)).toEqual(['bone-cervical'])
  })

  it('#130 の表の訓令式・IME 綴りがヘボン式と同じ部位を返す', () => {
    const pairs: readonly (readonly [string, string])[] = [
      ['sinzou', 'shinzou'],
      ['hihukukin', 'hifukukin'],
      ['kotuban', 'kotsuban'],
      ['zyouwankotsu', 'jouwankotsu'],
      ['ketsui', 'keitsui'],
    ]
    for (const [variant, hepburn] of pairs) {
      const expected = filterStructures(STRUCTURES, { query: hepburn }).map((s) => s.id)
      expect(expected.length, `${hepburn} が 0 件だと比べる意味が無い`).toBeGreaterThan(0)
      expect(filterStructures(STRUCTURES, { query: variant }).map((s) => s.id), variant).toEqual(expected)
    }
  })

  it('綴りの畳み込みで英字の検索結果が増えん（#130: nameLa/nameEn・短い入力・e2e のクエリ）', () => {
    // 畳み込み前の索引（素の文字列とローマ字の別表記の部分一致）で引ける部位と同じになること
    const plainHits = (q: string): string[] =>
      STRUCTURES.filter((s) => {
        const kana = [kanaOf(s.id) ?? '', ...kanaAliasOf(s)]
        const text = [s.nameJa, s.nameLa, s.nameEn, s.region, regionEnOf(s.region) ?? '', s.summary, ...kana, ...kana.flatMap(kanaToRomaji)]
        return normalizeQuery(text.join(' ')).includes(q)
      }).map((s) => s.id)
    const latin = new Set<string>()
    for (const s of STRUCTURES) {
      for (const w of `${s.nameLa} ${s.nameEn}`.toLowerCase().split(/[^a-z]+/)) {
        if (w.length >= 3) latin.add(w)
      }
    }
    expect(latin.size, 'nameLa/nameEn の語が無いと比べる意味が無い').toBeGreaterThan(0)
    const letters = 'abcdefghijklmnopqrstuvwxyz'
    const short: string[] = []
    for (const a of letters) {
      for (const b of letters) short.push(a + b)
    }
    const queries = [...latin, ...short, 'tibia', 'hone', 'kubi', 'spin', 'atama', 'ashi']
    expect(queries.length).toBeGreaterThan(0)
    for (const q of queries) {
      expect(filterStructures(STRUCTURES, { query: q }).map((s) => s.id), q).toEqual(plainHits(q))
    }
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
