import { useEffect, useMemo, useRef, useState } from 'react'
import { AREA_PRESETS } from '../../core/data/areas'
import { GEOMETRY, STRUCTURES } from '../../core/data'
import { centroid, markerScale, toPath, viewBoxToString } from '../../core/geometry'
import { fit, zoomByStep } from '../../core/zoom'
import { plateIdOf, type Depth, type Layer, type Point, type View, type ViewBox } from '../../core/types'
import { useElementSize } from '../useElementSize'
import { useGestures } from '../useGestures'
import { DRAFT_KEY, notifyDraftChanged } from '../draft'
import { ChipRow } from '../component/chips'
import { MinusIcon, PlusIcon, ResetIcon } from '../component/icons'

type Shape = { kind: 'area' | 'part'; id: string; points: Point[] }
const VERTEX_HIT = 14 // CSS px。ここを叩いたらその頂点を消す

/** 下書きは初期化子で1回だけ読む。effect で読むと初回レンダーが二度走る。 */
function loadDraft(): Record<string, Shape[]> {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as Record<string, Shape[]>) : {}
  } catch {
    return {}
  }
}

const VIEWS = [
  { id: 'left', label: '左側望' },
  { id: 'front', label: '正面' },
  { id: 'rear', label: '後面' },
] as const satisfies readonly { id: Exclude<View, 'right'>; label: string }[]
const LAYERS = [
  { id: 'skin', label: '皮膚' },
  { id: 'muscle', label: '筋肉' },
  { id: 'skeleton', label: '骨格' },
  { id: 'organs', label: '内臓' },
] as const satisfies readonly { id: Layer; label: string }[]

/**
 * 座標を実測して入れるための道具。
 * VIA や CVAT で採った座標の取り込み・微調整と、本番と同じ描画での確認をここでやる。
 * 「置いた座標がそのまま本番の絵になる」ループが要るから自作しとる。
 */
export function CalibrateScreen() {
  const [view, setView] = useState<Exclude<View, 'right'>>('left')
  const [layer, setLayer] = useState<Layer>('muscle')
  const [depth] = useState<Depth>('superficial')
  const [kind, setKind] = useState<'area' | 'part'>('part')
  const [chosenId, setChosenId] = useState<string | null>(null)
  const [shapes, setShapes] = useState<Record<string, Shape[]>>(loadDraft)
  // 下書きは「どの向き・どの種類で描きよったか」ごと持つ。切り替えたら自動で空に戻る。
  const [draftState, setDraftState] = useState<{ ctx: string; points: Point[] }>({ ctx: '', points: [] })
  const [zoom, setZoom] = useState<{ view: string; vb: ViewBox } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const geometry = GEOMETRY[view]
  const size = geometry.size
  const viewBox = zoom && zoom.view === view ? zoom.vb : fit(size)
  const setViewBox = (update: (prev: ViewBox) => ViewBox) =>
    setZoom((prev) => ({ view, vb: update(prev && prev.view === view ? prev.vb : fit(size)) }))
  const image = geometry.images[plateIdOf(layer, depth)]
  const current = shapes[view] ?? []

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(shapes))
      notifyDraftChanged()
    } catch {
      // 保存でけへんかっても作業は続けられる
    }
  }, [shapes])

  const candidates = useMemo(() => {
    if (kind === 'area') return AREA_PRESETS.map((a) => ({ id: a.id, label: a.nameJa }))
    return STRUCTURES.filter(
      (s) => s.layer === layer && (s.depth ?? depth) === depth && s.views.includes(view),
    ).map((s) => ({ id: s.id, label: `${s.nameJa}（${s.nameLa}）` }))
  }, [kind, layer, depth, view])

  // 選択中の対象はレンダー中に導出する。effect で setState すると再レンダーが連鎖する。
  const firstUnplaced = candidates.find((c) => !current.some((s) => s.kind === kind && s.id === c.id))?.id
  const targetId =
    chosenId !== null && candidates.some((c) => c.id === chosenId)
      ? chosenId
      : (firstUnplaced ?? candidates[0]?.id ?? '')

  const ctx = `${view}/${kind}`
  const draft = draftState.ctx === ctx ? draftState.points : []
  const setDraft = (points: Point[]) => setDraftState({ ctx, points })

  const [boxRef, container] = useElementSize<HTMLDivElement>()
  const k = markerScale(viewBox, container)

  const gestures = useGestures({
    size,
    onViewBox: setViewBox,
    onTap: (pt) => {
      // 打ったばかりの頂点をもう一度叩いたら取り消す（Undo をいちいち探さんでええように）
      const near = draft.findIndex((v) => Math.hypot(v[0] - pt[0], v[1] - pt[1]) < VERTEX_HIT * k)
      if (near >= 0) return setDraft(draft.filter((_, i) => i !== near))
      setDraft([...draft, [Math.round(pt[0]), Math.round(pt[1])]])
    },
  })

  const commit = () => {
    if (draft.length < 3 || !targetId) return
    setShapes({
      ...shapes,
      [view]: [...current.filter((s) => !(s.kind === kind && s.id === targetId)), { kind, id: targetId, points: draft }],
    })
    setDraft([])
    setMessage(null)
  }

  const remove = (s: Shape) => setShapes({ ...shapes, [view]: current.filter((x) => x !== s) })

  const buildJson = () => {
    const areas = current
      .filter((s) => s.kind === 'area')
      .map((s) => ({ id: s.id, nameJa: AREA_PRESETS.find((a) => a.id === s.id)?.nameJa ?? s.id, points: s.points }))
    const parts = current
      .filter((s) => s.kind === 'part')
      .map((s) => {
        const st = STRUCTURES.find((x) => x.id === s.id)
        const base: Record<string, unknown> = { id: s.id, layer: st?.layer ?? layer }
        if (st?.depth) base.depth = st.depth
        base.points = s.points
        base.labelAt = centroid(s.points).map((n) => Math.round(n))
        return base
      })
    return JSON.stringify({ ...JSON.parse(JSON.stringify(rawOf(view))), areas, parts }, null, 2)
  }

  const download = () => {
    const blob = new Blob([`${buildJson()}\n`], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${view}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setMessage(`${view}.json を書き出しました。src/core/data/regions/ に置いて pnpm validate:coords を走らせてください。`)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildJson())
      setMessage('JSON をクリップボードにコピーしました。')
    } catch {
      setMessage('コピーできませんでした。ダウンロードを使ってください。')
    }
  }

  const importFile = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as {
        areas?: { id: string; points: Point[] }[]
        parts?: { id: string; points: Point[] }[]
      }
      const next: Shape[] = [
        ...(parsed.areas ?? []).map((a): Shape => ({ kind: 'area', id: a.id, points: a.points })),
        ...(parsed.parts ?? []).map((p): Shape => ({ kind: 'part', id: p.id, points: p.points })),
      ]
      setShapes({ ...shapes, [view]: next })
      setMessage(`${next.length} 件を読み込みました。`)
    } catch {
      setMessage('JSON を読めませんでした。VIA / COCO は先に pnpm import:annotations で変換してください。')
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div ref={boxRef} className="relative min-h-[44dvh] flex-1 overflow-hidden bg-bg lg:min-h-0">
        <div className="absolute inset-0 grid place-items-center">
          <svg
            data-testid="calibrate-svg"
            viewBox={viewBoxToString(viewBox)}
            preserveAspectRatio="xMidYMid meet"
            className="max-h-full max-w-full touch-none select-none"
            style={{ width: '100%', height: '100%' }}
            {...gestures}
          >
            <rect x={0} y={0} width={size.w} height={size.h} fill="var(--color-bg)" pointerEvents="none" />
            {image ? (
              <image href={image.src} x={0} y={0} width={size.w} height={size.h} preserveAspectRatio="none" pointerEvents="none" />
            ) : null}
            <g pointerEvents="none">
              {current.map((s) => (
                <g key={`${s.kind}-${s.id}`}>
                  <path d={toPath(s.points)} fill="var(--color-bone)" fillOpacity={0.14} stroke="var(--color-bone)" strokeOpacity={0.7} strokeWidth={1.5 * k} />
                  <circle cx={centroid(s.points)[0]} cy={centroid(s.points)[1]} r={4 * k} fill="var(--color-bone)" />
                </g>
              ))}
              {draft.length > 0 ? (
                <>
                  <path
                    d={`M ${draft.map((p) => `${p[0]} ${p[1]}`).join(' L ')}${draft.length > 2 ? ' Z' : ''}`}
                    fill={draft.length > 2 ? '#5FC08E' : 'none'}
                    fillOpacity={0.18}
                    stroke="#5FC08E"
                    strokeWidth={2 * k}
                  />
                  {draft.map((p, i) => (
                    <circle key={i} cx={p[0]} cy={p[1]} r={5 * k} fill="#5FC08E" />
                  ))}
                </>
              ) : null}
            </g>
          </svg>
        </div>
        <div className="absolute right-3 top-3 z-20 flex gap-1.5">
          <button type="button" aria-label="拡大" onClick={() => setViewBox((vb) => zoomByStep(vb, 1.6, size))} className="grid size-10 place-items-center rounded-full bg-raised/90 shadow-soft">
            <PlusIcon className="size-4" />
          </button>
          <button type="button" aria-label="縮小" onClick={() => setViewBox((vb) => zoomByStep(vb, 1 / 1.6, size))} className="grid size-10 place-items-center rounded-full bg-raised/90 shadow-soft">
            <MinusIcon className="size-4" />
          </button>
          <button type="button" aria-label="全体に戻る" onClick={() => setZoom(null)} className="grid size-10 place-items-center rounded-full bg-raised/90 shadow-soft">
            <ResetIcon className="size-4" />
          </button>
        </div>
      </div>

      <div className="max-h-[52dvh] shrink-0 overflow-y-auto bg-surface lg:h-full lg:max-h-none lg:w-96 lg:border-l lg:border-line">
        <ChipRow ariaLabel="向き" items={VIEWS} value={view} onChange={setView} />
        <ChipRow ariaLabel="層" items={LAYERS} value={layer} onChange={setLayer} />
        <ChipRow
          ariaLabel="種類"
          items={[
            { id: 'part' as const, label: '部位' },
            { id: 'area' as const, label: '大まかな場所' },
          ]}
          value={kind}
          onChange={setKind}
        />
        <div className="flex flex-col gap-3 px-4 pb-8 pt-3">
          <label className="flex flex-col gap-1 text-xs text-faint">
            なぞる対象
            <select
              value={targetId}
              onChange={(e) => setChosenId(e.target.value)}
              className="h-10 rounded-lg bg-raised px-3 text-sm text-fg"
            >
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {current.some((s) => s.kind === kind && s.id === c.id) ? '● ' : '○ '}
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <p className="text-xs leading-relaxed text-muted">
            図をタップして輪郭の頂点を置きます。打った点をもう一度タップすると消えます。ピンチと1本指ドラッグで寄れます。
          </p>

          <div className="flex gap-2">
            <button type="button" onClick={commit} disabled={draft.length < 3} className="h-10 flex-1 rounded-full bg-bone text-sm text-accent-fg disabled:opacity-40">
              確定（{draft.length}点）
            </button>
            <button type="button" onClick={() => setDraft(draft.slice(0, -1))} disabled={draft.length === 0} className="h-10 rounded-full bg-raised px-4 text-sm text-muted disabled:opacity-40">
              1つ戻す
            </button>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={copy} className="h-10 flex-1 rounded-full bg-raised text-sm">JSON をコピー</button>
            <button type="button" onClick={download} className="h-10 flex-1 rounded-full bg-raised text-sm">ダウンロード</button>
          </div>
          <button type="button" onClick={() => fileRef.current?.click()} className="h-10 rounded-full bg-raised text-sm text-muted">
            既存の JSON を読み込む
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void importFile(f)
              e.target.value = ''
            }}
          />

          {message ? <p className="rounded-lg bg-raised px-3 py-2 text-xs leading-relaxed text-fg">{message}</p> : null}

          <div>
            <p className="pb-1 text-xs text-faint">
              この向きで確定済み {current.length} 件（下書きは自動保存されます）
            </p>
            <ul>
              {current.map((s) => (
                <li key={`${s.kind}-${s.id}`} className="flex items-center gap-2 border-b border-line py-2 text-sm">
                  <span className="w-10 shrink-0 text-xs text-faint">{s.kind === 'area' ? '場所' : '部位'}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {STRUCTURES.find((x) => x.id === s.id)?.nameJa ?? AREA_PRESETS.find((a) => a.id === s.id)?.nameJa ?? s.id}
                  </span>
                  <span className="shrink-0 text-xs text-faint">{s.points.length}点</span>
                  <button type="button" onClick={() => remove(s)} className="shrink-0 rounded-full bg-raised px-2.5 py-1 text-xs text-muted">
                    削除
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

function rawOf(view: Exclude<View, 'right'>) {
  const g = GEOMETRY[view]
  return { view, size: g.size, images: g.images, measuredOn: g.measuredOn }
}
