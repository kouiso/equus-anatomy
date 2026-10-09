import { Link } from 'expo-router'
import { useMemo, useRef, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { AREA_PRESETS } from '../../../core/data/areas'
import { STRUCTURES } from '../../../core/data'
import { canOpenOnMap } from '../../../core/map-entry'
import { filterStructures } from '../../../core/search'
import { areaLabel, regionLabel, structureName, type Locale, type Translator } from '../../../core/i18n'
import type { Layer, Structure, View as AnatomyView } from '../../../core/types'
import { catalogUiState, type CatalogFilter } from '../../../ui/catalog-state'
import { ChipRow } from '../../../ui/chip-row'
import { useLocale, useT } from '../../../ui/locale-store'
import { useMastery } from '../../../ui/mastery-store'
import { usePersistenceRetryOnFocus } from '../../../ui/persistence-banner'
import { color, fontDisplay, fontDisplayItalic, fontSans, radius } from '../../../ui/theme'

const LAYER_IDS = ['skin', 'muscle', 'skeleton', 'organs'] as const satisfies readonly Layer[]
const VIEW_IDS = ['left', 'right', 'front', 'rear'] as const satisfies readonly AnatomyView[]

function chips(t: Translator) {
  const all = { id: 'all', label: t('catalog.filterAll') } as const
  return {
    layer: [all, ...LAYER_IDS.map((id) => ({ id, label: t(`layer.${id}`) }))] satisfies readonly { id: CatalogFilter; label: string }[],
    area: [all, ...AREA_PRESETS.map((a) => ({ id: a.id, label: areaLabel(a, t) }))] as readonly { id: string; label: string }[],
    view: [all, ...VIEW_IDS.map((id) => ({ id, label: t(`view.${id}`) }))] satisfies readonly { id: AnatomyView | 'all'; label: string }[],
  }
}

export default function CatalogIndex() {
  const [filter, setFilterState] = useState<CatalogFilter>(catalogUiState.filter)
  const [area, setAreaState] = useState<string>(catalogUiState.area)
  const [view, setViewState] = useState<AnatomyView | 'all'>(catalogUiState.view)
  const [q, setQState] = useState(catalogUiState.query)
  const listRef = useRef<FlatList<Structure>>(null)
  const { learnedCount, learned } = useMastery()
  const locale = useLocale()
  const t = useT()
  const items = useMemo(() => chips(t), [t])
  usePersistenceRetryOnFocus()

  const setQ = (next: string) => {
    catalogUiState.query = next
    catalogUiState.scrollOffset = 0
    setQState(next)
    listRef.current?.scrollToOffset({ offset: 0, animated: false })
  }
  const setFilter = (next: CatalogFilter) => {
    catalogUiState.filter = next
    catalogUiState.scrollOffset = 0
    setFilterState(next)
    listRef.current?.scrollToOffset({ offset: 0, animated: false })
  }
  const setArea = (next: string) => {
    catalogUiState.area = next
    catalogUiState.scrollOffset = 0
    setAreaState(next)
    listRef.current?.scrollToOffset({ offset: 0, animated: false })
  }
  const setView = (next: AnatomyView | 'all') => {
    catalogUiState.view = next
    catalogUiState.scrollOffset = 0
    setViewState(next)
    listRef.current?.scrollToOffset({ offset: 0, animated: false })
  }
  const filtersActive = filter !== 'all' || area !== 'all' || view !== 'all'
  const resetFilters = () => {
    setFilter('all')
    setArea('all')
    setView('all')
  }

  const rows = useMemo(
    () => filterStructures(STRUCTURES, { query: q, layer: filter, area, view }),
    [filter, area, view, q],
  )

  // コンポーネント関数を渡すと入力のたびにヘッダが再マウントされ、検索欄のフォーカスが落ちる。
  // 同じ型の要素として渡し、件数・検索・絞り込みも一覧と一緒に縦スクロールさせる。
  const listHeader = (
    <View testID="catalog-controls" style={styles.listHeader}>
      <View style={styles.countWrap}>
        {/* 数字だけ display フォントで大きく。読み上げは「52 部位」と一続きになる */}
        <Text testID="catalog-count" style={styles.count}>
          <Text style={styles.countNum}>{rows.length}</Text> {t('catalog.countUnit')}
        </Text>
        <Text testID="mastery-count" style={styles.count}>
          {t('catalog.learnedPrefix')} <Text style={styles.countNum}>{learnedCount}</Text> / {STRUCTURES.length}
        </Text>
      </View>
      <View style={styles.searchWrap}>
        <TextInput
          testID="catalog-search"
          value={q}
          onChangeText={setQ}
          placeholder={t('catalog.searchPlaceholder')}
          placeholderTextColor={color.faint}
          accessibilityLabel={t('catalog.searchLabel')}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          inputMode="search"
          clearButtonMode="while-editing"
          style={styles.search}
        />
        {q !== '' ? (
          <Pressable
            testID="catalog-search-clear"
            accessibilityRole="button"
            accessibilityLabel={t('catalog.searchClearLabel')}
            onPress={() => setQ('')}
            style={styles.clearButton}
          >
            <Text style={styles.clearText}>{t('catalog.searchClear')}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.filterHeading}>
        <Text style={styles.filterLabel}>{t('catalog.filterHeading')}</Text>
        {filtersActive ? (
          <Pressable testID="catalog-filter-reset" accessibilityRole="button" accessibilityLabel={t('catalog.filterResetLabel')} onPress={resetFilters} style={styles.resetButton}>
            <Text style={styles.resetText}>{t('catalog.filterReset')}</Text>
          </Pressable>
        ) : null}
      </View>
      <ChipRow title={t('catalog.chipLayer')} ariaLabel={t('catalog.chipLayerLabel')} items={items.layer} value={filter} onChange={setFilter} />
      <ChipRow title={t('catalog.chipArea')} ariaLabel={t('catalog.chipAreaLabel')} items={items.area} value={area} onChange={setArea} />
      <ChipRow title={t('catalog.chipView')} ariaLabel={t('catalog.chipViewLabel')} items={items.view} value={view} onChange={setView} />
    </View>
  )

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        testID="catalog-list"
        data={rows}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <Row s={item} learned={learned(item.id)} locale={locale} t={t} />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <Text testID="catalog-empty" style={styles.empty}>
            {t('catalog.empty')}
          </Text>
        }
        // 検索欄にフォーカスがある状態でも行を一回で押せるように
        keyboardShouldPersistTaps="handled"
        onScroll={(event) => {
          catalogUiState.scrollOffset = event.nativeEvent.contentOffset.y
        }}
        scrollEventThrottle={100}
        onLayout={() => {
          if (catalogUiState.scrollOffset > 0) {
            listRef.current?.scrollToOffset({ offset: catalogUiState.scrollOffset, animated: false })
          }
        }}
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />
    </View>
  )
}

function Row({ s, learned, locale, t }: { s: Structure; learned: boolean; locale: Locale; t: Translator }) {
  const name = structureName(s, locale)
  const region = regionLabel(s.region, locale)
  const layer = t(`layer.${s.layer}`)
  // 行と「図」で行き先が違うので、リンクを入れ子にはせず兄弟に並べる
  // （入れ子にすると Web では <a> の中に <a> が出て壊れる）
  return (
    <View style={styles.row}>
      <View testID={`learned-mark-${s.id}`} style={[styles.learnedMark, learned ? styles.learnedMarkOn : null]} />
      <Link href={{ pathname: '/catalog/[id]', params: { id: s.id, from: 'catalog' } }} asChild>
        <Pressable
          testID={`catalog-row-${s.id}`}
          accessibilityRole="link"
          // 旧 Web 版の <a> と同じ読み上げ名（層 和名 ラテン名 部位）
          accessibilityLabel={t('catalog.rowLabel', { layer, name, latin: s.nameLa, region })}
          style={styles.rowMain}
        >
          <Text style={[styles.layer, locale === 'en' ? styles.layerEn : null]}>{layer}</Text>
          <View style={styles.names}>
            <Text numberOfLines={1} style={styles.nameJa}>
              {name}
            </Text>
            <Text numberOfLines={1} style={styles.nameLa}>
              {s.nameLa}
            </Text>
          </View>
          <Text style={styles.region}>{region}</Text>
        </Pressable>
      </Link>
      {/* 位置未登録の部位へ飛ぶと真っ黒キャンバスか点の無い図の行き止まり。入口は出さん */}
      {canOpenOnMap(s) ? (
        <Link href={`/?part=${s.id}`} asChild>
          <Pressable
            testID={`map-${s.id}`}
            accessibilityRole="link"
            accessibilityLabel={t('catalog.mapLabel', { name })}
            style={styles.mapPill}
          >
            <Text style={styles.mapPillText}>{t('catalog.mapPill')}</Text>
          </Pressable>
        </Link>
      ) : (
        <View
          testID={`map-pending-${s.id}`}
          accessibilityLabel={t('catalog.mapPendingLabel', { name })}
          style={[styles.mapPill, styles.mapPillPending]}
        >
          <Text style={styles.mapPillPendingText}>{t('common.pending')}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  listHeader: { marginHorizontal: -16, paddingBottom: 8 },
  countWrap: { paddingHorizontal: 20, paddingBottom: 4, flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  learnedMark: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'transparent', flexShrink: 0 },
  learnedMarkOn: { backgroundColor: color.bone },
  count: { fontFamily: fontSans, fontSize: 14, lineHeight: 20, color: color.muted },
  countNum: { fontFamily: fontDisplay, fontSize: 18, color: color.fg },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 8 },
  search: {
    minHeight: 44,
    flex: 1,
    borderRadius: radius.pill,
    backgroundColor: color.raised,
    paddingHorizontal: 16,
    fontFamily: fontSans,
    fontSize: 14,
    color: color.fg,
  },
  clearButton: { minWidth: 52, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: color.raised },
  clearText: { fontFamily: fontSans, fontSize: 13, color: color.fg },
  filterHeading: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  filterLabel: { fontFamily: fontSans, fontSize: 12, color: color.muted },
  resetButton: { minHeight: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  resetText: { fontFamily: fontSans, fontSize: 12, color: color.bone },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  rowMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  mapPill: {
    minHeight: 44,
    width: 44,
    borderRadius: radius.pill,
    backgroundColor: color.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPillText: { fontFamily: fontSans, fontSize: 12, color: color.muted },
  // 「図」より字が長いので幅は内容に任せる。押せん物なので色は一段落とす
  mapPillPending: { width: undefined, paddingHorizontal: 10, backgroundColor: 'transparent' },
  mapPillPendingText: { fontFamily: fontSans, fontSize: 11, color: color.faint },
  // 固定幅だと文字拡大時に「皮/膚」と縦に割れる。下限だけ揃えて中身に合わせて伸ばす
  layer: { minWidth: 40, flexShrink: 0, fontFamily: fontSans, fontSize: 12, color: color.faint },
  // 英語の層名（Skeleton 等）は和名2字より長い。列を揃えたまま折り返さん幅にする
  layerEn: { minWidth: 60 },
  names: { flex: 1, minWidth: 0 },
  nameJa: { fontFamily: fontSans, fontSize: 14, lineHeight: 20, color: color.fg },
  nameLa: { fontFamily: fontDisplayItalic, fontStyle: 'italic', fontSize: 12, lineHeight: 16, color: color.muted },
  region: { flexShrink: 0, fontFamily: fontSans, fontSize: 12, color: color.faint },
  empty: { paddingVertical: 24, fontFamily: fontSans, fontSize: 14, color: color.muted },
})
