import { describe, expect, it } from 'vitest'
import { STRUCTURES } from './data'
import { SUPERVISION_RECORDS } from './data/supervision'
import {
  partSupervisionLabel,
  summarizeSupervision,
  supervisionNotice,
  supervisionOf,
  UNSUPERVISED_NOTICE,
  validateSupervisionRecords,
  type SupervisionRecord,
} from './supervision'

const gluteus = { id: 'muscle-gluteus', layer: 'muscle', nameJa: '中殿筋' } as const
const femur = { id: 'bone-femur', layer: 'skeleton', nameJa: '大腿骨' } as const
const liver = { id: 'organ-liver', layer: 'organs', nameJa: '肝臓' } as const
const parts = [gluteus, femur, liver]

const vet = (overrides: Partial<SupervisionRecord> = {}): SupervisionRecord => ({
  supervisor: { name: '山田 太郎', affiliation: '〇〇大学', namePublishConsent: true },
  reviewedOn: '2026-11-01',
  scope: { layers: ['skeleton'] },
  ...overrides,
})

describe('監修記録が空のとき', () => {
  it('どの部位も未監修', () => {
    expect(supervisionOf(gluteus, [])).toEqual({ status: 'unsupervised' })
  })

  it('全体は none で、ヘッダ注記は従来の文言のまま', () => {
    const summary = summarizeSupervision(parts, [])
    expect(summary).toEqual({ level: 'none', supervisedCount: 0, total: 3, credits: [], supervisedNames: [] })
    expect(supervisionNotice(summary)).toBe('学習デモ — 解剖学的正確性は未監修')
    expect(UNSUPERVISED_NOTICE).toBe('学習デモ — 解剖学的正確性は未監修')
  })

  it('部位詳細は「未監修」と読める', () => {
    expect(partSupervisionLabel({ status: 'unsupervised' })).toMatch(/^未監修/)
  })
})

describe('監修範囲の判定', () => {
  it('層で指定した範囲はその層の部位だけが監修済み', () => {
    const records = [vet()]
    expect(supervisionOf(femur, records).status).toBe('supervised')
    expect(supervisionOf(gluteus, records).status).toBe('unsupervised')
  })

  it('部位IDで指定した範囲は層を問わず効き、層指定と和集合になる', () => {
    const records = [vet({ scope: { layers: ['skeleton'], partIds: ['organ-liver'] } })]
    expect(supervisionOf(liver, records).status).toBe('supervised')
    expect(supervisionOf(femur, records).status).toBe('supervised')
    expect(supervisionOf(gluteus, records).status).toBe('unsupervised')
  })

  it('一部だけ監修済みなら partial、全部なら full', () => {
    const partial = summarizeSupervision(parts, [vet()])
    expect(partial.level).toBe('partial')
    expect(partial.supervisedCount).toBe(1)
    expect(partial.supervisedNames).toEqual(['大腿骨'])
    expect(supervisionNotice(partial)).not.toBe(UNSUPERVISED_NOTICE)

    const full = summarizeSupervision(parts, [vet({ scope: { layers: ['muscle', 'skeleton', 'organs'] } })])
    expect(full.level).toBe('full')
    expect(supervisionNotice(full)).toMatch(/獣医師監修済み/)
  })

  it('対象部位に一つも当たらない記録は監修者一覧に出さない', () => {
    const summary = summarizeSupervision(parts, [vet({ scope: { layers: ['skin'] } })])
    expect(summary.level).toBe('none')
    expect(summary.credits).toEqual([])
  })
})

describe('監修者名の表示', () => {
  it('掲載許可があれば肩書き・氏名・所属・日付を出す', () => {
    const label = partSupervisionLabel(supervisionOf(femur, [vet()]))
    expect(label).toBe('監修済み — 獣医師 山田 太郎（〇〇大学）・2026-11-01')
  })

  it('掲載許可が無ければ氏名を出さない', () => {
    const record = vet({ supervisor: { name: '山田 太郎', namePublishConsent: false } })
    const label = partSupervisionLabel(supervisionOf(femur, [record]))
    expect(label).toBe('監修済み — 獣医師（氏名非公開）・2026-11-01')
    expect(label).not.toContain('山田')
  })
})

describe('監修記録の検証', () => {
  const known = new Set(parts.map((part) => part.id))

  it('正しい記録はエラー無し', () => {
    expect(validateSupervisionRecords([vet({ scope: { partIds: ['bone-femur'] } })], known)).toEqual([])
  })

  it('存在しない部位ID・日付の崩れ・空の範囲・空の氏名を拾う', () => {
    const errors = validateSupervisionRecords(
      [
        vet({ scope: { partIds: ['bogus'] } }),
        vet({ reviewedOn: '2026-02-30' }),
        vet({ reviewedOn: '2026/11/01' }),
        vet({ scope: {} }),
        vet({ supervisor: { name: ' ', namePublishConsent: true } }),
      ],
      known,
    )
    expect(errors).toHaveLength(5)
    expect(errors[0]).toContain('bogus')
  })

  it('同梱の監修記録は検証を通る', () => {
    expect(validateSupervisionRecords(SUPERVISION_RECORDS, new Set(STRUCTURES.map((s) => s.id)))).toEqual([])
  })
})
