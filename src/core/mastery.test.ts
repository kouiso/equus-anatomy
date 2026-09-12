import { describe, expect, it } from 'vitest'
import { applyAnswer, applyMark, isLearned, nextToReview, recordOf, type MasteryMap } from './mastery'

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

  it('テスト2連続正解で「覚えた」になる', () => {
    let rec = recordOf({}, 'a')
    rec = applyAnswer(rec, true, NOW)
    expect(isLearned(rec)).toBe(false)
    rec = applyAnswer(rec, true, NOW + 1)
    expect(isLearned(rec)).toBe(true)
  })

  it('連続正解で覚えた部位も「まだ」に戻せる', () => {
    let rec = recordOf({}, 'a')
    rec = applyAnswer(rec, true, NOW)
    rec = applyAnswer(rec, true, NOW + 1)
    expect(isLearned(rec)).toBe(true)
    // streak を切らんと一生「まだ」に戻らん
    rec = applyMark(rec, false, NOW + 2)
    expect(isLearned(rec)).toBe(false)
  })

  it('間違うと連続は切れる。正解・誤りの累計は残る', () => {
    let rec = recordOf({}, 'a')
    rec = applyAnswer(rec, true, NOW)
    rec = applyAnswer(rec, false, NOW + 1)
    expect(rec.streak).toBe(0)
    expect(isLearned(rec)).toBe(false)
    rec = applyAnswer(rec, true, NOW + 2)
    rec = applyAnswer(rec, true, NOW + 3)
    expect(isLearned(rec)).toBe(true)
    expect(rec.correct).toBe(3)
    expect(rec.wrong).toBe(1)
    expect(rec.lastAt).toBe(NOW + 3)
  })
})

describe('次に触る部位の順', () => {
  it('まだ → 覚えた。まだの中は 未着手 → 誤り多い → 古い順', () => {
    const map: MasteryMap = {
      learned: { correct: 2, wrong: 0, streak: 2, lastAt: NOW, marked: false },
      'wrong-many': { correct: 0, wrong: 3, streak: 0, lastAt: NOW, marked: false },
      'wrong-few': { correct: 0, wrong: 1, streak: 0, lastAt: NOW + 100, marked: false },
      old: { correct: 0, wrong: 1, streak: 0, lastAt: NOW, marked: false },
    }
    const order = nextToReview(map, ['learned', 'old', 'wrong-few', 'untouched', 'wrong-many'])
    expect(order).toEqual(['untouched', 'wrong-many', 'old', 'wrong-few', 'learned'])
  })
})
