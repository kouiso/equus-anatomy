/** 覚えた記録の保存キー。saved と別キーにして壊れても互いに巻き込まんようにする。 */
export const MASTERY_KEY = 'equus.mastery.v1'

/** 保存先の差し替え口。Web は localStorage を同期で、native は AsyncStorage を非同期で読む。 */
export type MasteryStorage = {
  /** 同期で読めるか。true なら最初の描画から本物が出る */
  sync: boolean
  getItemSync: () => string | null
  getItem: () => Promise<string | null>
  setItem: (raw: string) => Promise<void>
}
