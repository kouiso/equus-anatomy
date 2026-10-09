/** 表示言語の保存キー。saved / mastery とは別キーにして、壊れても互いに巻き込まんようにする。 */
export const LOCALE_KEY = 'equus.locale.v1'

/** 保存先の差し替え口。Web は localStorage を同期で、native は AsyncStorage を非同期で読む。 */
export type LocaleStorage = {
  /** 同期で読めるか。true なら最初の描画から選んだ言語で出る */
  sync: boolean
  getItemSync: () => string | null
  getItem: () => Promise<string | null>
  setItem: (raw: string) => Promise<void>
}
