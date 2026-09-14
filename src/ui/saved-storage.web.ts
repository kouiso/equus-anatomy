import { SAVED_KEY, type SavedStorage } from './saved-key'

function read(): string | null {
  return localStorage.getItem(SAVED_KEY)
}

/** Web は旧版と同じく localStorage を同期で読む。最初の描画から保存済みが出て、読み込み待ちの取りこぼしも起きん。 */
export const storage: SavedStorage = {
  sync: typeof window !== 'undefined',
  getItemSync: read,
  getItem: () => Promise.resolve().then(read),
  setItem: (raw) => Promise.resolve().then(() => localStorage.setItem(SAVED_KEY, raw)),
}
