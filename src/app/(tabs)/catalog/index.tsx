import { Link } from 'expo-router'
import { useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { AREA_PRESETS } from '../../../core/data/areas'
import { STRUCTURES } from '../../../core/data'
import { filterStructures } from '../../../core/search'
import type { Layer, Structure, View as AnatomyView } from '../../../core/types'
import { ChipRow } from '../../../ui/chip-row'
import { color, fontDisplay, fontDisplayItalic, fontSans, radius } from '../../../ui/theme'

type Filter = Layer | 'all'
const FILTERS = [
  { id: 'all', label: 'すべて' },
  { id: 'skin', label: '皮膚' },
  { id: 'muscle', label: '筋肉' },
  { id: 'skeleton', label: '骨格' },
  { id: 'organs', label: '内臓' },
] as const satisfies readonly { id: Filter; label: string }[]

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
  const [filter, setFilter] = useState<Filter>('all')
  const [area, setArea] = useState<string>('all')
  const [view, setView] = useState<AnatomyView | 'all'>('all')
  const [q, setQ] = useState('')

  const rows = useMemo(
    () => filterStructures(STRUCTURES, { query: q, layer: filter, area, view }),
    [filter, area, view, q],
  )

  return (
    <View style={styles.root}>
      <View style={styles.countWrap}>
        {/* 数字だけ display フォントで大きく。読み上げは「52 部位」と一続きになる */}
        <Text testID="catalog-count" style={styles.count}>
          <Text style={styles.countNum}>{rows.length}</Text> 部位
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
          // Web では type="search" になって、旧版と同じブラウザの消去ボタンが付く
          inputMode="search"
          clearButtonMode="while-editing"
          style={styles.search}
        />
      </View>
      <ChipRow ariaLabel="層で絞り込む" items={FILTERS} value={filter} onChange={setFilter} />
      <ChipRow ariaLabel="場所で絞り込む" items={AREA_FILTERS} value={area} onChange={setArea} />
      <ChipRow ariaLabel="向きで絞り込む" items={VIEW_FILTERS} value={view} onChange={setView} />
      <FlatList
        testID="catalog-list"
        data={rows}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <Row s={item} />}
        ListEmptyComponent={
          <Text testID="catalog-empty" style={styles.empty}>
            見つかりませんでした。
          </Text>
        }
        // 検索欄にフォーカスがある状態でも行を一回で押せるように
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        contentContainerStyle={styles.listContent}
      />
    </View>
  )
}

function Row({ s }: { s: Structure }) {
  // 行と「図」で行き先が違うので、リンクを入れ子にはせず兄弟に並べる
  // （入れ子にすると Web では <a> の中に <a> が出て壊れる）
  return (
    <View style={styles.row}>
      <Link href={`/catalog/${s.id}`} asChild>
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
  countWrap: { paddingHorizontal: 20, paddingBottom: 4 },
  count: { fontFamily: fontSans, fontSize: 14, lineHeight: 20, color: color.muted },
  countNum: { fontFamily: fontDisplay, fontSize: 18, color: color.fg },
  searchWrap: { paddingHorizontal: 16, paddingBottom: 4 },
  search: {
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: color.raised,
    paddingHorizontal: 16,
    fontFamily: fontSans,
    fontSize: 14,
    color: color.fg,
  },
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
    height: 32,
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
