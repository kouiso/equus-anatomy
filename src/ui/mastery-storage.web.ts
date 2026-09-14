import { MASTERY_KEY, type MasteryStorage } from './mastery-key'

function read(): string | null {
  return localStorage.getItem(MASTERY_KEY)
}

/** Web は localStorage を同期で読む。最初の描画から覚えた印が出て、読み込み待ちの取りこぼしも起きん。 */
export const storage: MasteryStorage = {
  sync: typeof window !== 'undefined',
  getItemSync: read,
  getItem: () => Promise.resolve().then(read),
  setItem: (raw) => Promise.resolve().then(() => localStorage.setItem(MASTERY_KEY, raw)),
}
