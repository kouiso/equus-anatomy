import Constants from 'expo-constants'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { areaOfStructure } from '../core/area-map'
import { GEOMETRY, STRUCTURE_BY_ID } from '../core/data'
import { areaLabel, structureName } from '../core/i18n'
import { fallbackDepth, hasLayerPlate, hasPlate } from '../core/plate-availability'
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
import { useLocale, useT } from '../ui/locale-store'
import { PartSheet } from '../ui/part-sheet'
import { usePersistenceRetryOnFocus } from '../ui/persistence-banner'
import { useStableTopInset } from '../ui/safe-area'
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
  const locale = useLocale()
  const t = useT()
  const router = useRouter()
  // edge-to-edge ではヘッダがステータスバーに重なる。リロード直後の 0 返しにも退避が効く (#62)
  const topInset = useStableTopInset()
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
  // 図が無い条件を選んだまま適用すると空のキャンバスへ戻るだけ（Issue #64）。
  // 「図で見る」が depth=deep を持ち込む等で現在値が無効でも、表示と適用は
  // 実際に出せる深さへ寄せる。寄せ先も無いときは applicable=false で適用を止める。
  const effectiveDepth = layer === 'muscle' ? fallbackDepth(geometry, depth) : depth
  const applicable = hasPlate(geometry, layer, effectiveDepth)
  const area = geometry.areas.find((candidate) => candidate.id === (params.area ?? current.areaId))
  const parts = [...STRUCTURE_BY_ID.values()].filter(
    (candidate) =>
      candidate.layer === layer &&
      (candidate.depth ?? depth) === depth &&
      candidate.views.includes(view) &&
      (!area || areaOfStructure(candidate) === area.id),
  )
  const title = t(params.kind === 'conditions' ? 'anatomy.conditions' : params.kind === 'parts' ? 'anatomy.areasAndParts' : 'overlay.titleDetail')

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(12, topInset) }]}>
        <Text accessibilityRole="header" style={styles.title}>
          {mounted ? (validKind ? title : t('overlay.cannotShow')) : ''}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={close} style={styles.button}>
          <Text style={styles.text}>{t('common.close')}</Text>
        </Pressable>
      </View>

      {mounted ? (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {!validKind ? <Text style={styles.text}>{t('overlay.invalidKind')}</Text> : null}

        {params.kind === 'conditions' ? (
          <>
            <Text style={styles.text}>{t('overlay.view')}</Text>
            <ChipRow
              ariaLabel={t('overlay.view')}
              items={VIEWS.map((candidate) => ({
                ...candidate,
                label: t(`view.${candidate.id}`),
                disabled: !hasLayerPlate(GEOMETRY[candidate.id], layer),
              }))}
              value={view}
              onChange={setView}
            />
            <Text style={styles.text}>{t('overlay.layer')}</Text>
            <ChipRow
              ariaLabel={t('overlay.layer')}
              items={LAYERS.map((candidate) => ({
                ...candidate,
                label: t(`layer.${candidate.id}`),
                disabled: !hasLayerPlate(geometry, candidate.id),
              }))}
              value={layer}
              onChange={setLayer}
            />
            {layer === 'muscle' ? (
              <>
                <Text style={styles.text}>{t('overlay.depth')}</Text>
                <ChipRow
                  ariaLabel={t('overlay.depth')}
                  items={DEPTHS.map((candidate) => ({
                    ...candidate,
                    label: t(`depth.${candidate.id}`),
                    disabled: !hasPlate(geometry, 'muscle', candidate.id),
                  }))}
                  value={effectiveDepth}
                  onChange={setDepth}
                />
                <Text style={styles.note}>{t('overlay.depthNote')}</Text>
              </>
            ) : null}
            {!applicable ? (
              <Text style={styles.note}>{t('overlay.noPlate')}</Text>
            ) : null}
          </>
        ) : null}

        {params.kind === 'parts' ? (
          <>
            {!area ? (
              <>
                <Text style={styles.title}>{t('overlay.areas')}</Text>
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
                    <Text style={styles.text}>{areaLabel(candidate, t)}</Text>
                  </Pressable>
                ))}
              </>
            ) : null}
            <Text style={styles.title}>{t('overlay.partsOf', { area: area ? areaLabel(area, t) : t('overlay.thisPlate') })}</Text>
            <Text style={styles.note}>{t('overlay.partsNote')}</Text>
            {parts.length === 0 ? <Text style={styles.text}>{t('overlay.noParts')}</Text> : null}
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
                  {structureName(candidate, locale)}
                  {geometry.parts.some((part) => part.id === candidate.id) ? '' : t('overlay.unplacedSuffix')}
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
            <Text style={styles.text}>{t('overlay.partNotFound')}</Text>
          )
        ) : null}
        <Text style={styles.note}>{t('overlay.version', { version: Constants.expoConfig?.version ?? '—' })}</Text>
      </ScrollView>
      ) : null}

      {mounted && params.kind === 'conditions' ? (
        <Pressable
          accessibilityRole="button"
          disabled={!applicable}
          style={[styles.apply, applicable ? null : styles.applyDisabled]}
          onPress={() => {
            changeConditions(view, layer, effectiveDepth)
            close()
          }}
        >
          <Text style={styles.text}>{t('overlay.apply')}</Text>
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
  applyDisabled: { opacity: 0.4 },
})
