import { en, ja, type MessageKey, type Messages } from './messages'

export const LOCALES = ['en', 'ja'] as const
export type Locale = (typeof LOCALES)[number]

/** 端末の言語が ja / en のどちらでもないときの行き先。海外向けは英語で受ける。 */
export const FALLBACK_LOCALE: Locale = 'en'

export type MessageParams = Readonly<Record<string, string | number>>
export type Catalogs = Readonly<Record<Locale, Partial<Messages>>>

export const CATALOGS: Readonly<Record<Locale, Messages>> = { en, ja }

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

/** 保存値から言語を読む。知らん値は「未選択」扱いにして端末の言語へ任せる。 */
export function parseLocale(raw: string | null | undefined): Locale | null {
  return isLocale(raw) ? raw : null
}

/**
 * BCP 47 の言語タグ列（端末の優先順）から使う言語を決める。
 * 先頭から見て最初に対応しとる言語を採る。どれも対応外なら英語。
 */
export function resolveLocale(tags: readonly (string | null | undefined)[]): Locale {
  for (const tag of tags) {
    const code = tag?.trim().toLowerCase().split(/[-_]/)[0]
    if (isLocale(code)) return code
  }
  return FALLBACK_LOCALE
}

function interpolate(template: string, params: MessageParams | undefined): string {
  if (params === undefined) return template
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = params[name]
    return value === undefined ? whole : String(value)
  })
}

/**
 * 文言を引く。指定言語に無いキーは英語 → 日本語 → キーそのものの順に落とす。
 * 型の上では両言語とも全キーを持つが、資源を差し替えた時に画面が空欄にならんよう実行時にも守る。
 */
export function translate(
  locale: Locale,
  key: MessageKey,
  params?: MessageParams,
  catalogs: Catalogs = CATALOGS,
): string {
  const template = catalogs[locale][key] ?? catalogs[FALLBACK_LOCALE][key] ?? catalogs.ja[key] ?? key
  return interpolate(template, params)
}

export type Translator = (key: MessageKey, params?: MessageParams) => string

export function translator(locale: Locale): Translator {
  return (key, params) => translate(locale, key, params)
}
