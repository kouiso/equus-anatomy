import { Link, useLocalSearchParams } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { STRUCTURE_BY_ID, STRUCTURES } from '../../../core/data'
import type { View as AnatomyView } from '../../../core/types'
import { ariaLevel, ariaPressed } from '../../../ui/aria'
import { useSaved } from '../../../ui/saved-store'
import { color, fontDisplayItalic, fontSans, fontSansMedium, radius } from '../../../ui/theme'

const VIEW_LABEL: Record<AnatomyView, string> = { left: '左側望', right: '右側望', front: '正面', rear: '後面' }

/** 静的書き出し（expo export）は動的ルートの一覧を先に知る必要がある。52 部位ぶんの HTML を吐かせる。 */
export function generateStaticParams(): { id: string }[] {
  return STRUCTURES.map((s) => ({ id: s.id }))
}

export default function CatalogDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const s = typeof id === 'string' ? STRUCTURE_BY_ID.get(id) : undefined
  const { has, toggle } = useSaved()

  return (
    // 図鑑タブの Stack の中。ヘッダとタブバーは (tabs)/_layout が出すので、ここは本文だけ
    <View style={styles.root}>
      {s === undefined ? (
        <View style={styles.notFound} testID="catalog-not-found">
          <Text style={styles.body}>その部位は見つかりませんでした。</Text>
          <Link href="/catalog" asChild>
            <Pressable testID="catalog-back" accessibilityRole="link" accessibilityLabel="図鑑へ戻る" style={styles.backPill}>
              <Text style={styles.backPillText}>図鑑へ戻る</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <ScrollView
          testID="catalog-detail"
          style={styles.scroll}
          contentContainerStyle={styles.content}
        >
          <Link href="/catalog" testID="catalog-back" accessibilityRole="link" accessibilityLabel="← 図鑑" style={styles.back}>
            ← 図鑑
          </Link>
          <View style={styles.header}>
            <View style={styles.titles}>
              {/* 画面の h1 は Shell の 馬体解剖。ここは旧版どおり h2 */}
              <Text accessibilityRole="header" {...ariaLevel(2)} testID="detail-name-ja" style={styles.nameJa}>
                {s.nameJa}
              </Text>
              <Text testID="detail-name-la" style={styles.nameLa}>
                {s.nameLa}
              </Text>
              <Text style={styles.meta}>
                {s.nameEn} · {s.region}
              </Text>
            </View>
            <Pressable
              testID="save-toggle"
              accessibilityRole="button"
              accessibilityState={{ selected: has(s.id) }}
              {...ariaPressed(has(s.id))}
              accessibilityLabel={has(s.id) ? '保存済み' : '保存'}
              onPress={() => toggle(s.id)}
              style={[styles.pill, has(s.id) ? styles.pillOn : styles.pillOff]}
            >
              <Text style={[styles.pillText, has(s.id) ? styles.pillTextOn : styles.pillTextOff]}>
                {has(s.id) ? '保存済み' : '保存'}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.summary}>{s.summary}</Text>
          <Text style={styles.body}>{s.body}</Text>
          <Text style={styles.body}>
            <Text style={styles.faint}>はたらき — </Text>
            {s.function}
          </Text>
          {s.note ? <Text style={styles.note}>{s.note}</Text> : null}
          <Text testID="detail-views" style={styles.views}>
            掲載される向き: {s.views.map((v) => VIEW_LABEL[v]).join(' / ')}
          </Text>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  scroll: { flex: 1 },
  // 旧 Web 版の px-5 pb-8 pt-2。ホームバーはタブバー側が避ける
  content: { flexDirection: 'column', gap: 16, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  notFound: { flex: 1, flexDirection: 'column', gap: 12, paddingHorizontal: 20, paddingVertical: 24 },
  backPill: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    backgroundColor: color.raised,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backPillText: { fontFamily: fontSans, fontSize: 14, color: color.fg },
  back: { alignSelf: 'flex-start', fontFamily: fontSans, fontSize: 12, letterSpacing: 0.3, color: color.muted },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  titles: { flexShrink: 1 },
  // 旧 Web 版は font-display 指定やが Cormorant に和文グリフが無く実際は Zen Kaku で出とった。RN では明示的にそちらを使う
  nameJa: { fontFamily: fontSansMedium, fontSize: 24, lineHeight: 30, color: color.fg },
  nameLa: { fontFamily: fontDisplayItalic, fontStyle: 'italic', fontSize: 16, lineHeight: 20, color: color.muted },
  meta: { fontFamily: fontSans, fontSize: 12, letterSpacing: 0.3, color: color.faint },
  pill: { height: 36, flexShrink: 0, borderRadius: radius.pill, paddingHorizontal: 14, justifyContent: 'center' },
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
})
