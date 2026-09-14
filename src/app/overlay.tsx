import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { areaOfStructure } from '../core/area-map'
import { GEOMETRY, STRUCTURE_BY_ID } from '../core/data'
import { plateIdOf } from '../core/types'
import {
  changeConditions,
  DEPTHS,
  LAYERS,
  pickAnatomyArea,
  updateAnatomy,
  useAnatomy,
  VIEWS,
} from '../ui/anatomy-state'
import { ChipRow } from '../ui/chip-row'
import { PartSheet } from '../ui/part-sheet'
import { usePersistenceRetryOnFocus } from '../ui/persistence-banner'
import { color, fontSans } from '../ui/theme'

export default function Overlay() {
  usePersistenceRetryOnFocus()
  const params = useLocalSearchParams<{
    kind?: string
    id?: string
    view?: string
    layer?: string
    depth?: string
    area?: string
  }>()
  const current = useAnatomy()
  const router = useRouter()
  const [view, setView] = useState(VIEWS.find((candidate) => candidate.id === params.view)?.id ?? current.view)
  const [layer, setLayer] = useState(LAYERS.find((candidate) => candidate.id === params.layer)?.id ?? current.layer)
  const [depth, setDepth] = useState(DEPTHS.find((candidate) => candidate.id === params.depth)?.id ?? current.depth)

  // 静的書き出しではクエリパラメタが無いので、本文はマウント後にだけ描く。
  // こうせんと SSR 済み HTML と初回レンダーが食い違って hydration error (React #418) になる。
  const [mounted, setMounted] = useState(Platform.OS !== 'web')
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'))
  const validKind = ['conditions', 'parts', 'detail'].includes(params.kind ?? '')
  const structure = typeof params.id === 'string' ? STRUCTURE_BY_ID.get(params.id) : undefined
  const geometry = GEOMETRY[view]
  const area = geometry.areas.find((candidate) => candidate.id === (params.area ?? current.areaId))
  const parts = [...STRUCTURE_BY_ID.values()].filter(
    (candidate) =>
      candidate.layer === layer &&
      (candidate.depth ?? depth) === depth &&
      candidate.views.includes(view) &&
      (!area || areaOfStructure(candidate) === area.id),
  )
  const title = params.kind === 'conditions' ? '表示条件' : params.kind === 'parts' ? '場所・部位一覧' : '部位の解説'

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          {mounted ? (validKind ? title : '表示できません') : ''}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="閉じる" onPress={close} style={styles.button}>
          <Text style={styles.text}>閉じる</Text>
        </Pressable>
      </View>

      {mounted ? (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {!validKind ? <Text style={styles.text}>表示先が見つかりません。閉じて解剖図へ戻れます。</Text> : null}

        {params.kind === 'conditions' ? (
          <>
            <Text style={styles.text}>向き</Text>
            <ChipRow ariaLabel="向き" items={VIEWS} value={view} onChange={setView} />
            <Text style={styles.text}>層</Text>
            <ChipRow ariaLabel="層" items={LAYERS} value={layer} onChange={setLayer} />
            {layer === 'muscle' ? (
              <>
                <Text style={styles.text}>深さ</Text>
                <ChipRow
                  ariaLabel="深さ"
                  items={DEPTHS.map((candidate) => ({
                    ...candidate,
                    disabled: !geometry.images[plateIdOf('muscle', candidate.id)],
                  }))}
                  value={depth}
                  onChange={setDepth}
                />
                <Text style={styles.note}>図が未登録の深さは選択できません。</Text>
              </>
            ) : null}
            {!geometry.images[plateIdOf(layer, depth)] ? (
              <Text style={styles.note}>この条件の図はまだ登録されていません。</Text>
            ) : null}
          </>
        ) : null}

        {params.kind === 'parts' ? (
          <>
            {!area ? (
              <>
                <Text style={styles.title}>大まかな場所</Text>
                {geometry.areas.map((candidate) => (
                  <Pressable
                    key={candidate.id}
                    accessibilityRole="button"
                    style={styles.button}
                    onPress={() => {
                      changeConditions(view, layer, depth)
                      pickAnatomyArea(candidate)
                      close()
                    }}
                  >
                    <Text style={styles.text}>{candidate.nameJa}</Text>
                  </Pressable>
                ))}
              </>
            ) : null}
            <Text style={styles.title}>{area?.nameJa ?? 'この図'}の部位</Text>
            <Text style={styles.note}>
              ラベルが省略された部位もここから選べます。位置が未登録の部位は図上に点を表示できません。
            </Text>
            {parts.length === 0 ? <Text style={styles.text}>この条件に該当する部位はありません。</Text> : null}
            {parts.map((candidate) => (
              <Pressable
                key={candidate.id}
                accessibilityRole="button"
                style={styles.button}
                onPress={() => {
                  updateAnatomy({
                    view,
                    layer,
                    depth,
                    areaId: areaOfStructure(candidate),
                    selectedPartId: candidate.id,
                    ...(view !== current.view ? { zoom: null } : {}),
                  })
                  close()
                }}
              >
                <Text style={styles.text}>
                  {candidate.nameJa}
                  {geometry.parts.some((part) => part.id === candidate.id) ? '' : ' — 位置未登録'}
                </Text>
              </Pressable>
            ))}
          </>
        ) : null}

        {params.kind === 'detail' ? (
          structure ? (
            <PartSheet
              hideClose
              structure={structure}
              onClose={close}
              onCatalog={() =>
                router.dismissTo({ pathname: '/catalog/[id]', params: { id: structure.id, from: 'anatomy' } })
              }
            />
          ) : (
            <Text style={styles.text}>この部位は見つかりません。</Text>
          )
        ) : null}
      </ScrollView>
      ) : null}

      {mounted && params.kind === 'conditions' ? (
        <Pressable
          accessibilityRole="button"
          style={styles.apply}
          onPress={() => {
            changeConditions(view, layer, depth)
            close()
          }}
        >
          <Text style={styles.text}>この条件で表示</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: color.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    gap: 12,
  },
  title: { fontFamily: fontSans, fontSize: 20, color: color.fg, flexShrink: 1 },
  text: { fontFamily: fontSans, fontSize: 15, color: color.fg },
  note: { fontFamily: fontSans, fontSize: 13, color: color.muted, lineHeight: 21 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12 },
  button: {
    minHeight: 44,
    padding: 12,
    justifyContent: 'center',
    backgroundColor: color.raised,
    borderRadius: 12,
  },
  apply: { minHeight: 52, padding: 16, alignItems: 'center', backgroundColor: color.raised },
})
