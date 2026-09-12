import { MASTERY_KEY, type MasteryStorage } from './mastery-key'

function read(): string | null {
  try {
    return localStorage.getItem(MASTERY_KEY)
  } catch {
    // プライベートモードやストレージ無効、静的書き出し（DOM 無し）でも画面は動かなアカン
    return null
  }
}

/** Web は localStorage を同期で読む。最初の描画から覚えた印が出て、読み込み待ちの取りこぼしも起きん。 */
export const storage: MasteryStorage = {
  sync: true,
  getItemSync: read,
  getItem: () => Promise.resolve(read()),
  setItem: (raw) => {
    try {
      localStorage.setItem(MASTERY_KEY, raw)
    } catch {
      // 保存でけへんかっても、その場の表示は続ける
    }
    return Promise.resolve()
  },
}
