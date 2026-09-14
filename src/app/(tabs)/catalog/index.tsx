import { Link } from 'expo-router'
import { useMemo, useRef, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { AREA_PRESETS } from '../../../core/data/areas'
import { STRUCTURES } from '../../../core/data'
import { filterStructures } from '../../../core/search'
import type { Layer, Structure, View as AnatomyView } from '../../../core/types'
import { catalogUiState, type CatalogFilter } from '../../../ui/catalog-state'
import { ChipRow } from '../../../ui/chip-row'
import { useMastery } from '../../../ui/mastery-store'
import { usePersistenceRetryOnFocus } from '../../../ui/persistence-banner'
import { color, fontDisplay, fontDisplayItalic, fontSans, radius } from '../../../ui/theme'

const FILTERS = [
  { id: 'all', label: 'すべて' },
  { id: 'skin', label: '皮膚' },
  { id: 'muscle', label: '筋肉' },
  { id: 'skeleton', label: '骨格' },
  { id: 'organs', label: '内臓' },
] as const satisfies readonly { id: CatalogFilter; label: string }[]

const AREA_FILTERS: readonly { id: string; label: string }[] = [
  { id: 'all', label: 'すべて' },
  ...AREA_PRESETS.map((a) => ({ id: a.id, label: a.nameJa })),
]

const VIEW_FILTERS = [
  { id: 'all', label: 'すべて' },
  { id: 'left', label: '左側望' },
  { id: 'right', label: '右側望' },
  { id: 'front', label: '正面' },
  { id: 'rear', label: '後面' },
] as const satisfies readonly { id: AnatomyView | 'all'; label: string }[]

const LAYER_LABEL: Record<Layer, string> = { skin: '皮膚', muscle: '筋肉', skeleton: '骨格', organs: '内臓' }

export default function CatalogIndex() {
  const [filter, setFilterState] = useState<CatalogFilter>(catalogUiState.filter)
  const [area, setAreaState] = useState<string>(catalogUiState.area)
  const [view, setViewState] = useState<AnatomyView | 'all'>(catalogUiState.view)
  const [q, setQState] = useState(catalogUiState.query)
  const listRef = useRef<FlatList<Structure>>(null)
  const { learnedCount, learned } = useMastery()
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
          <Text style={styles.countNum}>{rows.length}</Text> 部位
        </Text>
        <Text testID="mastery-count" style={styles.count}>
          覚えた <Text style={styles.countNum}>{learnedCount}</Text> / {STRUCTURES.length}
        </Text>
      </View>
      <View style={styles.searchWrap}>
        <TextInput
          testID="catalog-search"
          value={q}
          onChangeText={setQ}
          placeholder="部位を検索"
          placeholderTextColor={color.faint}
          accessibilityLabel="部位を検索"
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
            accessibilityLabel="検索文字を消去"
            onPress={() => setQ('')}
            style={styles.clearButton}
          >
            <Text style={styles.clearText}>消去</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.filterHeading}>
        <Text style={styles.filterLabel}>絞り込み（横にスクロール）</Text>
        {filtersActive ? (
          <Pressable testID="catalog-filter-reset" accessibilityRole="button" accessibilityLabel="絞り込みを解除" onPress={resetFilters} style={styles.resetButton}>
            <Text style={styles.resetText}>すべて解除</Text>
          </Pressable>
        ) : null}
      </View>
      <ChipRow title="層" ariaLabel="層で絞り込む" items={FILTERS} value={filter} onChange={setFilter} />
      <ChipRow title="場所" ariaLabel="場所で絞り込む" items={AREA_FILTERS} value={area} onChange={setArea} />
      <ChipRow title="向き" ariaLabel="向きで絞り込む" items={VIEW_FILTERS} value={view} onChange={setView} />
    </View>
  )

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        testID="catalog-list"
        data={rows}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <Row s={item} learned={learned(item.id)} />}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <Text testID="catalog-empty" style={styles.empty}>
            見つかりませんでした。
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

function Row({ s, learned }: { s: Structure; learned: boolean }) {
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
          accessibilityLabel={`${LAYER_LABEL[s.layer]} ${s.nameJa} ${s.nameLa} ${s.region}`}
          style={styles.rowMain}
        >
          <Text style={styles.layer}>{LAYER_LABEL[s.layer]}</Text>
          <View style={styles.names}>
            <Text numberOfLines={1} style={styles.nameJa}>
              {s.nameJa}
            </Text>
            <Text numberOfLines={1} style={styles.nameLa}>
              {s.nameLa}
            </Text>
          </View>
          <Text style={styles.region}>{s.region}</Text>
        </Pressable>
      </Link>
      <Link href={`/?part=${s.id}`} asChild>
        <Pressable
          testID={`map-${s.id}`}
          accessibilityRole="link"
          accessibilityLabel={`${s.nameJa} を解剖図で見る`}
          style={styles.mapPill}
        >
          <Text style={styles.mapPillText}>図</Text>
        </Pressable>
      </Link>
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
  layer: { width: 40, flexShrink: 0, fontFamily: fontSans, fontSize: 12, color: color.faint },
  names: { flex: 1, minWidth: 0 },
  nameJa: { fontFamily: fontSans, fontSize: 14, lineHeight: 20, color: color.fg },
  nameLa: { fontFamily: fontDisplayItalic, fontStyle: 'italic', fontSize: 12, lineHeight: 16, color: color.muted },
  region: { flexShrink: 0, fontFamily: fontSans, fontSize: 12, color: color.faint },
  empty: { paddingVertical: 24, fontFamily: fontSans, fontSize: 14, color: color.muted },
})
