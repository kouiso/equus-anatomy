import * as Speech from 'expo-speech'
import { Platform } from 'react-native'

/**
 * expo-speech の薄い覆い（#230 案C）。本文の読み上げはやらん決まりなので、
 * 「今のを止めて名称1件だけ読む」操作だけを出す。
 */

/**
 * この端末で読み上げが使えるか。web は speechSynthesis が無いブラウザ（一部のアプリ内ブラウザ等）がある。
 * expo-speech の speak は内部の Promise を捨てるので、API が無いと try/catch では拾えん例外になる。
 * だから呼ぶ前に有無を見て、無ければボタン自体を出さん。
 */
export function speechAvailable(): boolean {
  if (Platform.OS !== 'web') return true
  return (
    typeof window !== 'undefined' &&
    typeof window.speechSynthesis?.speak === 'function' &&
    typeof window.SpeechSynthesisUtterance === 'function'
  )
}

/** 再生中の読み上げを止めてから名称を1件だけ読む。読み上げはキューせず常に最新だけ。 */
export function speakOnce(text: string, langTag: string): void {
  if (!speechAvailable()) return
  try {
    // 停止の失敗は読み上げを妨げんので、Promise の結果は待たん
    void Speech.stop().catch(() => {})
    Speech.speak(text, { language: langTag })
  } catch {
    // OS の TTS そのものが無い/初期化に失敗した環境では何もせん。
    // 別言語の音声へ黙ってフォールバックさせると未監修の読みを教えるので、合成は試さん。
  }
}

/** 読み上げ中なら止める。止められん環境では何もせん。 */
export function stopSpeaking(): void {
  if (!speechAvailable()) return
  try {
    void Speech.stop().catch(() => {})
  } catch {
    // TTS が無い環境では止める物も無い
  }
}

/** OS が持つ音声の言語タグ一覧。取れん環境（権限なし・TTS なし）では空配列。 */
export async function voiceLanguages(): Promise<readonly string[]> {
  try {
    const voices = await Speech.getAvailableVoicesAsync()
    return voices.map((v) => v.language)
  } catch {
    return []
  }
}
