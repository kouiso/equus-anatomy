import * as Speech from 'expo-speech'

/**
 * expo-speech の薄い覆い（#230 案C）。本文の読み上げはやらん決まりなので、
 * 「今のを止めて名称1件だけ読む」操作だけを出す。
 */

/** 再生中の読み上げを止めてから名称を1件だけ読む。読み上げはキューせず常に最新だけ。 */
export function speakOnce(text: string, langTag: string): void {
  try {
    // 停止の失敗は読み上げを妨げんので、Promise の結果は待たん
    void Speech.stop().catch(() => {})
    Speech.speak(text, { language: langTag })
  } catch {
    // OS の TTS そのものが無い/初期化に失敗した環境では何もせん。
    // 別言語の音声へ黙ってフォールバックさせると未監修の読みを教えるので、合成は試さん。
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
