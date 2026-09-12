import { SAVED_KEY, type SavedStorage } from './saved-key'

function read(): string | null {
  try {
    return localStorage.getItem(SAVED_KEY)
  } catch {
    // プライベートモードやストレージ無効、静的書き出し（DOM 無し）でも画面は動かなアカン
    return null
  }
}

/** Web は旧版と同じく localStorage を同期で読む。最初の描画から保存済みが出て、読み込み待ちの取りこぼしも起きん。 */
export const storage: SavedStorage = {
  sync: true,
  getItemSync: read,
  getItem: () => Promise.resolve(read()),
  setItem: (raw) => {
    try {
      localStorage.setItem(SAVED_KEY, raw)
    } catch {
      // 保存でけへんかっても、その場の表示は続ける
    }
    return Promise.resolve()
  },
}
