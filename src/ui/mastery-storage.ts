import AsyncStorage from '@react-native-async-storage/async-storage'
import { MASTERY_KEY, type MasteryStorage } from './mastery-key'

/** native の AsyncStorage は同期で読めん。読めるまでの操作は mastery-store 側が pending で吸収する。 */
export const storage: MasteryStorage = {
  sync: false,
  getItemSync: () => null,
  getItem: () => AsyncStorage.getItem(MASTERY_KEY),
  setItem: (raw) => AsyncStorage.setItem(MASTERY_KEY, raw),
}
