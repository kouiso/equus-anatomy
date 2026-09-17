import { describe, expect, it } from 'vitest'
import { applyMark, isLearned, recordOf } from './mastery'

const NOW = 1_000_000

describe('覚えたの判定', () => {
  it('記録が無い部位は「まだ」', () => {
    expect(isLearned(recordOf({}, 'organ-liver'))).toBe(false)
  })

  it('手動マークしたら「覚えた」', () => {
    const rec = applyMark(recordOf({}, 'a'), true, NOW)
    expect(isLearned(rec)).toBe(true)
    // 外したら戻る
    expect(isLearned(applyMark(rec, false, NOW + 1))).toBe(false)
  })

  it('削除済みテストの連続正解記録は「覚えた」のまま残る', () => {
    // 既存記録の streak は読み続ける。採点処理は無いが記録は消さん
    const rec = { correct: 2, wrong: 0, streak: 2, lastAt: NOW, marked: false }
    expect(isLearned(rec)).toBe(true)
  })

  it('連続正解で覚えた部位も「まだ」に戻せる', () => {
    const rec = { correct: 2, wrong: 0, streak: 2, lastAt: NOW, marked: false }
    // streak を切らんと一生「まだ」に戻らん
    expect(isLearned(applyMark(rec, false, NOW + 2))).toBe(false)
  })
})
