import { useLayoutEffect, useRef, useState } from 'react'

/**
 * マーカーの逆スケールにコンテナの実寸が要る。
 * RN では onLayout が同じ役割をするので、core 側は数値だけ受け取る形にしてある。
 */
export function useElementSize<T extends Element>(): [React.RefObject<T | null>, { w: number; h: number }] {
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const apply = () => {
      const r = el.getBoundingClientRect()
      setSize((prev) => (prev.w === r.width && prev.h === r.height ? prev : { w: r.width, h: r.height }))
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return [ref, size]
}
