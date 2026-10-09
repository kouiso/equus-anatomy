import { LOCALE_KEY, type LocaleStorage } from './locale-key'

function read(): string | null {
  return localStorage.getItem(LOCALE_KEY)
}

/** Web は localStorage を同期で読む。リロード直後から選んだ言語で出る。 */
export const storage: LocaleStorage = {
  sync: typeof window !== 'undefined',
  getItemSync: read,
  getItem: () => Promise.resolve().then(read),
  setItem: (raw) => Promise.resolve().then(() => localStorage.setItem(LOCALE_KEY, raw)),
}
