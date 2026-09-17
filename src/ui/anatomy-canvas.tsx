import { useCallback, useMemo, useState } from 'react'
import { StyleSheet, Text as RNText, View, type LayoutChangeEvent } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Svg, { Circle, G, Image, Line, Path, Rect, Text } from 'react-native-svg'
import { centroid, markerScale, toPath, viewBoxToString, zoomFactor } from '../core/geometry'
import { hitTestAreas, hitTestMarkers, hitTestParts, visibleParts } from '../core/hit-test'
import { hitTestLabels, layoutLabels, type LabelItem, type LabelPlacement, type ScreenRect } from '../core/label-layout'
import { imageToScreen, screenToImage } from '../core/screen-to-image'
import type { Area, Depth, ImageRef, Layer, Part, Point, Size, ViewBox, ViewGeometry } from '../core/types'
import { pan, pinch } from '../core/zoom'
import { resolveAnatomyImage } from './anatomy-images'
import { color, fontSans } from './theme'

/** マーカーの寸法は全部「画面上の CSS px」。逆スケール k を掛けて実際にそう見える。 */
const DOT_R = 5
const RING_R = 10
const HIT_R = 22
const LABEL_H = 26
const LABEL_FONT = 13
/** 旧 Web 版のホイール1刻み。上に回すと寄る */

export type AnatomyCanvasProps = {
  geometry: ViewGeometry
  image: ImageRef | undefined
  layer: Layer
  depth: Depth
  viewBox: ViewBox
  /** 更新関数を渡す。ジェスチャ中に古い viewBox を掴まんため。 */
  onViewBox: (update: (prev: ViewBox) => ViewBox) => void
  /** 大まかな場所を選ぶ段階か、部位を選ぶ段階か */
  mode: 'area' | 'part'
  /** 場所で絞り込んだ結果。null なら絞り込まん。 */
  visiblePartIds: ReadonlySet<string> | null
  selectedPartId: string | null
  labelOf: (part: Part) => string
  onPickArea: (area: Area) => void
  onPickPart: (part: Part) => void
  onPickNothing: () => void
  /** 右側望は左側望の絵を左右反転して使う。座標はデータ側で反転済み。 */
  mirrored: boolean
  /** Canvas 上へ重ねた操作UIなど、ラベルを置かない画面座標の領域。 */
  reservedRects?: readonly ScreenRect[]
}

type Marker = {
  key: string
  at: Point
  label: string
  selected: boolean
  showLabel: boolean
  pick: () => void
}

export function AnatomyCanvas(props: AnatomyCanvasProps) {
  const {
    geometry,
    image,
    layer,
    depth,
    viewBox,
    onViewBox,
    mode,
    visiblePartIds,
    selectedPartId,
    labelOf,
    onPickArea,
    onPickPart,
    onPickNothing,
    mirrored,
    reservedRects = [],
  } = props
  const size: Size = geometry.size
  const [container, setContainer] = useState<Size>({ w: 0, h: 0 })
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    setContainer({ w: width, h: height })
  }, [])
  const k = markerScale(viewBox, container)

  const parts = useMemo(() => {
    const byLayer = visibleParts(geometry.parts, { layer, depth })
    return visiblePartIds === null ? byLayer : byLayer.filter((p) => visiblePartIds.has(p.id))
  }, [geometry.parts, layer, depth, visiblePartIds])

  const anchorOf = (part: Part): Point => part.labelAt ?? centroid(part.points)
  const anchorOfArea = (a: Area): Point => a.labelAt ?? centroid(a.points)

  /**
   * 部位のラベルは常時は出さん。密集すると隣のラベルが点を覆って押せんようになる。
   * 選んどるもの・数が少ない時・寄っとる時だけ出す。大まかな場所は6つまでなので常に出す。
   */
  const zoomed = zoomFactor(size, viewBox)
  const labelWidth = (label: string) => Math.max(52, label.length * LABEL_FONT * 1.15 + 18)
  const markers: Marker[] =
    mode === 'area'
      ? geometry.areas.map((a) => ({
          key: a.id,
          at: anchorOfArea(a),
          label: a.nameJa,
          selected: false,
          showLabel: true,
          pick: () => onPickArea(a),
        }))
      : parts.map((p) => ({
          key: p.id,
          at: anchorOf(p),
          label: labelOf(p),
          selected: p.id === selectedPartId,
          showLabel: p.id === selectedPartId || parts.length <= 8 || zoomed >= 2,
          pick: () => onPickPart(p),
        }))

  // 配置・描画・当たり判定は同じ画面座標の矩形を使う。SVG のレターボックスも imageToScreen で反映済み。
  const shown = markers.filter((m) => m.showLabel)
  const markerScreens = markers.map((m) => ({ id: m.key, at: imageToScreen(m.at, viewBox, container) }))
  const placements = new Map<string, LabelPlacement>()
  for (const placement of layoutLabels({
    items: shown.map((m): LabelItem => ({
      id: m.key,
      at: imageToScreen(m.at, viewBox, container),
      w: labelWidth(m.label),
      h: LABEL_H,
    })),
    markers: markerScreens,
    viewport: container,
    reservedRects,
    markerClearance: HIT_R + 2,
  })) {
    placements.set(placement.id, placement)
  }

  const onTap = (x: number, y: number) => {
    const pt = screenToImage([x, y], viewBox, container)
    // 見えとる点を最優先。多角形だけで判定すると、大きい図形の点が小さい図形に
    // 埋もれた時に「押しても違うものが選ばれる」状態になる
    const marker = hitTestMarkers(
      pt,
      markers.map((m) => ({ value: m, at: m.at })),
      HIT_R * k,
    )
    if (marker) return marker.pick()
    const label = hitTestLabels(
      [x, y],
      shown.flatMap((m) => {
        const placement = placements.get(m.key)
        return placement === undefined ? [] : [{ value: m, placement }]
      }),
    )
    if (label) return label.pick()
    if (mode === 'area') {
      const a = hitTestAreas(pt, geometry.areas)
      if (a) return onPickArea(a)
    }
    // 当たり判定も表示中の部位だけに絞る。見えてへんものが反応したら気味が悪い
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

  const href = image === undefined ? undefined : resolveAnatomyImage(image.src)

  return (
    <GestureDetector gesture={gesture}>
      <View
        style={styles.box}
        onLayout={onLayout}
        collapsable={false}
        accessibilityRole="image"
        accessibilityLabel={`馬体解剖図 ${geometry.view}`}
      >
        {container.w > 0 && container.h > 0 ? (
          <Svg
            testID="anatomy-svg"
            width={container.w}
            height={container.h}
            viewBox={viewBoxToString(viewBox)}
            preserveAspectRatio="xMidYMid meet"
          >
            <Rect x={0} y={0} width={size.w} height={size.h} fill={color.bg} />
            {href !== undefined ? (
              <Image
                testID="anatomy-image"
                href={href}
                x={0}
                y={0}
                width={size.w}
                height={size.h}
                preserveAspectRatio="none"
                // 右側望は左側望の絵を左右反転。座標は flipX 済みなので絵だけ裏返す
                {...(mirrored ? { transform: `translate(${size.w},0) scale(-1,1)` } : {})}
              />
            ) : (
              <Text
                testID="anatomy-no-image"
                x={size.w / 2}
                y={size.h / 2}
                textAnchor="middle"
                fill={color.muted}
                fontSize={size.w / 32}
                fontFamily={fontSans}
              >
                この層の図はまだありません
              </Text>
            )}

            {/* 当たり判定は core がやる。paths は見た目専用にして判定を二重に持たん。 */}
            <G>
              {mode === 'area'
                ? null /* 大まかな場所は当たり判定だけ。線を引くと切り取り線が絵を横切って邪魔になる */
                : parts.map((p) => {
                    const sel = p.id === selectedPartId
                    return (
                      <Path
                        key={p.id}
                        testID={`part-${p.id}`}
                        d={toPath(p.points)}
                        fill={sel ? color.bone : 'transparent'}
                        fillOpacity={sel ? 0.18 : 1}
                        stroke={color.bone}
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
                const placement = placements.get(m.key)
                if (placement === undefined || placement.hidden) return null
                return (
                  <MarkerLabel
                    key={m.key}
                    id={m.key}
                    at={m.at}
                    label={m.label}
                    k={k}
                    selected={m.selected}
                    placement={placement}
                  />
                )
              })}
            </G>
          </Svg>
        ) : null}
        {parts.length === 0 && mode === 'part' ? (
          <View style={styles.emptyWrap} pointerEvents="none">
            <RNText style={styles.emptyText}>この層の座標はまだ実測されていません</RNText>
          </View>
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
      {selected ? <Circle r={14} fill="none" stroke={color.bg} strokeWidth={6} /> : null}
      {selected ? <Circle testID={`marker-selected-${props.id}`} r={14} fill="none" stroke={color.bone} strokeWidth={3} /> : null}
      <Circle r={RING_R} fill="none" stroke={color.bone} strokeOpacity={selected ? 0.9 : 0.4} strokeWidth={2} />
      <Circle testID={`marker-dot-${props.id}`} r={DOT_R} fill={color.bone} />
    </G>
  )
}

function MarkerLabel(props: {
  id: string
  at: Point
  label: string
  k: number
  selected: boolean
  placement: LabelPlacement
}) {
  const { at, label, k, selected, placement } = props
  const offset: Point = [placement.dx, placement.dy]
  const distance = Math.hypot(offset[0], offset[1]) || 1
  const lineStart = { x1: offset[0] * RING_R / distance, y1: offset[1] * RING_R / distance }
  return (
    <G testID={`marker-label-${props.id}`} x={at[0]} y={at[1]} scale={k}>
      {/* 近いラベルも必ず点へ繋ぐ。暗い縁取りで明るい馬体の上でも線を追える。 */}
      <Line {...lineStart} x2={offset[0]} y2={offset[1]} stroke={color.bg} strokeWidth={4} />
      <Line {...lineStart} x2={offset[0]} y2={offset[1]} stroke={color.bone} strokeWidth={1.5} />
      <G x={offset[0]} y={offset[1]}>
        <Rect
          x={-placement.rect.w / 2}
          y={-placement.rect.h / 2}
          width={placement.rect.w}
          height={placement.rect.h}
          rx={placement.rect.h / 2}
          fill={selected ? color.bone : color.raised}
          fillOpacity={selected ? 1 : 0.94}
        />
        {/* dominantBaseline は native 側の対応が薄いので、y をずらして中央に寄せる */}
        <Text
          textAnchor="middle"
          y={LABEL_FONT * 0.35}
          fill={selected ? color.accentFg : color.fg}
          fontSize={LABEL_FONT}
          fontFamily={fontSans}
        >
          {label}
        </Text>
      </G>
    </G>
  )
}

const styles = StyleSheet.create({
  box: { flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: color.bg },
  emptyWrap: { position: 'absolute', bottom: 16, left: 0, right: 0, alignItems: 'center' },
  emptyText: {
    maxWidth: '90%',
    borderRadius: 999,
    backgroundColor: 'rgba(30,33,38,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textAlign: 'center',
    fontFamily: fontSans,
    fontSize: 12,
    letterSpacing: 0.3,
    color: color.muted,
    overflow: 'hidden',
  },
})
