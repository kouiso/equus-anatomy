import { useMemo } from 'react'
import { centroid, markerScale, toPath, zoomFactor } from '../core/geometry'
import { hitTestAreas, hitTestMarkers, hitTestParts, visibleParts } from '../core/hit-test'
import { layoutLabels, type LabelItem } from '../core/label-layout'
import { viewBoxToString } from '../core/geometry'
import type { Area, Depth, ImageRef, Layer, Part, Point, Size, ViewBox, ViewGeometry } from '../core/types'
import { useElementSize } from './useElementSize'
import { useGestures } from './useGestures'

/** マーカーの寸法は全部「画面上の CSS px」で書く。逆スケールで実際にそう見える。 */
const DOT_R = 5
const RING_R = 10
const HIT_R = 22
const LABEL_H = 26
const LABEL_FONT = 13
const LABEL_GAP = 14

export type AnatomySvgProps = {
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
}

export function AnatomySvg(props: AnatomySvgProps) {
  const { geometry, image, layer, depth, viewBox, onViewBox, mode, selectedPartId, mirrored } = props
  const size: Size = geometry.size
  const [boxRef, container] = useElementSize<HTMLDivElement>()
  const k = markerScale(viewBox, container)

  const parts = useMemo(() => {
    const byLayer = visibleParts(geometry.parts, { layer, depth })
    return props.visiblePartIds === null ? byLayer : byLayer.filter((p) => props.visiblePartIds!.has(p.id))
  }, [geometry.parts, layer, depth, props.visiblePartIds])

  const anchorOf = (part: Part): Point => part.labelAt ?? centroid(part.points)
  const anchorOfArea = (a: Area): Point => a.labelAt ?? centroid(a.points)

  /**
   * 部位のラベルは常時は出さん。密集すると隣のラベルが点を覆って押せんようになる。
   * 選んどるもの・数が少ない時・寄っとる時だけ出す。大まかな場所は6つまでなので常に出す。
   */
  const zoomed = zoomFactor(size, viewBox)
  const labelWidth = (label: string) => Math.max(52, label.length * LABEL_FONT * 1.15 + 18)
  const markers =
    mode === 'area'
      ? geometry.areas.map((a) => ({
          key: a.id,
          at: anchorOfArea(a),
          label: a.nameJa,
          selected: false,
          showLabel: true,
          pick: () => props.onPickArea(a),
        }))
      : parts.map((p) => ({
          key: p.id,
          at: anchorOf(p),
          label: props.labelOf(p),
          selected: p.id === selectedPartId,
          showLabel: p.id === selectedPartId || parts.length <= 8 || zoomed >= 2,
          pick: () => props.onPickPart(p),
        }))

  const gestures = useGestures({
    size,
    onViewBox,
    onTap: (pt: Point) => {
      // 見えとる点を最優先。多角形だけで判定すると、大きい図形の点が小さい図形に
      // 埋もれた時に「押しても違うものが選ばれる」状態になる
      const marker = hitTestMarkers(
        pt,
        markers.map((m) => ({ value: m, at: m.at })),
        HIT_R * k,
      )
      if (marker) return marker.pick()
      if (mode === 'area') {
        const a = hitTestAreas(pt, geometry.areas)
        if (a) return props.onPickArea(a)
      }
      // 当たり判定も表示中の部位だけに絞る。見えてへんものが反応したら気味が悪い
      const p = hitTestParts(pt, parts, { layer, depth })
      if (p) return props.onPickPart(p)
      props.onPickNothing()
    },
  })

  // 出すラベルだけ場所を決める。隣り合う筋は重心も近いので、そのままやと重なって読めん。
  const shown = markers.filter((m) => m.showLabel)
  // 13枚以下・候補10通りなので毎レンダー解いても軽い。memo 化して依存を書き間違える方が危ない。
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

  return (
    <div ref={boxRef} className="relative min-h-0 flex-1 overflow-hidden bg-bg">
      <div className="absolute inset-0 grid place-items-center">
        <svg
          data-testid="anatomy-svg"
          viewBox={viewBoxToString(viewBox)}
          preserveAspectRatio="xMidYMid meet"
          className="max-h-full max-w-full touch-none select-none"
          style={{ width: '100%', height: '100%' }}
          role="img"
          aria-label={`馬体解剖図 ${geometry.view}`}
          {...gestures}
        >
          <rect x={0} y={0} width={size.w} height={size.h} fill="var(--color-bg)" pointerEvents="none" />

          {image ? (
            <image
              data-testid="anatomy-image"
              href={image.src}
              x={0}
              y={0}
              width={size.w}
              height={size.h}
              preserveAspectRatio="none"
              pointerEvents="none"
              transform={mirrored ? `translate(${size.w},0) scale(-1,1)` : undefined}
            />
          ) : (
            <text
              x={size.w / 2}
              y={size.h / 2}
              textAnchor="middle"
              fill="var(--color-muted)"
              fontSize={size.w / 32}
              pointerEvents="none"
            >
              この層の図はまだありません
            </text>
          )}

          {/* 当たり判定は core がやる。paths は見た目専用にして判定を二重に持たん。 */}
          <g pointerEvents="none">
            {mode === 'area'
              ? null /* 大まかな場所は当たり判定だけ。線を引くと切り取り線が絵を横切って邪魔になる */
              : parts.map((p) => (
                  <path
                    key={p.id}
                    data-part={p.id}
                    data-source={p.source}
                    d={toPath(p.points)}
                    fill={p.id === selectedPartId ? 'var(--color-bone)' : 'transparent'}
                    fillOpacity={p.id === selectedPartId ? 0.18 : 1}
                    stroke="var(--color-bone)"
                    strokeOpacity={p.id === selectedPartId ? 0.9 : 0.28}
                    strokeWidth={(p.id === selectedPartId ? 2 : 1.2) * k}
                    strokeDasharray={p.source === 'draft' ? `${6 * k} ${5 * k}` : undefined}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
          </g>

          {/* 点を先に全部描いてから、ラベルを上に重ねる。
              こうせんと隣のラベルが点を隠して「どこを押せばええか分からん」状態になる。 */}
          <g pointerEvents="none">
            {markers.map((m) => (
              <MarkerDot key={m.key} id={m.key} at={m.at} k={k} selected={m.selected} />
            ))}
          </g>
          <g pointerEvents="none">
            {shown.map((m) => {
              const at = placements.get(m.key)
              if (at?.hidden === true && !m.selected) return null
              return (
                <MarkerLabel
                  key={m.key}
                  id={m.key}
                  at={m.at}
                  label={m.label}
                  k={k}
                  selected={m.selected}
                  offset={[at?.dx ?? 0, at?.dy ?? -(RING_R + LABEL_GAP)]}
                />
              )
            })}
          </g>
        </svg>
      </div>
      {parts.length === 0 && mode === 'part' ? (
        <p className="pointer-events-none absolute bottom-4 left-1/2 z-10 max-w-[90%] -translate-x-1/2 rounded-full bg-raised/90 px-4 py-2 text-center text-xs tracking-wide text-muted shadow-soft">
          この層の座標はまだ実測されていません
        </p>
      ) : null}
    </div>
  )
}

/**
 * マーカーは translate してから scale(k) を掛ける。
 * k はズーム倍率とコンテナ実寸の両方を含むので、どの端末でもどの倍率でも同じ CSS px に見える。
 */
function MarkerDot(props: { id: string; at: Point; k: number; selected: boolean }) {
  const { at, k, selected } = props
  return (
    <g data-marker={props.id} transform={`translate(${at[0]}, ${at[1]}) scale(${k})`}>
      {/* WCAG 2.5.8 の 24x24 CSS px を満たす不可視の当たり円。判定自体は core がやる */}
      <circle r={HIT_R} fill="rgba(0,0,0,0)" />
      <circle r={RING_R} fill="none" stroke="var(--color-bone)" strokeOpacity={selected ? 0.9 : 0.4} strokeWidth={2} />
      <circle r={DOT_R} fill="var(--color-bone)" />
    </g>
  )
}

function MarkerLabel(props: {
  id: string
  at: Point
  label: string
  k: number
  selected: boolean
  offset: readonly [number, number]
}) {
  const { at, label, k, selected } = props
  // 全角前提で幅を見る。CJK は 1文字 ≒ 1em なので font-size をそのまま掛ける。
  const width = Math.max(52, label.length * LABEL_FONT * 1.15 + 18)
  return (
    <g data-label={props.id} transform={`translate(${at[0]}, ${at[1]}) scale(${k})`}>
      {/* 点と引き離した分だけ細い線で繋ぐ。どの点のラベルか分からんようになるのを防ぐ */}
      {Math.hypot(props.offset[0], props.offset[1]) > RING_R + LABEL_H ? (
        <line
          x1={0}
          y1={0}
          x2={props.offset[0]}
          y2={props.offset[1]}
          stroke="var(--color-bone)"
          strokeOpacity={0.45}
          strokeWidth={1.2}
        />
      ) : null}
      <g transform={`translate(${props.offset[0]}, ${props.offset[1]})`}>
        <rect
          x={-width / 2}
          y={-LABEL_H / 2}
          width={width}
          height={LABEL_H}
          rx={LABEL_H / 2}
          fill={selected ? 'var(--color-bone)' : 'var(--color-raised)'}
          fillOpacity={selected ? 1 : 0.94}
        />
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fill={selected ? 'var(--color-accent-fg)' : 'var(--color-fg)'}
          fontSize={LABEL_FONT}
          fontFamily="var(--font-sans)"
        >
          {label}
        </text>
      </g>
    </g>
  )
}
