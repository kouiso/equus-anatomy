import { Link } from 'expo-router'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { STRUCTURE_BY_ID } from '../../core/data'
import type { Structure } from '../../core/types'
import { useSaved } from '../../ui/saved-store'
import { color, fontDisplay, fontDisplayItalic, fontSans, radius } from '../../ui/theme'

export default function Saved() {
  const { saved, ready } = useSaved()
  // 保存順を保つため STRUCTURES を舐めるんやのうて saved 側から引く。消えた id は黙って落とす
  const rows = saved.map((id) => STRUCTURE_BY_ID.get(id)).filter((s) => s !== undefined)
  // 読めるまで「0 件」と空の案内を出すと、保存しとる人に一瞬「消えた」と見える
  if (!ready) return <View style={styles.root} />

  return (
    <View style={styles.root}>
      <View style={styles.countWrap}>
        {/* 数字だけ display フォントで大きく。読み上げは「3 件」と一続きになる */}
        <Text testID="saved-count" style={styles.count}>
          <Text style={styles.countNum}>{rows.length}</Text> 件
        </Text>
      </View>
      {rows.length === 0 ? (
        <View testID="saved-empty" style={styles.empty}>
          <Text style={styles.emptyMain}>保存した部位はまだありません。</Text>
          <Text style={styles.emptySub}>解剖図や図鑑からブックマークすると、ここに集まります。</Text>
          {/* 空のまま行き止まりにせん。解剖タブへ戻る道をここに置く */}
          <Link href="/" asChild>
            <Pressable
              testID="saved-open-anatomy"
              accessibilityRole="link"
              accessibilityLabel="解剖図を開く"
              style={styles.openAnatomy}
            >
              <Text style={styles.openAnatomyText}>解剖図を開く</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <FlatList
          testID="saved-list"
          data={rows}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <Row s={item} />}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  )
}

function Row({ s }: { s: Structure }) {
  return (
    // asChild で Pressable に href を渡す。Link そのままやと Text になって縦並びが組めん
    <Link href={`/catalog/${s.id}`} asChild>
      <Pressable
        testID={`saved-row-${s.id}`}
        accessibilityRole="link"
        // 旧 Web 版の <a> と同じ読み上げ名（和名 ラテン名）
        accessibilityLabel={`${s.nameJa} ${s.nameLa}`}
        style={styles.row}
      >
        <Text numberOfLines={1} style={styles.nameJa}>
          {s.nameJa}
        </Text>
        <Text numberOfLines={1} style={styles.nameLa}>
          {s.nameLa}
        </Text>
      </Pressable>
    </Link>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  countWrap: { paddingHorizontal: 20, paddingBottom: 8 },
  count: { fontFamily: fontSans, fontSize: 14, lineHeight: 20, color: color.muted },
  countNum: { fontFamily: fontDisplay, fontSize: 18, color: color.fg },
  empty: { paddingHorizontal: 20, gap: 12, alignItems: 'flex-start' },
  emptyMain: { fontFamily: fontSans, fontSize: 14, lineHeight: 20, color: color.muted },
  emptySub: { fontFamily: fontSans, fontSize: 12, lineHeight: 16, color: color.faint },
  // 旧 Web 版の w-fit rounded-full bg-raised px-4 py-2 text-sm
  openAnatomy: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    backgroundColor: color.raised,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  openAnatomyText: { fontFamily: fontSans, fontSize: 14, lineHeight: 20, color: color.fg },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    flexDirection: 'column',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  nameJa: { fontFamily: fontSans, fontSize: 14, lineHeight: 20, color: color.fg },
  nameLa: { fontFamily: fontDisplayItalic, fontStyle: 'italic', fontSize: 12, lineHeight: 16, color: color.muted },
})
