import { usePersistenceRetryOnFocus } from '../../ui/persistence-banner'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { areaOfStructure } from '../../core/area-map'
import { GEOMETRY, STRUCTURE_BY_ID } from '../../core/data'
import { plateIdOf, type Part } from '../../core/types'
import { fit, zoomByStep } from '../../core/zoom'
import { AnatomyCanvas } from '../../ui/anatomy-canvas'
import { ariaLevel } from '../../ui/aria'
import { useAnatomy, VIEWS, LAYERS, DEPTHS, focusAnatomyPart, updateAnatomy, resetAnatomy, pickAnatomyArea, setAnatomyViewBox } from '../../ui/anatomy-state'
import { MinusIcon, PlusIcon, ResetIcon } from '../../ui/icons'
import { breakpointLg, color, fontSans, radius } from '../../ui/theme'

let lastLayout = { width: 0, height: 0 }

export default function AnatomyScreen() {
 usePersistenceRetryOnFocus()
  const {view,layer,depth,selectedPartId,areaId,zoom} = useAnatomy()
  const params = useLocalSearchParams<{part?:string}>()
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
    view === 'right' ? '左側望の図を左右反転して表示しています。' : null,
    image === undefined ? 'この層の図はまだありません。' : null,
  ].filter((n): n is string => n !== null)

  return (
    <View onLayout={e=>{
      const {width,height}=e.nativeEvent.layout
      if(width>0 && height>0) { lastLayout={width,height}; setSize(lastLayout) }
    }} style={[styles.root, wide ? styles.rootWide : null]}>
      <View style={styles.canvasWrap}>
        <AnatomyCanvas
          reservedRects={size.width ? [{x:size.width-(wide?320:0)-156,y:12,w:144,h:44}] : []}
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
            onPress={() => setViewBox((vb) => zoomByStep(vb, 1.6, geometry.size))}
          >
            <PlusIcon color={color.fg} size={16} />
          </IconButton>
          <IconButton
            testID="zoom-out"
            label="縮小"
            onPress={() => setViewBox((vb) => zoomByStep(vb, 1 / 1.6, geometry.size))}
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
        style={wide ? styles.panelWide : [styles.panel, { height: Math.min(200, size.height * 0.35) }]}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {selected ? <View style={styles.row}>
            <Text accessibilityRole="header" {...ariaLevel(2)} style={[styles.selectedName,{flex:1}]}>{selected.nameJa}</Text>
            <Pressable accessibilityRole="button" testID="close-sheet" accessibilityLabel="閉じる" onPress={()=>setSelectedPartId(null)} style={styles.reselect}><Text style={styles.reselectText}>選択を解除</Text></Pressable>
          </View> : <Text style={styles.hint}>{mode==='area'?'大まかな場所を選んでください':'点・ラベル・部位一覧から選べます'}</Text>}
          {selected && (wide || size.height>=600)?<Text style={styles.hint} numberOfLines={2}>{selected.summary}</Text>:null}
          {selected&&!geometry.parts.some(p=>p.id===selected.id&&inArea(p.id))?<Text style={styles.note}>この部位は現在の図では位置が未登録です。</Text>:null}
          <Text style={styles.note}>{VIEWS.find(v=>v.id===view)?.label} · {LAYERS.find(l=>l.id===layer)?.label}{layer==='muscle'?` · ${DEPTHS.find(d=>d.id===depth)?.label}`:''}</Text>
          {notes.length?<Text style={styles.note}>{notes.join('')}</Text>:null}
          {expected>placed?<Text style={styles.note} testID="placement-status">未配置 {expected-placed} 件 — 部位一覧で名前と解説を確認できます。</Text>:null}
          {areaId&&!selected?<Pressable accessibilityRole="button" testID="reselect-area" accessibilityLabel="大まかな場所を選び直す" onPress={reset} style={styles.reselect}><Text style={styles.reselectText}>場所を選び直す</Text></Pressable>:null}
        </ScrollView>
        <View style={styles.panelActions}>
          {selected?<Pressable accessibilityRole="button" onPress={()=>open('detail')} style={[styles.reselect,styles.primary]}><Text style={[styles.reselectText,{color:color.accentFg}]}>詳しく読む</Text></Pressable>:null}
          <Pressable accessibilityRole="button" onPress={()=>open('parts')} style={styles.reselect}><Text style={styles.reselectText}>{mode==='area'?'場所・部位一覧':'部位一覧'}</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={()=>open('conditions')} style={styles.reselect}><Text style={styles.reselectText}>表示条件</Text></Pressable>
        </View>
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
    width: 44,
    height: 44,
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
  panelActions: {flexDirection:'row',flexWrap:'wrap',gap:6,paddingHorizontal:12,paddingBottom:8},
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
})
