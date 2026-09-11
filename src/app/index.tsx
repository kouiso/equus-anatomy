import { useCallback, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { GEOMETRY, STRUCTURE_BY_ID } from '../core/data'
import type { Part, ViewBox } from '../core/types'
import { fit, zoomByStep } from '../core/zoom'
import { AnatomyCanvas } from '../ui/anatomy-canvas'

/** スパイク: 左側望・表層筋の1画面だけ。 */
const GEO = GEOMETRY.left
const ZOOM_STEP = 1.5

export default function Index() {
  const [viewBox, setViewBox] = useState<ViewBox>(() => fit(GEO.size))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const onViewBox = useCallback((update: (prev: ViewBox) => ViewBox) => setViewBox(update), [])
  const onPickPart = useCallback((p: Part) => setSelectedId(p.id), [])
  const onPickNothing = useCallback(() => setSelectedId(null), [])
  const labelOf = useCallback((p: Part) => STRUCTURE_BY_ID.get(p.id)?.nameJa ?? p.id, [])
  const selectedName = selectedId === null ? '—' : (STRUCTURE_BY_ID.get(selectedId)?.nameJa ?? selectedId)

  return (
    <View style={styles.root}>
      <View style={styles.bar}>
        <Text testID="selected-name" style={styles.name}>
          {selectedName}
        </Text>
        <Pressable
          testID="zoom-out"
          accessibilityRole="button"
          accessibilityLabel="縮小"
          style={styles.btn}
          onPress={() => setViewBox((vb) => zoomByStep(vb, 1 / ZOOM_STEP, GEO.size))}
        >
          <Text style={styles.btnText}>−</Text>
        </Pressable>
        <Pressable
          testID="zoom-in"
          accessibilityRole="button"
          accessibilityLabel="拡大"
          style={styles.btn}
          onPress={() => setViewBox((vb) => zoomByStep(vb, ZOOM_STEP, GEO.size))}
        >
          <Text style={styles.btnText}>+</Text>
        </Pressable>
      </View>
      <AnatomyCanvas
        geometry={GEO}
        image={GEO.images['muscle-superficial']}
        layer="muscle"
        depth="superficial"
        viewBox={viewBox}
        onViewBox={onViewBox}
        selectedPartId={selectedId}
        labelOf={labelOf}
        onPickPart={onPickPart}
        onPickNothing={onPickNothing}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0c0e' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  name: { flex: 1, color: '#ece7dd', fontSize: 16 },
  btn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1c20', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#ece7dd', fontSize: 20 },
})
