import { Stack } from 'expo-router'
import { color } from '../../../ui/theme'

/** 詳細 URL を直接開いた時も、戻る先に一覧が積まれるように */
export const unstable_settings = { initialRouteName: 'index' }

/** 図鑑タブは一覧 → 詳細（[id]）を重ねる。タブの中に Stack を置くので、詳細を開いてもタブバーは残る。 */
export default function CatalogLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }} />
}
