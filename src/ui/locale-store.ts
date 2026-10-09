import { getLocales } from 'expo-localization'
import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { Platform } from 'react-native'
import { FALLBACK_LOCALE, resolveLocale, translate, type Locale, type Translator } from '../core/i18n'
import { LocaleController, type LocaleSnapshot } from './locale-controller'
import { storage } from './locale-storage'

function detectDeviceLocale(): Locale {
  try {
    return resolveLocale(getLocales().map((l) => l.languageTag))
  } catch {
    return FALLBACK_LOCALE
  }
}

const controller = new LocaleController(storage, detectDeviceLocale)

/**
 * 静的書き出しの HTML は +html.tsx の lang="ja" と揃えて日本語で焼く。
 * ハイドレーション中は React がこちらを使い、終わってから端末・保存値の言語へ描き直すので
 * SSR 済み HTML と初回レンダーが食い違わん（React #418 を出さん）。
 */
const SERVER: LocaleSnapshot = { locale: 'ja', explicit: false, ready: true }
const getServerSnapshot = () => SERVER

function useSnapshot(): LocaleSnapshot {
  return useSyncExternalStore(controller.subscribe, controller.getSnapshot, getServerSnapshot)
}

export function useLocale(): Locale {
  return useSnapshot().locale
}

export function useT(): Translator {
  const locale = useLocale()
  return useCallback<Translator>((key, params) => translate(locale, key, params), [locale])
}

export function setLocale(locale: Locale): void {
  controller.setLocale(locale)
}

/** hooks を使えん所（クラスコンポーネント等）向け。描画のたびに今の言語で引く。 */
export function translateNow(...args: Parameters<Translator>): string {
  return translate(controller.getSnapshot().locale, ...args)
}

/**
 * ルートで1回呼ぶ。native は保存値を読み終えるまで false を返すので、スプラッシュを保持して
 * 端末の言語 → 保存した言語へ切り替わる一瞬のちらつきを見せん。Web は <html lang> を追従させる。
 */
export function useLocaleReady(): boolean {
  const { locale, ready } = useSnapshot()
  useEffect(() => {
    controller.load().catch(() => {})
  }, [])
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.documentElement.lang = locale
  }, [locale])
  return ready
}
