import AsyncStorage from '@react-native-async-storage/async-storage'
import { SAVED_KEY, type SavedStorage } from './saved-key'

/** native の AsyncStorage は同期で読めん。読めるまでの操作は saved-store 側が pending で吸収する。 */
export const storage: SavedStorage = {
  sync: false,
  getItemSync: () => null,
  getItem: () => AsyncStorage.getItem(SAVED_KEY),
  setItem: (raw) => AsyncStorage.setItem(SAVED_KEY, raw),
}
