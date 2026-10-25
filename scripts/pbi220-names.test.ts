import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import baseline from '../doc/review/2026-10-25-pbi-220-names/baseline.json'
import review from '../doc/review/2026-10-25-pbi-220-names/review.json'
import { STRUCTURES } from '../src/core/data/structures'
import { NAME_ALIASES } from '../src/core/data/name-aliases'
import { filterStructures } from '../src/core/search'
import type { Structure } from '../src/core/types'

const digest = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex')
const ids = review.rows.map((row) => row.id)

describe('#220 原典検収後の名称・入力互換・非変更範囲', () => {
  it('87 IDの順序・層・深さ・領域・向きを変えず、対象外79項目を保持する', () => {
    expect(STRUCTURES.map((entry) => entry.id)).toEqual(baseline.ids)
    expect(STRUCTURES).toHaveLength(87)
    expect(STRUCTURES.map(({ id, layer, depth, region, views }) => ({ id, layer, depth, region, views }))).toEqual(baseline.structuralMetadata)
    expect(digest(JSON.stringify(STRUCTURES.filter((entry) => !ids.includes(entry.id))))).toBe(baseline.otherStructuresSha256)
  })

  it('名称原典のレビューで図版・座標を変えない', () => {
    for (const [path, hash] of Object.entries(baseline.geometrySha256)) {
      const bytes = readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)))
      expect(digest(bytes), path).toBe(hash)
    }
  })

  for (const row of review.rows) it(`${row.id}: 原典判定の名称と許可したテキスト差分だけを適用する`, () => {
    const current = STRUCTURES.find((entry) => entry.id === row.id)!
    const old = baseline.targets.find((entry) => entry?.id === row.id)!
    expect({ nameJa: current.nameJa, nameEn: current.nameEn, nameLa: current.nameLa }).toEqual(row.after)
    for (const key of Object.keys(old)) {
      if (!row.allowedChangedStructureFields.includes(key)) expect(current[key as keyof Structure], `${row.id}.${key}`).toEqual(old[key as keyof typeof old])
    }
    for (const query of [old.nameJa, old.nameEn, old.nameLa, current.nameJa, current.nameEn, current.nameLa]) {
      expect(filterStructures(STRUCTURES, { query }).map((entry) => entry.id), query).toContain(row.id)
    }
  })

  it('旧読みとローマ字を保ち、新しい正式表記の読みでも同じIDへ到達する', () => {
    for (const [id, queries] of [
      ['bone-metatarsus', ['ちゅうそくこつ', 'ちゅうしこつ', 'chuushikotsu']],
      ['bone-tarsus', ['そっこんこつ', 'ふこつ', 'fukotsu']],
      ['bone-sesamoid', ['きんいしゅしこつ', 'しゅしこつ']],
      ['muscle-brachiocephalicus', ['じょうわんとうきん', 'わんとうきん', 'wantoukin']],
    ] as const) for (const query of queries) expect(filterStructures(STRUCTURES, { query }).map((entry) => entry.id), query).toContain(id)
  })

  it('ウマの胸骨頭筋と胸骨下顎筋を別IDへ分割せず、両名で検索できる', () => {
    for (const query of ['胸骨頭筋', '胸骨下顎筋', 'きょうこつとうきん', 'Sternomandibularis', 'Sternocephalicus']) {
      expect(filterStructures(STRUCTURES, { query }).map((entry) => entry.id)).toEqual(['muscle-sternocephalicus'])
    }
    expect(STRUCTURES.find((entry) => entry.id === 'muscle-sternocephalicus')!.nameJa).toBe('胸骨下顎筋')
    expect(Object.keys(NAME_ALIASES).every((id) => ids.includes(id))).toBe(true)
  })

  it('骨群の表示を関節そのものとせず、近位種子骨の限定と複数を保つ', () => {
    for (const id of ['bone-carpus', 'bone-tarsus']) {
      const entry = STRUCTURES.find((candidate) => candidate.id === id)!
      expect(entry.body).toContain('骨群です。')
      expect(entry.function).toContain('関節を構成する')
    }
    expect(STRUCTURES.find((entry) => entry.id === 'bone-carpus')!.body).toContain('中間手根骨')
    expect(STRUCTURES.find((entry) => entry.id === 'bone-sesamoid')).toMatchObject({ nameJa: '近位種子骨', nameEn: 'Proximal sesamoid bones', nameLa: 'Ossa sesamoidea proximalia' })
    expect(STRUCTURES.filter((entry) => ids.includes(entry.id)).every((entry) => !entry.body.includes('中趾骨'))).toBe(true)
  })

  it('8名称判定と正誤反映PDFの取得不足を区別し、位置・全説明・親PBIを承認しない', () => {
    expect(review.rows).toHaveLength(8)
    expect(new Set(ids).size).toBe(8)
    expect(review.rows.every((row) => ['supported', 'incorrect', 'insufficient-evidence'].includes(row.beforeVerdict))).toBe(true)
    expect(review.rows.find((row) => row.id === 'bone-metatarsus')!.beforeVerdict).toBe('incorrect')
    expect(review.currentCorrectedPdfReview).toBe('insufficient-evidence')
    expect(review.overall185Complete).toBe(false)
    expect(review.rows.every((row) => row.fullDescriptionReview === 'not_performed' && row.positionReview === 'not_performed' && row.vendorIdentityReview === 'not_performed')).toBe(true)
    for (const row of review.rows) expect(row.sourceReferences.some((reference) => reference.source === 'J2022' && reference.pdfPageOneBased! > 0)).toBe(true)
  })
})
