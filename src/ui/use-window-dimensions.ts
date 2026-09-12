import { useSyncExternalStore } from 'react'
import { Dimensions, type ScaledSize } from 'react-native'

// 静的レンダリング時の窓は 0×0。hydrate の1回目もこの値で描いて、サーバの HTML と一致させる
const UNMEASURED: ScaledSize = { width: 0, height: 0, scale: 1, fontScale: 1 }

function subscribe(onChange: () => void) {
  const sub = Dimensions.addEventListener('change', onChange)
  return () => sub.remove()
}

/**
 * RN 本体の useWindowDimensions は hydrate の1回目から実寸を返す。静的 HTML 側は 0 で描かれとるので
 * 属性が食い違い（max-height:0px 等）、React は属性の食い違いを直さんまま残す。
 * useSyncExternalStore ならサーバ値で hydrate してから実寸で描き直すので、DOM も更新される。
 */
export function useWindowDimensions(): ScaledSize {
  return useSyncExternalStore(subscribe, () => Dimensions.get('window'), () => UNMEASURED)
}
