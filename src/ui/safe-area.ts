import { Platform, StatusBar } from 'react-native'
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context'
import { TopInsetMemory } from './top-inset'

// アプリ全体でステータスバーは1枚なので記憶も共有する。
// module scope に置くのは、プロバイダの再マウントを跨いでも直前の実測を覚えとくため。
const memory = new TopInsetMemory()

/**
 * JS リロードで memory が消えても復元できるよう、同期に読める端末定数を推定値にする。
 * Android の StatusBar.currentHeight は Activity 再生成後も native から読める実測値で、
 * edge-to-edge 下の insets.top と同じ値を指す。iOS はプロバイダ初期値メトリクス、web は常時 0。
 */
function platformTopEstimate(): number {
  if (Platform.OS === 'android') return StatusBar.currentHeight ?? 0
  return initialWindowMetrics?.insets.top ?? 0
}

/**
 * useSafeAreaInsets().top の頑強版 (#62)。
 * in-place リロード直後にプロバイダが 0 を返しても、直前の実測値→端末定数の順で退避し、
 * ヘッダがステータスバーの下に潜らんようにする。正の実測が戻れば素直にそれを使う。
 */
export function useStableTopInset(): number {
  const measured = useSafeAreaInsets().top
  return memory.resolve(measured, platformTopEstimate())
}
