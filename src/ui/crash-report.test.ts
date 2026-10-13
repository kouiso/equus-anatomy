import { describe, expect, it } from 'vitest'
import { errorSummary, formatCrashReport } from './crash-report'

const base = {
  appName: 'EQUUS 馬体解剖',
  version: '0.1.0',
  buildNumber: null,
  platform: 'web',
  occurredAt: new Date('2026-10-07T01:02:03.000Z'),
}

describe('クラッシュ情報のテキスト', () => {
  it('アプリ名・バージョン・時刻・エラー文を含む', () => {
    const error = new TypeError('x is undefined')
    error.stack = 'TypeError: x is undefined\n    at Foo (app.js:1:2)\n'
    const text = formatCrashReport({ ...base, error })
    expect(text.split('\n').slice(0, 5)).toEqual([
      'EQUUS 馬体解剖 クラッシュ情報',
      'バージョン: 0.1.0',
      'プラットフォーム: web',
      '発生時刻: 2026-10-07T01:02:03.000Z',
      'エラー: TypeError: x is undefined',
    ])
    expect(text).toContain('at Foo (app.js:1:2)')
    // スタック1行目のエラー文は「エラー:」行と重複するので出さない
    expect(text.match(/x is undefined/g)).toHaveLength(1)
  })

  it('ビルド番号があれば版に添える', () => {
    expect(formatCrashReport({ ...base, buildNumber: '42', error: new Error('e') })).toContain(
      'バージョン: 0.1.0 (build 42)',
    )
  })

  it('長いスタックとコンポーネントスタックは先頭だけに切る', () => {
    const error = new Error('deep')
    error.stack = Array.from({ length: 50 }, (_, i) => `at f${i}`).join('\n')
    const componentStack = Array.from({ length: 50 }, (_, i) => `in C${i}`).join('\n')
    const text = formatCrashReport({ ...base, error, componentStack })
    expect(text).toContain('at f5')
    expect(text).not.toContain('at f6')
    expect(text).toContain('in C5')
    expect(text).not.toContain('in C6')
  })

  it('Error 以外が投げられても落ちずに文字にする', () => {
    expect(errorSummary('boom')).toBe('boom')
    expect(errorSummary({ code: 1 })).toBe('{"code":1}')
    expect(errorSummary(undefined)).toBe('undefined')
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    expect(errorSummary(cyclic)).toBe('[object Object]')
  })
})
