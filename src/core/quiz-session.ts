import type { QuizDirection } from './quiz'
import type { Depth, Layer, View, ViewBox } from './types'

export type QuizPhase = 'setup' | 'pick' | 'choice' | 'answer' | 'result' | 'summary'
export type QuizResult = { readonly ok: boolean; readonly note: string; readonly selectedId: string }

export type QuizSession = {
  readonly view: View
  readonly layer: Layer
  readonly depth: Depth
  readonly area: string
  readonly direction: QuizDirection
  readonly phase: QuizPhase
  readonly askedId: string | null
  readonly choiceIds: readonly string[]
  readonly result: QuizResult | null
  readonly tally: { readonly asked: number; readonly correct: number }
  readonly vb: ViewBox | null
  readonly sessionId: string | null
  readonly ordinal: number
  readonly questionToken: string | null
  readonly answeredToken: string | null
}

const INITIAL: QuizSession = {
  view: 'left', layer: 'muscle', depth: 'superficial', area: 'all', direction: 'figToName', phase: 'setup',
  askedId: null, choiceIds: [], result: null, tally: { asked: 0, correct: 0 }, vb: null,
  sessionId: null, ordinal: 0, questionToken: null, answeredToken: null,
}

let snapshot = INITIAL

export function getQuizSession(): QuizSession { return snapshot }

/** 解説から戻った時に同じ問題を再開する。ページ再読み込みでは初期状態へ戻る。 */
export function updateQuizSession(update: (current: QuizSession) => QuizSession): QuizSession {
  snapshot = update(snapshot)
  return snapshot
}

export function makeQuizSessionId(now = Date.now(), random = Math.random()): string {
  return `${now.toString(36)}-${random.toString(36).slice(2)}`
}

export function makeQuestionToken(sessionId: string, ordinal: number, now = Date.now()): string {
  return `${sessionId}:${now.toString(36)}:${ordinal}`
}

export function answerQuizQuestion(token: string, result: QuizResult): { readonly accepted: boolean; readonly session: QuizSession } {
  let accepted = false
  const session = updateQuizSession((current) => {
    if ((current.phase !== 'choice' && current.phase !== 'answer') || current.questionToken !== token || current.answeredToken === token) return current
    accepted = true
    return {
      ...current,
      phase: 'result',
      result,
      answeredToken: token,
      tally: { asked: current.tally.asked + 1, correct: current.tally.correct + (result.ok ? 1 : 0) },
    }
  })
  return { accepted, session }
}

/** テスト専用。通常の画面遷移ではセッションを消さない。 */
export function resetQuizSessionForTest(): void { snapshot = INITIAL }
