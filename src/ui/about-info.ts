import Constants from 'expo-constants'
import { Linking, Platform } from 'react-native'

const PAGES_ORIGIN = 'https://equus-anatomy-84f.pages.dev'
const REPO_URL = 'https://github.com/kouiso/equus-anatomy'

export type AppInfo = {
  readonly name: string
  readonly version: string
  /** 取れない環境（Web・Expo Go・Android）では null。 */
  readonly buildNumber: string | null
  readonly platform: string
}

export function appInfo(): AppInfo {
  const config = Constants.expoConfig
  // iOS はネイティブの CFBundleVersion（CI が run number で採番）を読める。
  // Android は expo-constants が versionCode を返さず、expo-application を足さん限り取れない
  const nativeIos = Constants.platform?.ios?.buildNumber
  const configured = config?.ios?.buildNumber ?? (config?.android?.versionCode?.toString() || undefined)
  return {
    name: config?.name ?? 'EQUUS 馬体解剖',
    version: config?.version ?? '—',
    buildNumber: nativeIos ?? configured ?? null,
    platform: Platform.OS === 'web' ? 'web' : `${Platform.OS} ${String(Platform.Version)}`,
  }
}

export const COPYRIGHT = 'Copyright (c) 2026 kouiso / ritmo. All Rights Reserved.'

/** Web は同じ配信元の静的ページ（プレビュー環境でも切れんように相対）。ネイティブは公開 URL。 */
export const PRIVACY_POLICY_URL = Platform.OS === 'web' ? '/privacy-policy.html' : `${PAGES_ORIGIN}/privacy-policy.html`
export const NOTICE_URL = `${REPO_URL}/blob/main/NOTICE.md`
export const CONTACT_URL = `${REPO_URL}/issues`

export function openExternal(url: string) {
  Linking.openURL(url).catch((error: unknown) => console.warn('[equus] リンクを開けなかった:', url, error))
}
