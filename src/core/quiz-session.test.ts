import { beforeEach, describe, expect, it } from 'vitest'
import { answerQuizQuestion, getQuizSession, makeQuestionToken, resetQuizSessionForTest, updateQuizSession } from './quiz-session'

describe('quiz session', () => {
  beforeEach(resetQuizSessionForTest)

  it('同じ問題への連打では得点を一度だけ加算する', () => {
    const token = makeQuestionToken('session', 1, 100)
    updateQuizSession((current) => ({ ...current, phase: 'answer', askedId: 'muscle-gluteus', sessionId: 'session', ordinal: 1, questionToken: token }))

    expect(answerQuizQuestion(token, { ok: true, note: '', selectedId: 'muscle-gluteus' }).accepted).toBe(true)
    expect(answerQuizQuestion(token, { ok: true, note: '', selectedId: 'muscle-gluteus' }).accepted).toBe(false)
    expect(getQuizSession().tally).toEqual({ asked: 1, correct: 1 })
  })

  it('前の問題の遅れて届いた操作を次の問題へ記録しない', () => {
    const oldToken = makeQuestionToken('session', 1, 100)
    const nextToken = makeQuestionToken('session', 2, 200)
    updateQuizSession((current) => ({ ...current, phase: 'answer', sessionId: 'session', ordinal: 2, questionToken: nextToken }))

    expect(answerQuizQuestion(oldToken, { ok: false, note: '遅延', selectedId: 'muscle-gluteus' }).accepted).toBe(false)
    expect(getQuizSession().tally).toEqual({ asked: 0, correct: 0 })
  })
})
