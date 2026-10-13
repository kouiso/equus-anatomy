import { Link } from 'expo-router'
import { useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { STRUCTURE_BY_ID } from '../../core/data'
import { canOpenOnMap } from '../../core/map-entry'
import { structureName, type Locale, type Translator } from '../../core/i18n'
import type { Structure } from '../../core/types'
import { useLocale, useT } from '../../ui/locale-store'
import { usePersistenceRetryOnFocus } from '../../ui/persistence-banner'
import { useSaved } from '../../ui/saved-store'
import { color, fontDisplayItalic, fontSans, fontSansMedium, radius } from '../../ui/theme'

type Removed = { readonly id: string; readonly index: number }

export default function Saved() {
  const { saved, ready, setSaved } = useSaved()
  const [removed, setRemoved] = useState<Removed | null>(null)
  const locale = useLocale()
  const t = useT()
  // 取り消し案内の名前は表示時に引く。解除後に言語を切り替えても案内が古い言語のまま残らんように
  const removedStructure = removed === null ? undefined : STRUCTURE_BY_ID.get(removed.id)
  const removedName = removedStructure === undefined ? (removed?.id ?? '') : structureName(removedStructure, locale)
  usePersistenceRetryOnFocus()
  // 保存順を保つため STRUCTURES を舐めるんやのうて saved 側から引く。消えた id は黙って落とす
  const rows = saved.map((id) => STRUCTURE_BY_ID.get(id)).filter((s) => s !== undefined)
  // 読めるまで「0 件」と空の案内を出すと、保存しとる人に一瞬「消えた」と見える
  const remove = (s: Structure) => {
    const index = saved.indexOf(s.id)
    if (index < 0) return
    setSaved(s.id, false)
    setRemoved({ id: s.id, index })
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
          <Text style={styles.countNum}>{rows.length}</Text> {t('saved.countUnit')}
        </Text>
      </View>
      {!ready && rows.length === 0 ? (
        <Text testID="saved-loading" style={styles.loading}>{t('saved.loading')}</Text>
      ) : rows.length === 0 ? (
        <View testID="saved-empty" style={styles.empty}>
          <Text style={styles.emptyMain}>{t('saved.emptyMain')}</Text>
          <Text style={styles.emptySub}>{t('saved.emptySub')}</Text>
          {/* 空のまま行き止まりにせん。解剖タブへ戻る道をここに置く */}
          <Link href="/" asChild>
            <Pressable
              testID="saved-open-anatomy"
              accessibilityRole="link"
              accessibilityLabel={t('saved.openAnatomy')}
              style={styles.openAnatomy}
            >
              <Text style={styles.openAnatomyText}>{t('saved.openAnatomy')}</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <FlatList
          testID="saved-list"
          data={rows}
          keyExtractor={(s) => s.id}
          renderItem={({ item }) => <Row s={item} onRemove={() => remove(item)} locale={locale} t={t} />}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      )}
      {removed !== null ? (
        <View testID="saved-undo" accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.undoBar}>
          <Text numberOfLines={2} style={styles.undoText}>{t('saved.removed', { name: removedName })}</Text>
          <Pressable testID={`saved-undo-${removed.id}`} accessibilityRole="button" accessibilityLabel={t('saved.undoLabel', { name: removedName })} onPress={undo} style={styles.undoButton}>
            <Text style={styles.undoButtonText}>{t('saved.undo')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}

function Row({ s, onRemove, locale, t }: { s: Structure; onRemove: () => void; locale: Locale; t: Translator }) {
  const name = structureName(s, locale)
  return (
    <View style={styles.row}>
      <Link href={{ pathname: '/catalog/[id]', params: { id: s.id, from: 'saved' } }} asChild>
        <Pressable
          testID={`saved-row-${s.id}`}
          accessibilityRole="link"
          accessibilityLabel={t('saved.rowLabel', { name, latin: s.nameLa })}
          style={styles.rowMain}
        >
          <Text numberOfLines={1} style={styles.nameJa}>{name}</Text>
          <Text numberOfLines={1} style={styles.nameLa}>{s.nameLa}</Text>
        </Pressable>
      </Link>
      <View style={styles.actions}>
        {/* 図鑑と同じ判定。位置未登録へ飛ばす入口は出さん */}
        {canOpenOnMap(s) ? (
          <Link href={`/?part=${s.id}`} asChild>
            <Pressable testID={`saved-map-${s.id}`} accessibilityRole="link" accessibilityLabel={t('saved.mapLabel', { name })} style={styles.actionButton}>
              <Text style={styles.actionText}>{t('saved.map')}</Text>
            </Pressable>
          </Link>
        ) : (
          <View testID={`saved-map-pending-${s.id}`} accessibilityLabel={t('saved.mapPendingLabel', { name })} style={styles.actionButton}>
            <Text style={styles.actionPendingText}>{t('common.pending')}</Text>
          </View>
        )}
        <Pressable testID={`saved-remove-${s.id}`} accessibilityRole="button" accessibilityLabel={t('saved.removeLabel', { name })} onPress={onRemove} style={styles.actionButton}>
          <Text style={styles.actionText}>{t('saved.remove')}</Text>
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
  actionPendingText: { fontFamily: fontSans, fontSize: 12, color: color.faint },
  nameJa: { fontFamily: fontSans, fontSize: 14, lineHeight: 20, color: color.fg },
  nameLa: { fontFamily: fontDisplayItalic, fontStyle: 'italic', fontSize: 12, lineHeight: 16, color: color.muted },
  undoBar: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 12, marginBottom: 8, paddingLeft: 14, paddingRight: 6, paddingVertical: 6, borderRadius: radius.card, backgroundColor: color.raised },
  undoText: { flex: 1, fontFamily: fontSans, fontSize: 12, lineHeight: 17, color: color.fg },
  undoButton: { minHeight: 44, paddingHorizontal: 12, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  undoButtonText: { fontFamily: fontSansMedium, fontSize: 13, color: color.bone },
})
