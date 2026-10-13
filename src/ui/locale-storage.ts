import AsyncStorage from '@react-native-async-storage/async-storage'
import { LOCALE_KEY, type LocaleStorage } from './locale-key'

/** native の AsyncStorage は同期で読めん。読めるまでは端末の言語で出し、スプラッシュで隠す。 */
export const storage: LocaleStorage = {
  sync: false,
  getItemSync: () => null,
  getItem: () => AsyncStorage.getItem(LOCALE_KEY),
  setItem: (raw) => AsyncStorage.setItem(LOCALE_KEY, raw),
}
