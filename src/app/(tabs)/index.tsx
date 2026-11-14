import { usePersistenceRetryOnFocus } from '../../ui/persistence-banner'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { visibleStructures } from '../../core/visible-parts'
import { bottomOverlayMaxWidth, canvasOverlayRects, selectorMaxWidth } from '../../core/canvas-overlay'
import { GEOMETRY, STRUCTURE_BY_ID } from '../../core/data'
import { structureName, structureText } from '../../core/i18n'
import { oppositeLateralView } from '../../core/map-entry'
import { hasLayerPlate, hasPlate, layerHasDepth, normalizeDepth } from '../../core/plate-availability'
import { plateIdOf, type Depth, type Layer, type Part, type View as ViewId } from '../../core/types'
import { fit, zoomByStep } from '../../core/zoom'
import { AnatomyCanvas } from '../../ui/anatomy-canvas'
import { ariaLevel } from '../../ui/aria'
import { changeConditions, DEPTHS, LAYERS, VIEWS, useAnatomy, emptyTapBack, deselectAnatomyPart, focusAnatomyPart, resetAnatomy, pickAnatomyArea, pickAnatomyPartByTap, selectAnatomyCandidate, setAnatomyViewBox, showOppositeAnatomySide, stepBackAnatomy } from '../../ui/anatomy-state'
import { ChipRow } from '../../ui/chip-row'
import { nextBackStep } from '../../core/back-step'
import { useAnatomyBackHandler } from '../../ui/anatomy-back-handler'
import { BackIcon, CloseIcon, MinusIcon, PlusIcon, ResetIcon, SwapSidesIcon } from '../../ui/icons'
import { SHORT_ROOT_HEIGHT, panelLayout, type PanelRoom } from '../../core/panel-height'
import { useLocale, useT } from '../../ui/locale-store'
import { breakpointLg, color, fontSans, radius } from '../../ui/theme'

let lastLayout = { width: 0, height: 0 }

export default function AnatomyScreen() {
 usePersistenceRetryOnFocus()
  useAnatomyBackHandler()
  const {view,layer,depth,selectedPartId,candidatePartIds,areaId,zoom} = useAnatomy()
  const params = useLocalSearchParams<{part?:string}>()
  const locale = useLocale()
  const t = useT()
  const router = useRouter()
  const opening = useRef(false)
  useFocusEffect(useCallback(()=>{opening.current=false},[]))
  const [size,setSize]=useState(lastLayout)
  const wide=size.width>=breakpointLg && size.width>size.height
  useEffect(()=>{if(typeof params.part==='string'){focusAnatomyPart(params.part);router.setParams({part:undefined})}},[params.part,router])
  const geometry=GEOMETRY[view]
  const viewBox=zoom??fit(geometry.size)
  const setViewBox=setAnatomyViewBox
  const reset=resetAnatomy
  const pickArea=pickAnatomyArea
  const open=(kind:'conditions'|'parts'|'detail')=>{
    if(opening.current)return
    opening.current=true
    router.push({pathname:'/overlay',params:{kind,view,layer,depth,area:areaId??'',id:selectedPartId??'',source:'anatomy'}})
  }
  const plate = plateIdOf(layer, depth)
  const image = geometry.images[plate]
  const mode: 'area' | 'part' = areaId === null && geometry.areas.length > 0 ? 'area' : 'part'
  // 出す部位の条件（向き・場所・層・深さ）は core の visibleStructures に1つだけ置く。
  // 図形・一覧・計数・場所を選んだ時の寄せ先が同じ集合を見るため (#277)
  const visiblePartIds = new Set(visibleStructures(STRUCTURE_BY_ID.values(), { view, areaId }).map((s) => s.id))
  const selected = selectedPartId ? (STRUCTURE_BY_ID.get(selectedPartId) ?? null) : null
  const oppositeView = selected ? oppositeLateralView(selected, view) : null

  const inArea = (id: string) => visiblePartIds.has(id)
  const placed = geometry.parts.filter((p) => p.layer === layer && (p.depth ?? depth) === depth && inArea(p.id)).length
  const expected = visibleStructures(STRUCTURE_BY_ID.values(), { view, areaId, layer, depth }).length

  const notes = [
    view === 'right' ? t('anatomy.mirroredNote') : null,
    image === undefined ? t('anatomy.noPlate') : null,
  ].filter((n): n is string => n !== null)
  const notesSeparator = locale === 'en' ? ' ' : ''
  // 解除の手段は「× ボタン」の他に見えるものが無い。空白タップ(と Android の端末 BACK)を
  // 初見で知る術が無いので、選択中は一文で添える
  const deselectHint = Platform.OS === 'android' ? t('anatomy.deselectHintAndroid') : t('anatomy.deselectHint')
  // 高さ未確定の初回描画は従来経路にする。ScrollView 経路だと図が最終寸法でしか描かれず、
  // 寸法が縮む遷移が消えて、遷移直後のタップを新寸法で判定する経路が試せなくなる
  const shortRoot = !wide && size.height > 0 && size.height < SHORT_ROOT_HEIGHT
  // 本文をスクロールしても、選択を解除する操作は同じ位置に残す。
  const panelActionStyle = selected ? (size.width < 400 ? styles.panelActionFull : styles.panelActionCompact) : null
  const [canvasHeight, setCanvasHeight] = useState(0)
  const deselectBtn = selected ? (
    <Pressable accessibilityRole="button" testID="close-sheet" accessibilityLabel={t('anatomy.deselect')} onPress={deselectAnatomyPart} style={[styles.reselect,styles.deselect,oppositeView ? styles.panelActionFull : panelActionStyle]}>
      <CloseIcon color={color.fg} size={14} /><Text style={styles.deselectText}>{t('anatomy.deselect')}</Text>
    </Pressable>
  ) : null
  // 「1つ戻る」チップ。出す段の判定は nextBackStep が唯一の情報源で、
  // 読み上げにはどの段へ戻るかを添える(端末 BACK・空白タップと同じ梯子)
  const backStep = nextBackStep({selectedPartId, areaId, zoom})
  // 右上のズーム列と12px離す。文字拡大時の省略表示でも読み上げには全文を残す。
  const canvasWidth = size.width - (wide ? 320 : 0)
  const selectorMaxW = selectorMaxWidth(canvasWidth)
  const selectorLabel = mode === 'area' ? t('anatomy.areasAndParts') : t('anatomy.partsList')
  // 表示条件・詳しく読むは図の左下に重ねる(Issue #178)。部位一覧と縦に重なる低い図では、
  // 従来どおり下のボタン列へ戻す。縦並びなので高さは決まる(48px × 個数 + 隙間)
  const overlayCount = selected ? 2 : 1
  const overlayHeight = overlayCount * 48 + (overlayCount - 1) * 12
  const topUsed = 60
  const overlayFits = canvasHeight === 0 || canvasHeight >= topUsed + 12 + overlayHeight + 12
  // 左下は右上のズーム列と並ばんので、上段より広く取れる（文字拡大でも省略せず読ませる）
  const bottomMaxW = bottomOverlayMaxWidth(canvasWidth)
  const [overlayWidth, setOverlayWidth] = useState(0)
  const readMoreBtn = (style: StyleProp<ViewStyle>, textStyle: StyleProp<TextStyle>, testID?: string) => selected ? (
    <Pressable accessibilityRole="button" testID={testID} onPress={()=>open('detail')} style={style}><Text numberOfLines={1} style={textStyle}>{t('anatomy.readMore')}</Text></Pressable>
  ) : null
  const conditionsBtn = (style: StyleProp<ViewStyle>, textStyle: StyleProp<TextStyle>, testID?: string) => (
    <Pressable accessibilityRole="button" testID={testID} onPress={()=>open('conditions')} style={style}><Text numberOfLines={1} style={textStyle}>{t('anatomy.conditions')}</Text></Pressable>
  )
  const backLabel = backStep === 'part' ? t('anatomy.backPartLabel') : backStep === 'area' ? t('anatomy.backAreaLabel') : backStep === 'zoom' ? t('anatomy.backZoomLabel') : ''

  // 層・向き・深さのチップ。押せるかは表示条件の画面と同じ hasLayerPlate / hasPlate で決める。
  // 層と深さを替えても場所と寄りは残り、向きを替えた時だけ外れる（changeConditions の既存の動き）。
  // 層を替えた先で今の深さの図が無ければ、図のある深さへ寄せて空の図に着地させない
  const effectiveDepth: Depth = normalizeDepth(geometry, layer, depth)
  const changeLayer = (next: Layer) => changeConditions(view, next, normalizeDepth(geometry, next, depth))
  const changeView = (next: ViewId) => changeConditions(next, layer, normalizeDepth(GEOMETRY[next], layer, depth))
  const changeDepth = (next: Depth) => changeConditions(view, layer, next)
  // 部位を選んでいる間は、名前・要約・操作を先に見せる。ただし横長の右の欄は常に出す
  const showChips = wide || selected === null
  const conditionChips = showChips ? (
    <View testID="condition-chips" style={styles.conditionChips}>
      <View style={[styles.chipGroupRow, wide ? styles.chipGroupRowStacked : null]}>
        <Text style={styles.chipGroupLabel}>{t('overlay.layer')}</Text>
        <View style={[styles.chipGroupChips, wide ? styles.chipGroupChipsStacked : null]}>
          <ChipRow wrap compact ariaLabel={t('overlay.layer')} value={layer} onChange={changeLayer}
            items={LAYERS.map((candidate) => ({ ...candidate, label: t(`layer.${candidate.id}`), disabled: !hasLayerPlate(geometry, candidate.id) }))} />
        </View>
      </View>
      <View style={[styles.chipGroupRow, wide ? styles.chipGroupRowStacked : null]}>
        <Text style={styles.chipGroupLabel}>{t('overlay.view')}</Text>
        <View style={[styles.chipGroupChips, wide ? styles.chipGroupChipsStacked : null]}>
          <ChipRow wrap compact ariaLabel={t('overlay.view')} value={view} onChange={changeView}
            items={VIEWS.map((candidate) => ({ ...candidate, label: t(`view.${candidate.id}`), disabled: !hasLayerPlate(GEOMETRY[candidate.id], layer) }))} />
        </View>
      </View>
      {layerHasDepth(layer) ? (
        <View style={[styles.chipGroupRow, wide ? styles.chipGroupRowStacked : null]}>
          <Text style={styles.chipGroupLabel}>{t('overlay.depth')}</Text>
          <View style={[styles.chipGroupChips, wide ? styles.chipGroupChipsStacked : null]}>
            <ChipRow wrap compact ariaLabel={t('overlay.depth')} value={effectiveDepth} onChange={changeDepth}
              items={DEPTHS.map((candidate) => {
                const disabled = !hasPlate(geometry, 'muscle', candidate.id)
                // 図の無い深さは、押せない理由が字面で分かるようにする（デザイン: 深層筋（図なし））
                return { ...candidate, label: disabled && candidate.id === 'deep' ? t('depth.deepNoPlate') : t(`depth.${candidate.id}`), disabled }
              })} />
          </View>
        </View>
      ) : null}
    </View>
  ) : null

  const candidatesNode = candidatePartIds.length > 1 && selectedPartId ? <View testID="part-candidates">
    <Text style={styles.hint}>{t('anatomy.candidates')}</Text>
    <ChipRow wrap ariaLabel={t('anatomy.candidates')} value={selectedPartId} onChange={selectAnatomyCandidate}
      items={candidatePartIds.map((id) => ({ id, label: STRUCTURE_BY_ID.has(id) ? structureName(STRUCTURE_BY_ID.get(id)!, locale) : id }))} />
  </View> : null
  const headingNode = selected ? <View style={styles.row}>
    <Text accessibilityRole="header" {...ariaLevel(2)} style={[styles.selectedName,{flex:1}]}>{structureName(selected, locale)}</Text>
  </View> : null
  const hintNode = selected ? null : <Text style={styles.hint}>{mode==='area'?t('anatomy.hintArea'):t('anatomy.hintPart')}</Text>
  const detailNodes = <>
    {selected?<Text testID="deselect-hint" style={styles.note}>{deselectHint}</Text>:null}
    {selected && (wide || size.height>=600)?<Text style={styles.hint} numberOfLines={2}>{(structureText(selected, locale).summary !== selected.summary ? t('detail.draftTag') : '') + structureText(selected, locale).summary}</Text>:null}
    {selected&&!geometry.parts.some(p=>p.id===selected.id&&inArea(p.id))?<Text style={styles.note}>{t('anatomy.unplacedSelected')}</Text>:null}
    <Text style={styles.note}>{t(`view.${view}`)} · {t(`layer.${layer}`)}{layerHasDepth(layer)?` · ${t(`depth.${depth}`)}`:''}</Text>
    {notes.length?<Text style={styles.note}>{notes.join(notesSeparator)}</Text>:null}
    {expected>placed?<Text style={styles.note} testID="placement-status">{t('anatomy.unplacedCount', { count: expected - placed })}</Text>:null}
  </>

  const anatomyContent = <>
      <View style={[styles.canvasWrap,shortRoot?styles.shortCanvas:null]} onLayout={e=>setCanvasHeight(e.nativeEvent.layout.height)}>
        <AnatomyCanvas
          reservedRects={size.width ? canvasOverlayRects({
            canvasWidth,
            // 戻る操作は説明パネルにあるため、図上の予約枠を残さない。
            showBack: false,
            shortCanvas: false,
            ...(overlayFits && canvasHeight > 0 ? {bottom: {canvasHeight, height: overlayHeight, width: overlayWidth}} : {}),
          }) : []}
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
          labelOf={(p: Part) => {
            const s = STRUCTURE_BY_ID.get(p.id)
            return s ? structureName(s, locale) : p.id
          }}
          onPickArea={pickArea}
          onPickPart={(p, candidates) => pickAnatomyPartByTap(p.id, candidates.map((part) => part.id))}
          onPickNothing={emptyTapBack}
        />
        <View style={[styles.leftCluster, {maxWidth: selectorMaxW}]}>
        <Pressable accessibilityRole="button" testID="part-selector" accessibilityLabel={selectorLabel} onPress={()=>open('parts')} style={[styles.canvasAction, {maxWidth: selectorMaxW}]}>
          <Text numberOfLines={1} style={styles.stepBackText}>{selectorLabel}</Text>
        </Pressable>
        </View>
        <View style={styles.tools}>
          <IconButton
            testID="zoom-in"
            label={t('anatomy.zoomIn')}
            onPress={() => setViewBox((vb) => zoomByStep(vb, 1.6, geometry.size, geometry.mask))}
          >
            <PlusIcon color={color.fg} size={16} />
          </IconButton>
          <IconButton
            testID="zoom-out"
            label={t('anatomy.zoomOut')}
            onPress={() => setViewBox((vb) => zoomByStep(vb, 1 / 1.6, geometry.size, geometry.mask))}
          >
            <MinusIcon color={color.fg} size={16} />
          </IconButton>
          <IconButton testID="zoom-reset" label={t('anatomy.zoomReset')} onPress={reset}>
            <ResetIcon color={color.fg} size={16} />
          </IconButton>
        </View>
        {overlayFits ? (
          <View testID="canvas-actions" onLayout={e=>setOverlayWidth(e.nativeEvent.layout.width)} style={[styles.bottomCluster,{maxWidth: bottomMaxW}]}>
            {readMoreBtn([styles.canvasAction,styles.canvasPrimary,{maxWidth: bottomMaxW}],[styles.stepBackText,{color:color.accentFg}],'read-more')}
            {conditionsBtn([styles.canvasAction,{maxWidth: bottomMaxW}],styles.stepBackText,'conditions')}
          </View>
        ) : null}
      </View>

      <AnatomyPanel snug={!wide && showChips} wide={wide} rootHeight={size.height} heading={wide ? null : headingNode} actions={backStep || selected || !overlayFits ? <>
          {/* 選択円を覆わず、本文をスクロールしても戻る操作を見失わないようにする。 */}
          {backStep ? <Pressable accessibilityRole="button" testID="step-back" accessibilityLabel={backLabel} onPress={stepBackAnatomy} style={[styles.reselect,styles.stepBack,oppositeView ? styles.backWithSide : panelActionStyle]}>
            <BackIcon color={color.fg} size={14} /><Text style={[styles.stepBackText,styles.panelActionText]}>{t('anatomy.back')}</Text>
          </Pressable> : null}
          {oppositeView ? <Pressable testID="opposite-side" accessibilityRole="button" accessibilityLabel={t('anatomy.oppositeSide', { view: t(`view.${oppositeView}`) })} onPress={showOppositeAnatomySide} style={styles.sideToggle}>
            <SwapSidesIcon color={color.fg} size={20} />
          </Pressable> : null}
          {deselectBtn}
          {!overlayFits ? <>
            {readMoreBtn([styles.reselect,styles.primary,panelActionStyle],[styles.reselectText,{color:color.accentFg}])}
            {conditionsBtn([styles.reselect,panelActionStyle],styles.reselectText)}
          </> : null}
        </> : null}>
          {/* 横長は層・向き・深さを右の欄の一番上に常に置き、名前と要約はその下（境目の線の下）に出す。
              縦長は部位を選んでいる間チップを出さず、名前と操作を先に見せる */}
          {wide ? <>
            {conditionChips}
            <View style={styles.belowChips}>{headingNode}{candidatesNode}{hintNode}{detailNodes}</View>
          </> : <>
            {candidatesNode}{hintNode}{conditionChips}{detailNodes}
          </>}
      </AnatomyPanel>
  </>

  return (
    <View onLayout={e=>{
      const {width,height}=e.nativeEvent.layout
      if(width>0 && height>0) { lastLayout={width,height}; setSize(lastLayout) }
    }} style={[styles.root, wide ? styles.rootWide : null]}>
      {shortRoot?<ScrollView testID="anatomy-flow" style={styles.scroll} contentContainerStyle={styles.flowContent}>{anatomyContent}</ScrollView>:anatomyContent}
    </View>
  )
}

/**
 * 計測した高さはこの部品の中だけで持つ。画面全体の state にすると、文字の再計測や
 * 選択で説明欄が変わるたびに図（AnatomyCanvas）とジェスチャまで作り直すことになる。
 */
function AnatomyPanel(props: { snug?: boolean; wide: boolean; rootHeight: number; actions: React.ReactNode | null; children: React.ReactNode; heading: React.ReactNode }) {
  const { wide, rootHeight } = props
  const [room, setRoom] = useState<PanelRoom>({ actions: 0, content: 0, heading: 0 })
  // 詳細シートが開く/閉じる間、下の画面は一瞬レイアウト0を報告する。実際に0pxになる
  // 部品は無いので、0は潜った間の化けた値として捨てる(残すと高さが揺れて図まで揺れる)
  const measure = (key: keyof PanelRoom, value: number) => {
    if (value <= 0) return
    setRoom((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }))
  }
  const { height, tiny, crowded, short } = panelLayout({
    wide,
    rootHeight,
    hasHeading: Boolean(props.heading),
    actionsAbsent: props.actions === null,
    room,
  })
  const actions = !props.actions ? null : (
    <View style={crowded ? styles.panelActionsDivided : null}>
      <View style={[styles.panelActions,short?styles.panelActionsShort:null]} onLayout={(e) => measure('actions', e.nativeEvent.layout.height)}>
        {props.actions}
      </View>
    </View>
  )
  const heading = !props.heading ? null : (
    <View style={[styles.panelHeading,short?styles.panelHeadingShort:null]} onLayout={e=>measure('heading',e.nativeEvent.layout.height)}>{props.heading}</View>
  )
  return (
    <View testID="anatomy-panel" style={wide ? styles.panelWide : [styles.panel, { height }]}>
      {tiny ? null : heading}
      <ScrollView testID="anatomy-panel-scroll" nestedScrollEnabled style={styles.scroll} contentContainerStyle={[styles.content,props.snug?styles.contentSnug:null,short?styles.contentShort:null]} onContentSizeChange={(_w, h) => measure('content', h)}>
        {tiny ? heading : null}
        {props.children}
        {tiny ? actions : null}
      </ScrollView>
      {tiny ? null : actions}
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
  leftCluster: { position: 'absolute', top: 12, left: 12, flexDirection: 'column', alignItems: 'flex-start', gap: 12 },
  bottomCluster: { position: 'absolute', bottom: 12, left: 12, flexDirection: 'column', alignItems: 'flex-start', gap: 12 },
  canvasPrimary: { backgroundColor: color.bone },
  canvasAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 48,
    minWidth: 48,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    // iconButton と同じ raised/90。図の上に浮くので少し透かして下の絵を見せる
    backgroundColor: 'rgba(30,33,38,0.9)',
    borderWidth: 1,
    borderColor: color.lineStrong,
    boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
  },
  stepBackText: { fontFamily: fontSans, fontSize: 13, lineHeight: 16, color: color.fg, flexShrink: 1 },
  iconButton: {
    width: 48,
    height: 48,
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
    width: 320,
    alignSelf: 'stretch',
    overflow: 'hidden',
    backgroundColor: color.surface,
    borderLeftWidth: 1,
    borderLeftColor: color.line,
  },
  panelActions: {flexShrink:0,flexDirection:'row',flexWrap:'wrap',gap:6,paddingHorizontal:12,paddingBottom:8},
  panelActionCompact: {flexBasis:'45%',flexGrow:1,flexShrink:1,minWidth:0},
  panelActionFull: {flexBasis:'100%',flexGrow:1,flexShrink:1,minWidth:0},
  panelActionText: {lineHeight:20},
  backWithSide: {flexBasis:0,flexGrow:1,flexShrink:1,minWidth:0},
  sideToggle: {width:48,minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:radius.pill,backgroundColor:color.raised,borderWidth:1,borderColor:color.lineStrong},
  stepBack: {minHeight:48,minWidth:48,flexDirection:'row',alignItems:'center',gap:6,borderWidth:1,borderColor:color.lineStrong},
  shortCanvas: {flex:0,flexShrink:0,height:320,minHeight:320},
  flowContent: {flexGrow:1},
  panelActionsShort: {paddingBottom:4},
  panelHeading: {paddingHorizontal:16,paddingTop:8},
  panelHeadingShort: {paddingTop:4},
  contentShort: {paddingVertical:4,gap:4},
  // 縦長で層・向き・深さの3行を出す時は、上下の余白を詰めて200pxの欄に収める（チップの押す高さ44pxは変えん）
  contentSnug: {paddingVertical:4},
  // 説明欄が途中で切れてスクロールになる時、ボタン列と重なって見えんよう境目を引く
  panelActionsDivided: {borderTopWidth:1,borderTopColor:color.line,paddingTop:8},
  primary: {backgroundColor:color.bone},
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  row: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8},
  selectedName: {fontFamily:fontSans,fontSize:18,lineHeight:26,color:color.fg},
  conditionChips: { gap: 4 },
  // デザイン（.srow）: ラベルをチップ行の左に同じ行で置く。ラベルは下限28pxで中身に合わせて伸び（文字拡大・英語でも割れない）、チップ行は残りの幅で折り返す
  chipGroupRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // 横長（1440）のデザインは見出しがチップの上。縦積みに戻す
  chipGroupRowStacked: { flexDirection: 'column', alignItems: 'stretch', gap: 4 },
  chipGroupChips: { flex: 1, minWidth: 0 },
  // 縦積み（column）の時は残り幅を取る flex:1 を外す。高さが決まらん親の中で flexBasis 0 にしない
  chipGroupChipsStacked: { flexGrow: 0, flexShrink: 1, flexBasis: 'auto' },
  chipGroupLabel: { fontFamily: fontSans, fontSize: 12, lineHeight: 16, color: color.muted, minWidth: 28, flexShrink: 0 },
  belowChips: { gap: 8, borderTopWidth: 1, borderTopColor: color.line, paddingTop: 12, marginTop: 6 },
  hint: { fontFamily: fontSans, fontSize: 14, lineHeight: 20, color: color.muted },
  note: { fontFamily: fontSans, fontSize: 12, lineHeight: 16, color: color.faint },
  reselect: {
    minHeight:44, justifyContent:'center',
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    backgroundColor: color.raised,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reselectText: { fontFamily: fontSans, fontSize: 12, lineHeight: 16, color: color.muted },
  // 解除は選択中の主な出口。他の操作ボタンより一段強く見せる
  deselect: {flexDirection:'row',alignItems:'center',gap:6,borderWidth:1,borderColor:color.lineStrong},
  deselectText: { fontFamily: fontSans, fontSize: 13, lineHeight: 20, color: color.fg, flexShrink:1 },
})
