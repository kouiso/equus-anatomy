/** 旧 Web 版の localStorage と同じキー。ブラウザ移行時に保存済みが消えんように揃えとく。 */
export const SAVED_KEY = 'equus.saved.v1'

/** 保存先の差し替え口。Web は localStorage を同期で、native は AsyncStorage を非同期で読む。 */
export type SavedStorage = {
  /** 同期で読めるか。true なら最初の描画から保存済みが出る */
  sync: boolean
  getItemSync: () => string | null
  getItem: () => Promise<string | null>
  setItem: (raw: string) => Promise<void>
}
