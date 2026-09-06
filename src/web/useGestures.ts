import { useCallback, useRef } from 'react'
import { pan, pinch, zoomAt } from '../core/zoom'
import type { Point, Size, ViewBox } from '../core/types'

type Pointer = { x: number; y: number }

export type GestureHandlers = {
  onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => void
  onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void
  onPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void
  onPointerCancel: (e: React.PointerEvent<SVGSVGElement>) => void
  onWheel: (e: React.WheelEvent<SVGSVGElement>) => void
}

/** タップと判定する移動量（CSS px）。これを超えたらドラッグ扱いにして誤タップを防ぐ。 */
const TAP_SLOP = 8

/**
 * ピンチ・パン・タップ。
 * 画面座標 → SVG ユーザー座標の変換は getScreenCTM().inverse() を使う。
 * HTML ラッパへ CSS transform を掛けるやり方は Safari で CTM が拾えん報告があるので採らん。
 * ズームは viewBox の書き換えだけで表現する。
 */
export function useGestures(args: {
  size: Size
  /**
   * 更新関数を受け取る形にしとる。
   * ドラッグ中に最新の viewBox を読むために ref へ写すと「レンダー中に ref を触る」ことになるし、
   * 依存配列に viewBox を入れるとジェスチャ中にハンドラが作り直されて指が離れる。
   */
  onViewBox: (update: (prev: ViewBox) => ViewBox) => void
  onTap: (userPoint: Point) => void
}): GestureHandlers {
  const { size, onViewBox, onTap } = args
  const pointers = useRef(new Map<number, Pointer>())
  const lastPinch = useRef<{ distance: number } | null>(null)
  const moved = useRef(0)

  const toUser = useCallback((svg: SVGSVGElement, clientX: number, clientY: number): Point => {
    const ctm = svg.getScreenCTM()
    if (!ctm) return [0, 0]
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
    return [p.x, p.y]
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) moved.current = 0
    lastPinch.current = null
  }, [])

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const prev = pointers.current.get(e.pointerId)
      if (!prev) return
      const svg = e.currentTarget
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
      moved.current += Math.abs(e.clientX - prev.x) + Math.abs(e.clientY - prev.y)

      const list = [...pointers.current.values()]
      if (list.length >= 2) {
        const [a, b] = [list[0]!, list[1]!]
        const distance = Math.hypot(a.x - b.x, a.y - b.y)
        const midUser = toUser(svg, (a.x + b.x) / 2, (a.y + b.y) / 2)
        if (lastPinch.current && lastPinch.current.distance > 0) {
          const ratio = distance / lastPinch.current.distance
          onViewBox((prev) => pinch(prev, midUser, ratio, size))
        }
        lastPinch.current = { distance }
        return
      }

      // 1本指はパン。移動量をユーザー座標に直してから viewBox をずらす。
      const widthPx = svg.getBoundingClientRect().width || 1
      const dx = e.clientX - prev.x
      const dy = e.clientY - prev.y
      onViewBox((vb) => pan(vb, (dx * vb.w) / widthPx, (dy * vb.w) / widthPx, size))
    },
    [onViewBox, size, toUser],
  )

  const finish = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const svg = e.currentTarget
      const wasSingle = pointers.current.size === 1
      pointers.current.delete(e.pointerId)
      if (pointers.current.size < 2) lastPinch.current = null
      if (svg.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId)
      if (wasSingle && moved.current <= TAP_SLOP) onTap(toUser(svg, e.clientX, e.clientY))
    },
    [onTap, toUser],
  )

  const onPointerCancel = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId)
    lastPinch.current = null
  }, [])

  const onWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      const anchor = toUser(e.currentTarget, e.clientX, e.clientY)
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
      onViewBox((vb) => zoomAt(vb, anchor, factor, size))
    },
    [onViewBox, size, toUser],
  )

  return { onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel, onWheel }
}
