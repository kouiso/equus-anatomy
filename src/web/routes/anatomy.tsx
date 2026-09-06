import { useState } from 'react'
import { AnatomySvg } from '../AnatomySvg'
import { ChipRow } from '../component/chips'
import { MinusIcon, PlusIcon, ResetIcon } from '../component/icons'
import { PartSheet } from '../component/part-sheet'
import { GEOMETRY, STRUCTURE_BY_ID } from '../../core/data'
import { mergeDraft, useDraftShapes } from '../draft'
import { areaOfStructure } from '../../core/area-map'
import { fit, zoomByStep, zoomToPolygon, zoomToPolygons } from '../../core/zoom'
import { plateIdOf, type Area, type Depth, type Layer, type Part, type View, type ViewBox } from '../../core/types'

const VIEWS = [
  { id: 'left', label: '左側望' },
  { id: 'right', label: '右側望' },
  { id: 'front', label: '正面' },
  { id: 'rear', label: '後面' },
] as const satisfies readonly { id: View; label: string }[]

const LAYERS = [
  { id: 'skin', label: '皮膚' },
  { id: 'muscle', label: '筋肉' },
  { id: 'skeleton', label: '骨格' },
  { id: 'organs', label: '内臓' },
] as const satisfies readonly { id: Layer; label: string }[]

const DEPTHS = [
  { id: 'superficial', label: '表層筋' },
  { id: 'deep', label: '深層筋' },
] as const satisfies readonly { id: Depth; label: string }[]

export function AnatomyScreen() {
  const [view, setView] = useState<View>('left')
  const [layer, setLayer] = useState<Layer>('muscle')
  const [depth, setDepth] = useState<Depth>('superficial')
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null)
  const [areaId, setAreaId] = useState<string | null>(null)
  // viewBox は向きと一緒に決める。useEffect に置くと1フレームだけ前の向きの枠で描いてしまう。
  const [zoom, setZoom] = useState<{ view: View; vb: ViewBox } | null>(null)

  const draftShapes = useDraftShapes(view)
  const [showDraft, setShowDraft] = useState(true)
  const geometry = showDraft ? mergeDraft(view, draftShapes) : GEOMETRY[view]
  const viewBox = zoom && zoom.view === view ? zoom.vb : fit(geometry.size)
  const setViewBox = (update: (prev: ViewBox) => ViewBox) =>
    setZoom((prev) => ({ view, vb: update(prev && prev.view === view ? prev.vb : fit(geometry.size)) }))

  const plate = plateIdOf(layer, depth)
  const image = geometry.images[plate]
  const mode: 'area' | 'part' = areaId === null && geometry.areas.length > 0 ? 'area' : 'part'
  // 場所を選んだら、その場所に属する部位だけ出す。関係ない部位まで出たら選んだ意味がない
  const visiblePartIds =
    areaId === null
      ? null
      : new Set(
          [...STRUCTURE_BY_ID.values()].filter((s) => areaOfStructure(s) === areaId).map((s) => s.id),
        )
  const selected = selectedPartId ? (STRUCTURE_BY_ID.get(selectedPartId) ?? null) : null

  const reset = () => {
    setZoom(null)
    setAreaId(null)
    setSelectedPartId(null)
  }

  const switchView = (v: View) => {
    setView(v)
    setZoom(null)
    setAreaId(null)
    setSelectedPartId(null)
  }

  const pickArea = (a: Area) => {
    setAreaId(a.id)
    setSelectedPartId(null)
    // その場所に出る部位の範囲へ寄せる。部位がまだ無い場所は輪郭に寄せる
    const ids = new Set(
      [...STRUCTURE_BY_ID.values()].filter((s) => areaOfStructure(s) === a.id).map((s) => s.id),
    )
    const target = geometry.parts.filter(
      (p) => ids.has(p.id) && p.layer === layer && (p.depth ?? depth) === depth,
    )
    setViewBox(() =>
      target.length > 0
        ? zoomToPolygons(target.map((p) => p.points), geometry.size)
        : zoomToPolygon(a.points, geometry.size),
    )
  }

  const inArea = (id: string) => visiblePartIds === null || visiblePartIds.has(id)
  const placed = geometry.parts.filter(
    (p) => p.layer === layer && (p.depth ?? depth) === depth && inArea(p.id),
  ).length
  const expected = [...STRUCTURE_BY_ID.values()].filter(
    (s) => s.layer === layer && (s.depth ?? depth) === depth && s.views.includes(view) && inArea(s.id),
  ).length

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="relative flex min-h-0 flex-1 flex-col">
        <AnatomySvg
          geometry={geometry}
          image={image}
          layer={layer}
          depth={depth}
          viewBox={viewBox}
          onViewBox={setViewBox}
          mode={mode}
          visiblePartIds={visiblePartIds}
          selectedPartId={selectedPartId}
          mirrored={view === 'right'}
          labelOf={(p: Part) => STRUCTURE_BY_ID.get(p.id)?.nameJa ?? p.id}
          onPickArea={pickArea}
          onPickPart={(p) => setSelectedPartId(p.id)}
          onPickNothing={() => setSelectedPartId(null)}
        />
        <div className="pointer-events-auto absolute right-3 top-3 z-20 flex gap-1.5">
          <IconButton label="拡大" onClick={() => setViewBox((vb) => zoomByStep(vb, 1.6, geometry.size))}>
            <PlusIcon className="size-4" />
          </IconButton>
          <IconButton label="縮小" onClick={() => setViewBox((vb) => zoomByStep(vb, 1 / 1.6, geometry.size))}>
            <MinusIcon className="size-4" />
          </IconButton>
          <IconButton label="全体に戻る" onClick={reset}>
            <ResetIcon className="size-4" />
          </IconButton>
        </div>
      </div>

      <div className="shrink-0 lg:w-96 lg:self-stretch">
        <section className="max-h-[46dvh] overflow-hidden rounded-t-sheet bg-surface shadow-soft lg:flex lg:h-full lg:max-h-none lg:flex-col lg:rounded-none lg:border-l lg:border-line lg:shadow-none">
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong lg:hidden" />
          <div className="min-h-0 overflow-y-auto">
            <ChipRow ariaLabel="向き" items={VIEWS} value={view} onChange={switchView} />
            <ChipRow
              ariaLabel="層"
              items={LAYERS}
              value={layer}
              onChange={(l) => {
                setLayer(l)
                setSelectedPartId(null)
              }}
            />
            {layer === 'muscle' ? (
              <ChipRow
                ariaLabel="深さ"
                items={DEPTHS.map((d) => ({
                  ...d,
                  disabled: geometry.images[plateIdOf('muscle', d.id)] === undefined,
                }))}
                value={depth}
                onChange={(d) => {
                  setDepth(d)
                  setSelectedPartId(null)
                }}
              />
            ) : null}

            <div className="min-h-24 px-5 pb-6 pt-3">
              {selected ? (
                <PartSheet structure={selected} onClose={() => setSelectedPartId(null)} />
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-muted">
                    {mode === 'area'
                      ? '部位が細かいので、先に大まかな場所を選んでください'
                      : '図の点をタップすると、その部位の解説が出ます'}
                  </p>
                  <p className="text-xs text-faint">
                    {view === 'right' ? '左側望の図を左右反転して表示しています。' : null}
                    {image === undefined ? 'この層の図はまだありません。' : null}
                  </p>
                  {draftShapes.length > 0 ? (
                    <label className="flex w-fit items-center gap-2 rounded-full bg-raised px-3 py-2 text-xs text-muted">
                      <input type="checkbox" checked={showDraft} onChange={(e) => setShowDraft(e.target.checked)} />
                      キャリブレーションの下書きを重ねて表示（{draftShapes.length} 件）
                    </label>
                  ) : null}
                  <p className="text-xs text-faint" data-testid="placement-status">
                    配置済み {placed} 件 / 対象 {expected} 件（未配置 {Math.max(0, expected - placed)} 件）
                  </p>
                  {areaId ? (
                    <button
                      type="button"
                      onClick={reset}
                      className="mt-1 w-fit rounded-full bg-raised px-3.5 py-2 text-xs text-muted"
                    >
                      大まかな場所を選び直す
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function IconButton(props: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={props.label}
      onClick={props.onClick}
      className="grid size-10 place-items-center rounded-full bg-raised/90 text-fg shadow-soft"
    >
      {props.children}
    </button>
  )
}
