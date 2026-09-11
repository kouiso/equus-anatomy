import { useCallback, useMemo, useState } from 'react'
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Svg, { Circle, G, Image, Line, Path, Rect, Text } from 'react-native-svg'
import { centroid, markerScale, toPath, viewBoxToString, zoomFactor } from '../core/geometry'
import { hitTestMarkers, hitTestParts, visibleParts } from '../core/hit-test'
import { layoutLabels, type LabelItem } from '../core/label-layout'
import { screenToImage } from '../core/screen-to-image'
import type { Depth, ImageRef, Layer, Part, Point, Size, ViewBox, ViewGeometry } from '../core/types'
import { pan, pinch } from '../core/zoom'
import { resolveAnatomyImage } from './anatomy-images'

/** マーカーの寸法は全部「画面上の CSS px」。逆スケール k を掛けて実際にそう見える。 */
const DOT_R = 5
const RING_R = 10
const HIT_R = 22
const LABEL_H = 26
const LABEL_FONT = 13
const LABEL_GAP = 14

/** RN では CSS 変数が使えんので色は定数で持つ（styles.css の --color-* と同じ値）。 */
const COLOR = {
  bg: '#0b0c0e',
  bone: '#ece7dd',
  raised: '#1a1c20',
  fg: '#ece7dd',
  accentFg: '#0b0c0e',
  muted: '#8a877f',
} as const

export type AnatomyCanvasProps = {
  geometry: ViewGeometry
  image: ImageRef | undefined
  layer: Layer
  depth: Depth
  viewBox: ViewBox
  /** 更新関数を渡す。ジェスチャ中に古い viewBox を掴まんため。 */
  onViewBox: (update: (prev: ViewBox) => ViewBox) => void
  selectedPartId: string | null
  labelOf: (part: Part) => string
  onPickPart: (part: Part) => void
  onPickNothing: () => void
}

export function AnatomyCanvas(props: AnatomyCanvasProps) {
  const { geometry, image, layer, depth, viewBox, onViewBox, selectedPartId, onPickPart, onPickNothing, labelOf } =
    props
  const size: Size = geometry.size
  const [container, setContainer] = useState<Size>({ w: 0, h: 0 })
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setContainer({ w: width, h: height })
  }, [])
  const k = markerScale(viewBox, container)

  const parts = useMemo(() => visibleParts(geometry.parts, { layer, depth }), [geometry.parts, layer, depth])

  const anchorOf = (part: Part): Point => part.labelAt ?? centroid(part.points)
  const zoomed = zoomFactor(size, viewBox)
  const labelWidth = (label: string) => Math.max(52, label.length * LABEL_FONT * 1.15 + 18)
  const markers = parts.map((p) => ({
    key: p.id,
    at: anchorOf(p),
    label: labelOf(p),
    selected: p.id === selectedPartId,
    // 密集すると隣のラベルが点を覆って押せん。選択中・少ない時・寄っとる時だけ出す
    showLabel: p.id === selectedPartId || parts.length <= 8 || zoomed >= 2,
    part: p,
  }))

  const onTap = (x: number, y: number) => {
    const pt = screenToImage([x, y], viewBox, container)
    // 見えとる点を最優先。多角形だけやと大きい図形の点が小さい図形に埋もれた時に別のものが選ばれる
    const marker = hitTestMarkers(
      pt,
      markers.map((m) => ({ value: m, at: m.at })),
      HIT_R * k,
    )
    if (marker) return onPickPart(marker.part)
    const p = hitTestParts(pt, parts, { layer, depth })
    if (p) return onPickPart(p)
    onPickNothing()
  }

  /**
   * Gesture はレンダーごとに作り直す。GestureDetector は構成（種類と数）が同じなら
   * ハンドラを付け替えずに設定だけ更新するので、指の途中でも切れん。
   * ref に最新値を写す手もあるが、react-hooks/refs がレンダー中の参照として弾く。
   * runOnJS: core の純関数を UI スレッドの worklet から呼ぶと worklet 化が要る。この規模なら JS で足りる。
   */
  const tap = Gesture.Tap()
    .maxDistance(8)
    .runOnJS(true)
    .onEnd((e) => onTap(e.x, e.y))
  const panG = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .runOnJS(true)
    // 画面 px の移動量を画像 px に直す。k = 画像px / 画面px
    .onChange((e) => onViewBox((vb) => pan(vb, e.changeX * k, e.changeY * k, size)))
  const pinchG = Gesture.Pinch()
    .runOnJS(true)
    .onChange((e) => {
      const mid = screenToImage([e.focalX, e.focalY], viewBox, container)
      onViewBox((prev) => pinch(prev, mid, e.scaleChange, size))
    })
  const gesture = Gesture.Race(tap, Gesture.Simultaneous(pinchG, panG))

  // 出すラベルだけ場所を決める。隣り合う筋は重心も近いので、そのままやと重なって読めん。
  const shown = markers.filter((m) => m.showLabel)
  const placements = new Map<string, { dx: number; dy: number; hidden: boolean }>()
  for (const p of layoutLabels({
    items: shown.map((m): LabelItem => ({ id: m.key, at: m.at, w: labelWidth(m.label), h: LABEL_H })),
    viewBox,
    unitToPx: k > 0 ? 1 / k : 1,
    gap: RING_R + 6,
    keep: selectedPartId,
  })) {
    placements.set(p.id, p)
  }

  const href = image === undefined ? undefined : resolveAnatomyImage(image.src)

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.box} onLayout={onLayout} collapsable={false}>
        {container.w > 0 && container.h > 0 ? (
          <Svg
            testID="anatomy-svg"
            width={container.w}
            height={container.h}
            viewBox={viewBoxToString(viewBox)}
            preserveAspectRatio="xMidYMid meet"
          >
            <Rect x={0} y={0} width={size.w} height={size.h} fill={COLOR.bg} />
            {href !== undefined ? (
              <Image
                testID="anatomy-image"
                href={href}
                x={0}
                y={0}
                width={size.w}
                height={size.h}
                preserveAspectRatio="none"
              />
            ) : (
              <Text x={size.w / 2} y={size.h / 2} textAnchor="middle" fill={COLOR.muted} fontSize={size.w / 32}>
                この層の図はまだありません
              </Text>
            )}

            {/* 当たり判定は core がやる。paths は見た目専用にして判定を二重に持たん。 */}
            <G>
              {parts.map((p) => {
                const sel = p.id === selectedPartId
                return (
                  <Path
                    key={p.id}
                    d={toPath(p.points)}
                    fill={sel ? COLOR.bone : 'transparent'}
                    fillOpacity={sel ? 0.18 : 1}
                    stroke={COLOR.bone}
                    strokeOpacity={sel ? 0.9 : 0.28}
                    strokeWidth={(sel ? 2 : 1.2) * k}
                    {...(p.source === 'draft' ? { strokeDasharray: [6 * k, 5 * k] } : {})}
                  />
                )
              })}
            </G>

            {/* 点を先に全部描いてからラベルを上に重ねる。隣のラベルが点を隠さんように。 */}
            <G>
              {markers.map((m) => (
                <MarkerDot key={m.key} id={m.key} at={m.at} k={k} selected={m.selected} />
              ))}
            </G>
            <G>
              {shown.map((m) => {
                const at = placements.get(m.key)
                if (at?.hidden === true && !m.selected) return null
                return (
                  <MarkerLabel
                    key={m.key}
                    at={m.at}
                    label={m.label}
                    k={k}
                    selected={m.selected}
                    offset={[at?.dx ?? 0, at?.dy ?? -(RING_R + LABEL_GAP)]}
                  />
                )
              })}
            </G>
          </Svg>
        ) : null}
      </View>
    </GestureDetector>
  )
}

/**
 * マーカーは translate してから scale(k) を掛ける。
 * k はズーム倍率とコンテナ実寸の両方を含むので、どの端末でもどの倍率でも同じ CSS px に見える。
 */
function MarkerDot(props: { id: string; at: Point; k: number; selected: boolean }) {
  const { at, k, selected } = props
  return (
    <G testID={`marker-${props.id}`} x={at[0]} y={at[1]} scale={k}>
      {/* WCAG 2.5.8 の 24x24 CSS px を満たす不可視の当たり円。判定自体は core がやる */}
      <Circle r={HIT_R} fill="rgba(0,0,0,0)" />
      <Circle r={RING_R} fill="none" stroke={COLOR.bone} strokeOpacity={selected ? 0.9 : 0.4} strokeWidth={2} />
      <Circle testID={`marker-dot-${props.id}`} r={DOT_R} fill={COLOR.bone} />
    </G>
  )
}

function MarkerLabel(props: { at: Point; label: string; k: number; selected: boolean; offset: readonly [number, number] }) {
  const { at, label, k, selected, offset } = props
  // 全角前提で幅を見る。CJK は 1文字 ≒ 1em なので font-size をそのまま掛ける。
  const width = Math.max(52, label.length * LABEL_FONT * 1.15 + 18)
  return (
    <G x={at[0]} y={at[1]} scale={k}>
      {/* 点と引き離した分だけ細い線で繋ぐ。どの点のラベルか分からんようになるのを防ぐ */}
      {Math.hypot(offset[0], offset[1]) > RING_R + LABEL_H ? (
        <Line x1={0} y1={0} x2={offset[0]} y2={offset[1]} stroke={COLOR.bone} strokeOpacity={0.45} strokeWidth={1.2} />
      ) : null}
      <G x={offset[0]} y={offset[1]}>
        <Rect
          x={-width / 2}
          y={-LABEL_H / 2}
          width={width}
          height={LABEL_H}
          rx={LABEL_H / 2}
          fill={selected ? COLOR.bone : COLOR.raised}
          fillOpacity={selected ? 1 : 0.94}
        />
        {/* dominantBaseline は native 側の対応が薄いので、y をずらして中央に寄せる */}
        <Text
          textAnchor="middle"
          y={LABEL_FONT * 0.35}
          fill={selected ? COLOR.accentFg : COLOR.fg}
          fontSize={LABEL_FONT}
        >
          {label}
        </Text>
      </G>
    </G>
  )
}

const styles = StyleSheet.create({
  box: { flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: COLOR.bg },
})
