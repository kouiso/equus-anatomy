import { Link } from 'expo-router'
import { useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { STRUCTURE_BY_ID } from '../../core/data'
import type { Structure } from '../../core/types'
import { usePersistenceRetryOnFocus } from '../../ui/persistence-banner'
import { useSaved } from '../../ui/saved-store'
import { color, fontDisplayItalic, fontSans, fontSansMedium, radius } from '../../ui/theme'

type Removed = { readonly id: string; readonly index: number; readonly name: string }

export default function Saved() {
  const { saved, ready, setSaved } = useSaved()
  const [removed, setRemoved] = useState<Removed | null>(null)
  usePersistenceRetryOnFocus()
  // 保存順を保つため STRUCTURES を舐めるんやのうて saved 側から引く。消えた id は黙って落とす
  const rows = saved.map((id) => STRUCTURE_BY_ID.get(id)).filter((s) => s !== undefined)
  // 読めるまで「0 件」と空の案内を出すと、保存しとる人に一瞬「消えた」と見える
  const remove = (s: Structure) => {
    const index = saved.indexOf(s.id)
    if (index < 0) return
    setSaved(s.id, false)
    setRemoved({ id: s.id, index, name: s.nameJa })
  }

  const undo = () => {
    if (removed === null) return
    setSaved(removed.id, true, removed.index)
    setRemoved(null)
  }

  return (
    <View style={styles.root}>
      <View style={styles.countWrap}>
        {/* 数字だけ display フォントで大きく。読み上げは「3 件」と一続きになる */}
        <Text testID="saved-count" style={styles.count}>
          <Text style={styles.countNum}>{rows.length}</Text> 件
        </Text>
      </View>
      {!ready && rows.length === 0 ? (
        <Text testID="saved-loading" style={styles.loading}>保存した部位を確認しています。</Text>
      ) : rows.length === 0 ? (
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
          renderItem={({ item }) => <Row s={item} onRemove={() => remove(item)} />}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      )}
      {removed !== null ? (
        <View testID="saved-undo" accessibilityRole="alert" style={styles.undoBar}>
          <Text numberOfLines={2} style={styles.undoText}>{removed.name} の保存を解除しました。</Text>
          <Pressable testID={`saved-undo-${removed.id}`} accessibilityRole="button" accessibilityLabel={`${removed.name} の保存解除を取り消す`} onPress={undo} style={styles.undoButton}>
            <Text style={styles.undoButtonText}>取り消す</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}

function Row({ s, onRemove }: { s: Structure; onRemove: () => void }) {
  return (
    <View style={styles.row}>
      <Link href={{ pathname: '/catalog/[id]', params: { id: s.id, from: 'saved' } }} asChild>
        <Pressable
          testID={`saved-row-${s.id}`}
          accessibilityRole="link"
          accessibilityLabel={`${s.nameJa} ${s.nameLa} の解説を読む`}
          style={styles.rowMain}
        >
          <Text numberOfLines={1} style={styles.nameJa}>{s.nameJa}</Text>
          <Text numberOfLines={1} style={styles.nameLa}>{s.nameLa}</Text>
        </Pressable>
      </Link>
      <View style={styles.actions}>
        <Link href={`/?part=${s.id}`} asChild>
          <Pressable testID={`saved-map-${s.id}`} accessibilityRole="link" accessibilityLabel={`${s.nameJa} を図で見る`} style={styles.actionButton}>
            <Text style={styles.actionText}>図で見る</Text>
          </Pressable>
        </Link>
        <Pressable testID={`saved-remove-${s.id}`} accessibilityRole="button" accessibilityLabel={`${s.nameJa} の保存を解除`} onPress={onRemove} style={styles.actionButton}>
          <Text style={styles.actionText}>保存解除</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  countWrap: { paddingHorizontal: 20, paddingBottom: 8 },
  count: { fontFamily: fontSans, fontSize: 14, lineHeight: 20, color: color.muted },
  countNum: { fontFamily: fontSans, fontSize: 18, color: color.fg },
  loading: { paddingHorizontal: 20, paddingVertical: 16, fontFamily: fontSans, fontSize: 14, color: color.muted },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 68,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  rowMain: { flex: 1, minWidth: 0, minHeight: 52, justifyContent: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6, maxWidth: 176 },
  actionButton: { minHeight: 44, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: color.raised, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontFamily: fontSans, fontSize: 12, color: color.fg },
  nameJa: { fontFamily: fontSans, fontSize: 14, lineHeight: 20, color: color.fg },
  nameLa: { fontFamily: fontDisplayItalic, fontStyle: 'italic', fontSize: 12, lineHeight: 16, color: color.muted },
  undoBar: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 12, marginBottom: 8, paddingLeft: 14, paddingRight: 6, paddingVertical: 6, borderRadius: radius.card, backgroundColor: color.raised },
  undoText: { flex: 1, fontFamily: fontSans, fontSize: 12, lineHeight: 17, color: color.fg },
  undoButton: { minHeight: 44, paddingHorizontal: 12, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  undoButtonText: { fontFamily: fontSansMedium, fontSize: 13, color: color.bone },
})
