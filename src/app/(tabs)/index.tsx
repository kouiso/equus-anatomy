import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { areaOfStructure } from '../../core/area-map'
import { GEOMETRY, STRUCTURE_BY_ID } from '../../core/data'
import { plateIdOf, type Area, type Depth, type Layer, type Part, type View as AnatomyView, type ViewBox } from '../../core/types'
import { fit, zoomByStep, zoomToPolygon, zoomToPolygons } from '../../core/zoom'
import { AnatomyCanvas } from '../../ui/anatomy-canvas'
import { ChipRow } from '../../ui/chip-row'
import { MinusIcon, PlusIcon, ResetIcon } from '../../ui/icons'
import { PartSheet } from '../../ui/part-sheet'
import { breakpointLg, color, fontSans, radius } from '../../ui/theme'
import { useWindowDimensions } from '../../ui/use-window-dimensions'

const VIEWS = [
  { id: 'left', label: '左側望' },
  { id: 'right', label: '右側望' },
  { id: 'front', label: '正面' },
  { id: 'rear', label: '後面' },
] as const satisfies readonly { id: AnatomyView; label: string }[]

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

const ZOOM_STEP = 1.6
/**
 * 縦画面でのパネルの高さ。旧 Web 版の max-h-[46dvh] と同じ比率やが、上限やのうて固定にしとる。
 * 中身で伸縮させると、シートを開閉するたびに canvas の大きさが変わって
 * 「押した部位が指の下から動く」。CI ではその移動中に押して外れた。
 */
const PANEL_MAX_RATIO = 0.46

export default function AnatomyScreen() {
  const [view, setView] = useState<AnatomyView>('left')
  const [layer, setLayer] = useState<Layer>('muscle')
  const [depth, setDepth] = useState<Depth>('superficial')
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null)
  const [areaId, setAreaId] = useState<string | null>(null)
  // viewBox は向きと一緒に決める。useEffect に置くと1フレームだけ前の向きの枠で描いてしまう。
  const [zoom, setZoom] = useState<{ view: AnatomyView; vb: ViewBox } | null>(null)
  const params = useLocalSearchParams<{ part?: string }>()
  // 図鑑からの ?part= ジャンプは一度だけ適用する。適用済みの id を覚えて、
  // タブに残ったパラメータが向き・層の手動操作を巻き戻さんようにする
  const [appliedPart, setAppliedPart] = useState<string | null>(null)

  if (typeof params.part === 'string' && params.part !== appliedPart) {
    setAppliedPart(params.part)
    const s = STRUCTURE_BY_ID.get(params.part)
    if (s !== undefined) {
      // その部位が実際に置いてある向きを優先する（置いてへん向きでは点が出ない）
      const v = s.views.find((vv) => GEOMETRY[vv].parts.some((p: Part) => p.id === s.id)) ?? s.views[0] ?? 'left'
      const g = GEOMETRY[v]
      setView(v)
      setLayer(s.layer)
      if (s.depth !== undefined) setDepth(s.depth)
      setAreaId(areaOfStructure(s))
      setSelectedPartId(s.id)
      const part = g.parts.find((p) => p.id === s.id)
      // 座標が無い部位は寄りようがないので、選択だけして位置は動かさん
      setZoom(part ? { view: v, vb: zoomToPolygon(part.points, g.size) } : null)
    }
  }
  const { width, height } = useWindowDimensions()
  // lg 以上は解説を右に並べる
  const wide = width >= breakpointLg

  const geometry = GEOMETRY[view]
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
      : new Set([...STRUCTURE_BY_ID.values()].filter((s) => areaOfStructure(s) === areaId).map((s) => s.id))
  const selected = selectedPartId ? (STRUCTURE_BY_ID.get(selectedPartId) ?? null) : null

  const reset = () => {
    setZoom(null)
    setAreaId(null)
    setSelectedPartId(null)
  }

  const switchView = (v: AnatomyView) => {
    setView(v)
    setZoom(null)
    setAreaId(null)
    setSelectedPartId(null)
  }

  const pickArea = (a: Area) => {
    setAreaId(a.id)
    setSelectedPartId(null)
    // その場所に出る部位の範囲へ寄せる。部位がまだ無い場所は輪郭に寄せる
    const ids = new Set([...STRUCTURE_BY_ID.values()].filter((s) => areaOfStructure(s) === a.id).map((s) => s.id))
    const target = geometry.parts.filter((p) => ids.has(p.id) && p.layer === layer && (p.depth ?? depth) === depth)
    setViewBox(() =>
      target.length > 0
        ? zoomToPolygons(
            target.map((p) => p.points),
            geometry.size,
          )
        : zoomToPolygon(a.points, geometry.size),
    )
  }

  const inArea = (id: string) => visiblePartIds === null || visiblePartIds.has(id)
  const placed = geometry.parts.filter((p) => p.layer === layer && (p.depth ?? depth) === depth && inArea(p.id)).length
  const expected = [...STRUCTURE_BY_ID.values()].filter(
    (s) => s.layer === layer && (s.depth ?? depth) === depth && s.views.includes(view) && inArea(s.id),
  ).length

  const notes = [
    view === 'right' ? '左側望の図を左右反転して表示しています。' : null,
    image === undefined ? 'この層の図はまだありません。' : null,
  ].filter((n): n is string => n !== null)

  return (
    <View style={[styles.root, wide ? styles.rootWide : null]}>
      <View style={styles.canvasWrap}>
        <AnatomyCanvas
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
        <View style={styles.tools}>
          <IconButton
            testID="zoom-in"
            label="拡大"
            onPress={() => setViewBox((vb) => zoomByStep(vb, ZOOM_STEP, geometry.size))}
          >
            <PlusIcon color={color.fg} size={16} />
          </IconButton>
          <IconButton
            testID="zoom-out"
            label="縮小"
            onPress={() => setViewBox((vb) => zoomByStep(vb, 1 / ZOOM_STEP, geometry.size))}
          >
            <MinusIcon color={color.fg} size={16} />
          </IconButton>
          <IconButton testID="zoom-reset" label="全体に戻る" onPress={reset}>
            <ResetIcon color={color.fg} size={16} />
          </IconButton>
        </View>
      </View>

      <View
        testID="anatomy-panel"
        style={wide ? styles.panelWide : [styles.panel, { height: height * PANEL_MAX_RATIO }]}
      >
        {/* つまみは縦並びの時だけ。横並びでは引き上げる相手が無い */}
        {wide ? null : <View style={styles.handle} />}
        <ScrollView style={styles.scroll}>
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

          <View style={styles.content}>
            {selected ? (
              <PartSheet structure={selected} onClose={() => setSelectedPartId(null)} />
            ) : (
              <View style={styles.hints}>
                <Text style={styles.hint}>
                  {mode === 'area'
                    ? '部位が細かいので、先に大まかな場所を選んでください'
                    : '図の点をタップすると、その部位の解説が出ます'}
                </Text>
                {notes.length > 0 ? <Text style={styles.note}>{notes.join('')}</Text> : null}
                <Text style={styles.note} testID="placement-status">
                  配置済み {placed} 件 / 対象 {expected} 件（未配置 {Math.max(0, expected - placed)} 件）
                </Text>
                {areaId ? (
                  <Pressable
                    testID="reselect-area"
                    accessibilityRole="button"
                    accessibilityLabel="大まかな場所を選び直す"
                    onPress={reset}
                    style={styles.reselect}
                  >
                    <Text style={styles.reselectText}>大まかな場所を選び直す</Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  )
}

function IconButton(props: { testID: string; label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="button"
      accessibilityLabel={props.label}
      onPress={props.onPress}
      style={styles.iconButton}
    >
      {props.children}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, flexDirection: 'column', backgroundColor: color.bg },
  rootWide: { flexDirection: 'row' },
  canvasWrap: { flex: 1, minHeight: 0, position: 'relative' },
  tools: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', gap: 6 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    // raised/90。図の上に浮くので少し透かして下の絵を見せる
    backgroundColor: 'rgba(30,33,38,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
  },
  panel: {
    flexShrink: 0,
    overflow: 'hidden',
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: color.surface,
    boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
  },
  panelWide: {
    width: 384,
    alignSelf: 'stretch',
    overflow: 'hidden',
    backgroundColor: color.surface,
    borderLeftWidth: 1,
    borderLeftColor: color.line,
  },
  handle: {
    alignSelf: 'center',
    marginTop: 8,
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: color.lineStrong,
  },
  // 親の maxHeight に収まるように縮む。ここが伸びると 46% の上限が効かん
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { minHeight: 96, paddingHorizontal: 20, paddingBottom: 24, paddingTop: 12 },
  hints: { flexDirection: 'column', gap: 8 },
  hint: { fontFamily: fontSans, fontSize: 14, lineHeight: 20, color: color.muted },
  note: { fontFamily: fontSans, fontSize: 12, lineHeight: 16, color: color.faint },
  reselect: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderRadius: radius.pill,
    backgroundColor: color.raised,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  reselectText: { fontFamily: fontSans, fontSize: 12, lineHeight: 16, color: color.muted },
})
