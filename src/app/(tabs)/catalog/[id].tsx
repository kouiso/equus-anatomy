import { Link, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useRef } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { STRUCTURE_BY_ID, STRUCTURES } from '../../../core/data'
import { canOpenOnMap } from '../../../core/map-entry'
import { detailBlocks, regionLabel, structureAltName, structureName, structureText } from '../../../core/i18n'
import { ariaLevel, ariaPressed } from '../../../ui/aria'
import { parseDetailSource, type DetailSource } from '../../../ui/detail-source'
import { LocationMap } from '../../../ui/location-map'
import { useLocale, useT } from '../../../ui/locale-store'
import { useMastery } from '../../../ui/mastery-store'
import { NameSpeech } from '../../../ui/name-speech'
import { usePersistenceRetryOnFocus } from '../../../ui/persistence-banner'
import { useSaved } from '../../../ui/saved-store'
import { PartSupervisionNote } from '../../../ui/supervision-status'
import { color, fontDisplayItalic, fontSans, fontSansMedium, radius } from '../../../ui/theme'

/** 静的書き出し（expo export）は動的ルートの一覧を先に知る必要がある。52 部位ぶんの HTML を吐かせる。 */
export function generateStaticParams(): { id: string }[] {
  return STRUCTURES.map((s) => ({ id: s.id }))
}

export default function CatalogDetail() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string | string[] }>()
  const router = useRouter()
  const navigating = useRef(false)
  useFocusEffect(useCallback(() => { navigating.current = false }, []))
  const s = typeof id === 'string' ? STRUCTURE_BY_ID.get(id) : undefined
  const source = parseDetailSource(from)
  const { has, toggle, persistence } = useSaved()
  const { learned, mark } = useMastery()
  const locale = useLocale()
  const t = useT()
  const text = s === undefined ? undefined : structureText(s, locale)
  usePersistenceRetryOnFocus()
  // 本文の幅を 640〜720px に止めて右に小図を置けるだけの幅から横並びにする
  const wide = useWindowDimensions().width >= WIDE_MIN_WIDTH

  const goBack = () => {
    if (navigating.current) return
    navigating.current = true
    if (source === 'catalog') {
      if (router.canGoBack()) router.back()
      else router.replace('/catalog')
      return
    }
    const target: Record<Exclude<DetailSource, 'catalog'>, '/' | '/saved'> = {
      anatomy: '/',
      saved: '/saved',
    }
    router.navigate(target[source])
  }
  const backLabel: Record<DetailSource, string> = {
    catalog: t('detail.backCatalog'),
    saved: t('detail.backSaved'),
    anatomy: t('detail.backAnatomy'),
  }
  // 小図と「解剖図で位置を見る」は1組。位置未登録の部位には出さん
  const locationBlock =
    s !== undefined && canOpenOnMap(s) ? (
      <View testID="location-block" style={styles.locationBlock}>
        <LocationMap structure={s} height={wide ? MAP_HEIGHT_WIDE : MAP_HEIGHT_NARROW} />
        <Link href={`/?part=${s.id}`} asChild>
          <Pressable
            testID="open-on-map"
            accessibilityRole="link"
            accessibilityLabel={t('detail.openOnMap')}
            style={styles.mapLink}
          >
            <Text style={styles.mapLinkText}>{t('detail.openOnMap')}</Text>
          </Pressable>
        </Link>
      </View>
    ) : null
  const viewsLine =
    s === undefined ? null : (
      <Text testID="detail-views" style={styles.views}>
        {t('detail.views', { views: s.views.map((v) => t(`view.${v}`)).join(' / ') })}
      </Text>
    )

  return (
    // 図鑑タブの Stack の中。ヘッダとタブバーは (tabs)/_layout が出すので、ここは本文だけ
    <View style={styles.root}>
      {s === undefined || text === undefined ? (
        <View style={styles.notFound} testID="catalog-not-found">
          <Text style={styles.body}>{t('detail.notFound')}</Text>
          <Pressable testID="catalog-back" accessibilityRole="button" accessibilityLabel={backLabel[source]} onPress={goBack} style={styles.backPill}>
            <Text style={styles.backPillText}>{backLabel[source]}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          testID="catalog-detail"
          style={styles.scroll}
          contentContainerStyle={styles.content}
        >
          <View style={wide ? styles.wideRow : undefined}>
          <View testID="detail-main" style={wide ? [styles.column, styles.columnWide] : styles.column}>
          <Pressable testID="catalog-back" accessibilityRole="button" accessibilityLabel={backLabel[source]} onPress={goBack} style={styles.back}>
            <Text style={styles.backText}>← {backLabel[source]}</Text>
          </Pressable>
          <View style={styles.header}>
            <View style={styles.titles}>
              {/* 画面の h1 は Shell の 馬体解剖。ここは旧版どおり h2 */}
              <Text accessibilityRole="header" {...ariaLevel(2)} testID="detail-name-ja" style={styles.nameJa}>
                {structureName(s, locale)}
              </Text>
              <Text testID="detail-name-la" style={styles.nameLa}>
                {s.nameLa}
              </Text>
              <Text style={styles.meta}>
                {structureAltName(s, locale)} · {regionLabel(s.region, locale)}
              </Text>
              <NameSpeech structure={s} />
            </View>
          </View>
          {wide ? null : locationBlock}
          <View style={styles.pills}>
              <Pressable
                testID="save-toggle"
                accessibilityRole="button"
                accessibilityState={{ selected: has(s.id) }}
                {...ariaPressed(has(s.id))}
                accessibilityLabel={has(s.id) ? t(persistence.dirty ? 'save.pending' : 'save.saved') : t('save.save')}
                onPress={() => toggle(s.id)}
                style={[styles.pill, has(s.id) ? styles.pillOn : styles.pillOff]}
              >
                <Text style={[styles.pillText, has(s.id) ? styles.pillTextOn : styles.pillTextOff]}>
                  {has(s.id) ? t(persistence.dirty ? 'save.pending' : 'save.saved') : t('save.save')}
                </Text>
              </Pressable>
              <Pressable
                testID="mastery-toggle"
                accessibilityRole="button"
                accessibilityState={{ selected: learned(s.id) }}
                {...ariaPressed(learned(s.id))}
                accessibilityLabel={t(learned(s.id) ? 'mastery.learned' : 'mastery.mark')}
                onPress={() => mark(s.id, !learned(s.id))}
                style={[styles.pill, learned(s.id) ? styles.pillOn : styles.pillOff]}
              >
                <Text style={[styles.pillText, learned(s.id) ? styles.pillTextOn : styles.pillTextOff]}>
                  {t(learned(s.id) ? 'mastery.learned' : 'mastery.mark')}
                </Text>
              </Pressable>
          </View>
          {text.lang !== locale ? <Text testID="detail-ja-only" style={styles.mapPending}>{t('detail.jaOnly')}</Text> : null}
          <Text style={styles.summary}>{text.summary}</Text>
          {detailBlocks(text).map((b) =>
            b.kind === 'function' ? (
              <Text key={b.kind} testID="detail-function" style={styles.body}>
                <Text style={styles.faint}>{t('common.functionLabel')}</Text>
                {b.text}
              </Text>
            ) : (
              <Text key={b.kind} testID={`detail-${b.kind}`} style={b.kind === 'note' ? styles.note : styles.body}>
                {b.text}
              </Text>
            ),
          )}
          <PartSupervisionNote structure={s} />
          {wide ? null : viewsLine}
          {/* 位置未登録へ飛んでも点は出んので、入口は出さず準備中とだけ告げる */}
          {canOpenOnMap(s) ? null : (
            <Text testID="map-pending" style={styles.mapPending}>
              {t('detail.mapPending')}
            </Text>
          )}
          </View>
          {wide ? (
            <View style={styles.aside}>
              {locationBlock}
              {viewsLine}
            </View>
          ) : null}
          </View>
        </ScrollView>
      )}
    </View>
  )
}

/** 本文 640px + 間 32px + 小図 284px + 左右の余白 40px に足りる幅。 */
const WIDE_MIN_WIDTH = 1024
const MAP_HEIGHT_NARROW = 150
const MAP_HEIGHT_WIDE = 210

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  scroll: { flex: 1 },
  // 旧 Web 版の px-5 pb-8 pt-2。ホームバーはタブバー側が避ける
  content: { flexDirection: 'column', gap: 16, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  notFound: { flex: 1, flexDirection: 'column', gap: 12, paddingHorizontal: 20, paddingVertical: 24 },
  backPill: {
    alignSelf: 'flex-start',
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: color.raised,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  backPillText: { fontFamily: fontSans, fontSize: 14, color: color.fg },
  back: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  backText: { fontFamily: fontSans, fontSize: 13, letterSpacing: 0.3, color: color.muted },
  column: { flexDirection: 'column', gap: 16 },
  columnWide: { flex: 1, minWidth: 0, maxWidth: 720 },
  // 1440px: 本文は読みやすい幅（640〜720px）で止め、空いた右に小図を置く
  wideRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 32 },
  aside: { width: 284, flexShrink: 0, flexDirection: 'column', gap: 10, paddingTop: 44 },
  locationBlock: { flexDirection: 'column', gap: 10 },
  header: { flexDirection: 'column', gap: 8 },
  titles: { flexShrink: 1 },
  // 旧 Web 版は font-display 指定やが Cormorant に和文グリフが無く実際は Zen Kaku で出とった。RN では明示的にそちらを使う
  nameJa: { fontFamily: fontSansMedium, fontSize: 24, lineHeight: 30, color: color.fg },
  nameLa: { fontFamily: fontDisplayItalic, fontStyle: 'italic', fontSize: 16, lineHeight: 20, color: color.muted },
  meta: { fontFamily: fontSans, fontSize: 12, letterSpacing: 0.3, color: color.faint },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { minHeight: 44, flexShrink: 0, borderRadius: radius.pill, paddingHorizontal: 16, justifyContent: 'center' },
  pillOn: { backgroundColor: color.bone },
  pillOff: { backgroundColor: color.raised },
  pillText: { fontFamily: fontSans, fontSize: 12, letterSpacing: 0.3 },
  pillTextOn: { color: color.accentFg },
  pillTextOff: { color: color.muted },
  summary: { fontFamily: fontSans, fontSize: 14, lineHeight: 23, color: color.fg },
  body: { fontFamily: fontSans, fontSize: 14, lineHeight: 23, color: color.muted },
  faint: { color: color.faint },
  note: {
    fontFamily: fontSans,
    fontSize: 12,
    lineHeight: 20,
    color: color.muted,
    backgroundColor: color.raised,
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  views: { fontFamily: fontSans, fontSize: 12, color: color.faint },
  mapLink: {
    alignSelf: 'flex-start',
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: color.raised,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  mapLinkText: { fontFamily: fontSans, fontSize: 14, color: color.fg },
  mapPending: { fontFamily: fontSans, fontSize: 12, lineHeight: 16, color: color.faint },
})
