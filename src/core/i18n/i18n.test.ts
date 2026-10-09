import { describe, expect, it } from 'vitest'
import { AREA_PRESETS } from '../data/areas'
import { GEOMETRY, STRUCTURES } from '../data'
import { filterStructures } from '../search'
import type { Structure } from '../types'
import {
  areaLabel,
  CATALOGS,
  en,
  ja,
  LOCALES,
  parseLocale,
  regionEnOf,
  regionLabel,
  resolveLocale,
  structureAltName,
  structureName,
  structureText,
  translate,
  translator,
  type Catalogs,
  type MessageKey,
} from '.'

const placeholders = (template: string) => [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('言語リソース', () => {
  it('英語と日本語が同じキー集合を持つ（どちらにも欠けたキーが無い）', () => {
    const enKeys = Object.keys(en).sort()
    const jaKeys = Object.keys(ja).sort()
    expect(jaKeys.filter((k) => !enKeys.includes(k)), '英語に無いキー').toEqual([])
    expect(enKeys.filter((k) => !jaKeys.includes(k)), '日本語に無いキー').toEqual([])
  })

  it.each(LOCALES)('%s: 空の文言が無い', (locale) => {
    const empty = Object.entries(CATALOGS[locale]).filter(([, v]) => v.trim() === '')
    expect(empty).toEqual([])
  })

  it('プレースホルダの集合が両言語で一致する', () => {
    const mismatched = (Object.keys(en) as MessageKey[]).filter(
      (key) => placeholders(en[key]).join(',') !== placeholders(ja[key]).join(','),
    )
    expect(mismatched).toEqual([])
  })

  it('英語リソースに和文が混ざっていない（切替ボタンの「日本語」と言語名の併記だけ例外）', () => {
    const allowed: MessageKey[] = ['language.toggle', 'language.toggleLabel']
    const cjk = /[\u3040-\u30ff\u4e00-\u9fff]/
    const leaked = (Object.keys(en) as MessageKey[]).filter((key) => !allowed.includes(key) && cjk.test(en[key]))
    expect(leaked).toEqual([])
  })
})

describe('translate', () => {
  it('プレースホルダを埋める', () => {
    expect(translate('en', 'saved.removed', { name: 'Liver' })).toBe('Removed Liver from saved.')
    expect(translate('ja', 'saved.removed', { name: '肝臓' })).toBe('肝臓 の保存を解除しました。')
    expect(translate('ja', 'anatomy.unplacedCount', { count: 3 })).toBe('未配置 3 件 — 部位一覧で名前と解説を確認できます。')
  })

  it('渡されなかったプレースホルダは消さずに残す（欠けが画面で見つかるように）', () => {
    expect(translate('en', 'saved.removed')).toBe('Removed {name} from saved.')
  })

  it('指定言語に無いキーは英語へ、英語にも無ければ日本語へ、どこにも無ければキーへ落ちる', () => {
    const partial: Catalogs = {
      en: { 'save.save': 'Save' },
      ja: { 'save.save': '保存', 'save.saved': '保存済み' },
    }
    expect(translate('ja', 'save.save', undefined, partial)).toBe('保存')
    expect(translate('en', 'save.saved', undefined, partial)).toBe('保存済み')
    expect(translate('ja', 'mastery.mark', undefined, { en: { 'mastery.mark': 'Mark as learned' }, ja: {} })).toBe(
      'Mark as learned',
    )
    expect(translate('ja', 'mastery.mark', undefined, { en: {}, ja: {} })).toBe('mastery.mark')
  })

  it('translator は言語を固定した関数を返す', () => {
    expect(translator('en')('tab.catalog')).toBe('Catalog')
    expect(translator('ja')('tab.catalog')).toBe('図鑑')
  })
})

describe('言語の決定', () => {
  it.each([
    [['ja-JP'], 'ja'],
    [['ja'], 'ja'],
    [['en-US'], 'en'],
    [['en_GB'], 'en'],
    [['fr-FR', 'ja-JP'], 'ja'],
    [['de-DE'], 'en'],
    [[], 'en'],
    [[null, undefined, ''], 'en'],
  ] as const)('%j → %s', (tags, expected) => {
    expect(resolveLocale(tags)).toBe(expected)
  })

  it('保存値は ja / en だけを受け、それ以外は未選択扱い', () => {
    expect(parseLocale('ja')).toBe('ja')
    expect(parseLocale('en')).toBe('en')
    expect(parseLocale('fr')).toBeNull()
    expect(parseLocale('')).toBeNull()
    expect(parseLocale(null)).toBeNull()
  })
})

describe('部位データの表示言語', () => {
  it('全部位の region に英語の区分名がある', () => {
    const missing = [...new Set(STRUCTURES.map((s) => s.region))].filter((r) => regionEnOf(r) === undefined)
    expect(missing).toEqual([])
  })

  it('全部位に英名がある', () => {
    expect(STRUCTURES.filter((s) => s.nameEn.trim() === '').map((s) => s.id)).toEqual([])
  })

  it('大まかな場所はプリセットも図のデータも全部英語名を持つ', () => {
    const t = translator('en')
    const areas = [...AREA_PRESETS, ...Object.values(GEOMETRY).flatMap((g) => g.areas)]
    expect(areas.filter((a) => areaLabel(a, t) === a.nameJa).map((a) => a.id)).toEqual([])
  })

  it('知らない場所 id は和名へ落ちる', () => {
    expect(areaLabel({ id: 'unknown', nameJa: '謎' }, translator('en'))).toBe('謎')
  })

  it('名前と区分名は表示言語で切り替わる', () => {
    const liver = STRUCTURES.find((s) => s.nameEn === 'Liver')
    expect(liver).toBeDefined()
    if (liver === undefined) return
    expect(structureName(liver, 'en')).toBe('Liver')
    expect(structureName(liver, 'ja')).toBe(liver.nameJa)
    expect(structureAltName(liver, 'en')).toBe(liver.nameJa)
    expect(structureAltName(liver, 'ja')).toBe('Liver')
    expect(regionLabel('腹腔', 'en')).toBe('Abdominal cavity')
    expect(regionLabel('腹腔', 'ja')).toBe('腹腔')
    expect(regionLabel('未知の区分', 'en')).toBe('未知の区分')
  })

  it('英訳が無い解説は英語表示でも日本語原文へ落ち、lang で日本語だと分かる', () => {
    const s = STRUCTURES[0]
    expect(s).toBeDefined()
    if (s === undefined) return
    expect(structureText(s, 'en')).toMatchObject({ summary: s.summary, body: s.body, lang: 'ja' })
    expect(structureText(s, 'ja').lang).toBe('ja')
  })

  it('監修済みの英訳があれば英語表示ではそれを出し、日本語表示では原文のまま', () => {
    const base = STRUCTURES[0]
    if (base === undefined) throw new Error('部位データが空')
    const s: Structure = { ...base, en: { summary: 'S', body: 'B', function: 'F' } }
    expect(structureText(s, 'en')).toEqual({ summary: 'S', body: 'B', function: 'F', lang: 'en' })
    expect(structureText(s, 'ja').summary).toBe(base.summary)
  })
})

describe('検索は表示言語に関係なく日本語でも英語でも引ける', () => {
  const ids = (query: string) => filterStructures(STRUCTURES, { query }).map((s) => s.id)

  it('英名・和名のどちらでも肝臓が当たる', () => {
    const liver = STRUCTURES.find((s) => s.nameEn === 'Liver')?.id
    expect(ids('liver')).toContain(liver)
    expect(ids('Liver')).toContain(liver)
    expect(ids('肝臓')).toContain(liver)
  })

  it('英語の区分名でも引ける', () => {
    const forelimb = STRUCTURES.filter((s) => s.region === '前肢').map((s) => s.id)
    expect(forelimb.length).toBeGreaterThan(0)
    expect(ids('forelimb')).toEqual(expect.arrayContaining(forelimb))
  })
})
