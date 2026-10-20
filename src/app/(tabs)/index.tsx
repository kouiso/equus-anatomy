import { usePersistenceRetryOnFocus } from '../../ui/persistence-banner'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { areaOfStructure } from '../../core/area-map'
import { bottomOverlayMaxWidth, canvasOverlayRects, selectorMaxWidth } from '../../core/canvas-overlay'
import { GEOMETRY, STRUCTURE_BY_ID } from '../../core/data'
import { structureName, structureText } from '../../core/i18n'
import { plateIdOf, type Part } from '../../core/types'
import { fit, zoomByStep } from '../../core/zoom'
import { AnatomyCanvas } from '../../ui/anatomy-canvas'
import { ariaLevel } from '../../ui/aria'
import { useAnatomy, emptyTapBack, focusAnatomyPart, updateAnatomy, resetAnatomy, pickAnatomyArea, pickAnatomyPartByTap, setAnatomyViewBox, stepBackAnatomy } from '../../ui/anatomy-state'
import { nextBackStep } from '../../core/back-step'
import { useAnatomyBackHandler } from '../../ui/anatomy-back-handler'
import { BackIcon, CloseIcon, MinusIcon, PlusIcon, ResetIcon } from '../../ui/icons'
import { useLocale, useT } from '../../ui/locale-store'
import { breakpointLg, color, fontSans, radius } from '../../ui/theme'

let lastLayout = { width: 0, height: 0 }
const PANEL_SCROLL_MIN = 72

export default function AnatomyScreen() {
 usePersistenceRetryOnFocus()
  useAnatomyBackHandler()
  const {view,layer,depth,selectedPartId,areaId,zoom} = useAnatomy()
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
  const setSelectedPartId=(id:string|null)=>updateAnatomy({selectedPartId:id})
  const open=(kind:'conditions'|'parts'|'detail')=>{
    if(opening.current)return
    opening.current=true
    router.push({pathname:'/overlay',params:{kind,view,layer,depth,area:areaId??'',id:selectedPartId??'',source:'anatomy'}})
  }
  const plate = plateIdOf(layer, depth)
  const image = geometry.images[plate]
  const mode: 'area' | 'part' = areaId === null && geometry.areas.length > 0 ? 'area' : 'part'
  // 場所を選んだら、その場所に属する部位だけ出す。関係ない部位まで出たら選んだ意味がない。
  // 側性のある臓器（脾臓は左だけ等）は views で向きを限定する。図形だけでなく一覧・計数も同じ集合で見る
  const visiblePartIds = new Set(
    [...STRUCTURE_BY_ID.values()]
      .filter((s) => s.views.includes(view) && (areaId === null || areaOfStructure(s) === areaId))
      .map((s) => s.id),
  )
  const selected = selectedPartId ? (STRUCTURE_BY_ID.get(selectedPartId) ?? null) : null

  const inArea = (id: string) => visiblePartIds.has(id)
  const placed = geometry.parts.filter((p) => p.layer === layer && (p.depth ?? depth) === depth && inArea(p.id)).length
  const expected = [...STRUCTURE_BY_ID.values()].filter(
    (s) => s.layer === layer && (s.depth ?? depth) === depth && s.views.includes(view) && inArea(s.id),
  ).length

  const notes = [
    view === 'right' ? t('anatomy.mirroredNote') : null,
    image === undefined ? t('anatomy.noPlate') : null,
  ].filter((n): n is string => n !== null)
  const notesSeparator = locale === 'en' ? ' ' : ''
  // 解除の手段は「× ボタン」の他に見えるものが無い。空白タップ(と Android の端末 BACK)を
  // 初見で知る術が無いので、選択中は一文で添える
  const deselectHint = Platform.OS === 'android' ? t('anatomy.deselectHintAndroid') : t('anatomy.deselectHint')
  // 文字拡大でパネルが窮屈（crowded）かは中身の計測結果で決まるので、パネルから報告してもらう
  const [panelCrowded, setPanelCrowded] = useState(false)
  const [canvasHeight, setCanvasHeight] = useState(0)
  const deselectBtn = selected ? (
    <Pressable accessibilityRole="button" testID="close-sheet" accessibilityLabel={t('anatomy.deselect')} onPress={()=>setSelectedPartId(null)} style={[styles.reselect,styles.deselect]}>
      <CloseIcon color={color.fg} size={14} /><Text style={styles.deselectText}>{t('anatomy.deselect')}</Text>
    </Pressable>
  ) : null
  // 「1つ戻る」チップ。出す段の判定は nextBackStep が唯一の情報源で、
  // 読み上げにはどの段へ戻るかを添える(端末 BACK・空白タップと同じ梯子)
  const backStep = nextBackStep({selectedPartId, areaId, zoom})
  // 右上のズーム列と12px離す。文字拡大時の省略表示でも読み上げには全文を残す。
  const canvasWidth = size.width - (wide ? 320 : 0)
  const selectorMaxW = selectorMaxWidth(canvasWidth)
  // 横向きの低い画面では図の高さが戻る操作の下端（120）に届かないので、部位一覧と同じ段に並べる。
  const shortCanvas = canvasHeight > 0 && canvasHeight < 132
  const selectorLabel = mode === 'area' ? t('anatomy.areasAndParts') : t('anatomy.partsList')
  // 表示条件・詳しく読むは図の左下に重ねる(Issue #178)。上段(部位一覧・戻る)と縦に重なる低い画面では、
  // 従来どおり下のボタン列へ戻す。縦並びなので高さは決まる(48px × 個数 + 隙間)
  const overlayCount = selected ? 2 : 1
  const overlayHeight = overlayCount * 48 + (overlayCount - 1) * 12
  const topUsed = backStep && !shortCanvas ? 120 : 60
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

  return (
    <View onLayout={e=>{
      const {width,height}=e.nativeEvent.layout
      if(width>0 && height>0) { lastLayout={width,height}; setSize(lastLayout) }
    }} style={[styles.root, wide ? styles.rootWide : null]}>
      <View style={styles.canvasWrap} onLayout={e=>setCanvasHeight(e.nativeEvent.layout.height)}>
        <AnatomyCanvas
          reservedRects={size.width ? canvasOverlayRects({
            canvasWidth,
            showBack: Boolean(backStep),
            shortCanvas,
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
          onPickPart={(p) => pickAnatomyPartByTap(p.id)}
          onPickNothing={emptyTapBack}
        />
        <View style={[styles.leftCluster, shortCanvas ? styles.leftClusterRow : null, {maxWidth: selectorMaxW}]}>
        <Pressable accessibilityRole="button" testID="part-selector" accessibilityLabel={selectorLabel} onPress={()=>open('parts')} style={[styles.canvasAction, shortCanvas ? {flexShrink: 1} : {maxWidth: selectorMaxW}]}>
          <Text numberOfLines={1} style={styles.stepBackText}>{selectorLabel}</Text>
        </Pressable>
        {/* 部位一覧の下に固定して、戻る段が変わっても操作が重ならないようにする。 */}
        {backStep ? (
          <Pressable accessibilityRole="button" testID="step-back" accessibilityLabel={backLabel} onPress={stepBackAnatomy} style={[styles.canvasAction, shortCanvas ? {flexShrink: 1} : {maxWidth: selectorMaxW}]}>
            <BackIcon color={color.fg} size={14} /><Text numberOfLines={1} style={styles.stepBackText}>{t('anatomy.back')}</Text>
          </Pressable>
        ) : null}
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

      <AnatomyPanel wide={wide} rootHeight={size.height} onCrowded={setPanelCrowded} actions={overlayFits ? null : <>
          {/* スクロール欄の末尾に置くと、文字拡大でボタン列の下へ押し出されて押せんようになる */}
          {/* パネルが詰まる時だけ解除をボタン列へ。名前行に置くとスクロール境界で半分隠れて隣のボタンと重なる */}
          {selected&&panelCrowded?deselectBtn:null}
          {readMoreBtn([styles.reselect,styles.primary],[styles.reselectText,{color:color.accentFg}])}
          {conditionsBtn(styles.reselect,styles.reselectText)}
        </>}>
          {selected ? <View style={styles.row}>
            <Text accessibilityRole="header" {...ariaLevel(2)} style={[styles.selectedName,{flex:1}]}>{structureName(selected, locale)}</Text>
            {panelCrowded?null:deselectBtn}
          </View> : <Text style={styles.hint}>{mode==='area'?t('anatomy.hintArea'):t('anatomy.hintPart')}</Text>}
          {selected?<Text testID="deselect-hint" style={styles.note}>{deselectHint}</Text>:null}
          {selected && (wide || size.height>=600)?<Text style={styles.hint} numberOfLines={2}>{(structureText(selected, locale).summary !== selected.summary ? t('detail.draftTag') : '') + structureText(selected, locale).summary}</Text>:null}
          {selected&&!geometry.parts.some(p=>p.id===selected.id&&inArea(p.id))?<Text style={styles.note}>{t('anatomy.unplacedSelected')}</Text>:null}
          <Text style={styles.note}>{t(`view.${view}`)} · {t(`layer.${layer}`)}{layer==='muscle'?` · ${t(`depth.${depth}`)}`:''}</Text>
          {notes.length?<Text style={styles.note}>{notes.join(notesSeparator)}</Text>:null}
          {expected>placed?<Text style={styles.note} testID="placement-status">{t('anatomy.unplacedCount', { count: expected - placed })}</Text>:null}
      </AnatomyPanel>
    </View>
  )
}

type PanelRoom = { actions: number; content: number }

/**
 * 計測した高さはこの部品の中だけで持つ。画面全体の state にすると、文字の再計測や
 * 選択で説明欄が変わるたびに図（AnatomyCanvas）とジェスチャまで作り直すことになる。
 */
function AnatomyPanel(props: { wide: boolean; rootHeight: number; actions: React.ReactNode | null; children: React.ReactNode; onCrowded?: (crowded: boolean) => void }) {
  const { wide, rootHeight, onCrowded } = props
  const [room, setRoom] = useState<PanelRoom>({ actions: 0, content: 0 })
  const measure = (key: keyof PanelRoom, value: number) =>
    setRoom((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }))
  // 通常の文字サイズでは従来の固定高のまま（選択のたびに図の大きさが変わらんように）。
  // 文字拡大でボタン列が折り返して説明欄が潰れる時だけ、中身に合わせて伸ばす。図が潰れきらんよう上限は画面の6割。
  // 計るのは内側のボタン列だけ。境目の線と余白は外側に付けるので、計測→判定→計測の循環にならん
  const baseHeight = Math.min(200, rootHeight * 0.35)
  const crowded = !wide && rootHeight > 0 && props.actions !== null && room.actions > 0 && room.actions + PANEL_SCROLL_MIN > baseHeight
  // crowded の切替で解除ボタンの置き場が変わるので親に知らせる（ボタンがスクロール境界で半分隠れんように）
  useEffect(() => { onCrowded?.(crowded) }, [crowded, onCrowded])
  const height = crowded ? Math.min(Math.max(baseHeight, room.actions + room.content), rootHeight * 0.6) : baseHeight
  return (
    <View testID="anatomy-panel" style={wide ? styles.panelWide : [styles.panel, { height }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} onContentSizeChange={(_w, h) => measure('content', h)}>
        {props.children}
      </ScrollView>
      {props.actions ? (
        <View style={crowded ? styles.panelActionsDivided : null}>
          <View style={styles.panelActions} onLayout={(e) => measure('actions', e.nativeEvent.layout.height)}>
            {props.actions}
          </View>
        </View>
      ) : null}
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
  leftClusterRow: { flexDirection: 'row', alignItems: 'center' },
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
  // 説明欄が途中で切れてスクロールになる時、ボタン列と重なって見えんよう境目を引く
  panelActionsDivided: {borderTopWidth:1,borderTopColor:color.line,paddingTop:8},
  primary: {backgroundColor:color.bone},
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  row: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8},
  selectedName: {fontFamily:fontSans,fontSize:18,color:color.fg},
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
  deselectText: { fontFamily: fontSans, fontSize: 13, lineHeight: 16, color: color.fg },
})
