import { translator, type Translator } from '../core/i18n/translate'
/**
 * クラッシュ画面に出す・利用者が問い合わせに貼る診断テキスト。
 * 外部へは一切送らん（プライバシーポリシーの「収集ゼロ」）。利用者が自分でコピーして渡すだけ。
 * 保存データの中身や端末識別子は入れない。
 */
export type CrashReportInput = {
  readonly error: unknown
  readonly appName: string
  readonly version: string
  readonly buildNumber: string | null
  readonly platform: string
  readonly occurredAt: Date
  readonly componentStack?: string | null
}

const MAX_STACK_LINES = 6

export function errorSummary(error: unknown): string {
  if (error instanceof Error) return error.message ? `${error.name}: ${error.message}` : error.name
  if (typeof error === 'string') return error
  try {
    return JSON.stringify(error) ?? String(error)
  } catch {
    return String(error)
  }
}

function headLines(text: string | null | undefined, max: number): string[] {
  if (!text) return []
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .slice(0, max)
}

export function formatCrashReport(input: CrashReportInput, t: Translator = translator('ja')): string {
  const summary = errorSummary(input.error)
  // V8 等はスタックの1行目にエラー文そのものを置く。上の「エラー:」行と重複するので落とす
  const stackLines = input.error instanceof Error ? headLines(input.error.stack, MAX_STACK_LINES + 1) : []
  const stack = (stackLines[0] === summary ? stackLines.slice(1) : stackLines).slice(0, MAX_STACK_LINES)
  const components = headLines(input.componentStack, MAX_STACK_LINES)
  const lines = [
    t('crash.header', { appName: input.appName }),
    `${t('crash.version')}: ${input.version}${input.buildNumber ? ` (build ${input.buildNumber})` : ''}`,
    `${t('crash.platform')}: ${input.platform}`,
    `${t('crash.occurredAt')}: ${input.occurredAt.toISOString()}`,
    `${t('crash.error')}: ${summary}`,
  ]
  if (stack.length > 0) lines.push('', `${t('crash.stack')}:`, ...stack)
  if (components.length > 0) lines.push('', `${t('crash.components')}:`, ...components)
  return lines.join('\n')
}
