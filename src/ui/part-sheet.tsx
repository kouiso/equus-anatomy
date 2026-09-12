import { Link } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Structure } from '../core/types'
import { ariaLevel, ariaPressed } from './aria'
import { useMastery } from './mastery-store'
import { useSaved } from './saved-store'
import { color, fontDisplayItalic, fontSans, fontSansMedium, radius } from './theme'

export function PartSheet(props: { structure: Structure; onClose: () => void }) {
  const s = props.structure
  const { has, toggle } = useSaved()
  const { learned, mark, ready } = useMastery()
  const saved = has(s.id)
  const isLearned = learned(s.id)
  return (
    <View style={styles.article} testID="part-sheet">
      <View style={styles.header}>
        <View style={styles.titles}>
          {/* 画面の h1 は Shell の 馬体解剖。ここは旧版どおり h2 */}
          <Text accessibilityRole="header" {...ariaLevel(2)} style={styles.nameJa}>
            {s.nameJa}
          </Text>
          <Text style={styles.nameLa}>{s.nameLa}</Text>
          <Text style={styles.meta}>
            {s.nameEn} · {s.region}
          </Text>
        </View>
        <View style={styles.actions}>
          <Pressable
            testID="save-toggle"
            accessibilityRole="button"
            accessibilityState={{ selected: saved }}
            {...ariaPressed(saved)}
            accessibilityLabel={saved ? '保存済み' : '保存'}
            onPress={() => toggle(s.id)}
            style={[styles.pill, saved ? styles.pillOn : styles.pillOff]}
          >
            <Text style={[styles.pillText, saved ? styles.pillTextOn : styles.pillTextOff]}>
              {saved ? '保存済み' : '保存'}
            </Text>
          </Pressable>
          <Pressable
            testID="mastery-toggle"
            accessibilityRole="button"
            accessibilityState={{ selected: isLearned }}
            {...ariaPressed(isLearned)}
            accessibilityLabel={isLearned ? '覚えた' : 'まだ'}
            onPress={() => mark(s.id, !isLearned)}
            disabled={!ready}
            style={[styles.pill, isLearned ? styles.pillOn : styles.pillOff, !ready ? styles.pillWaiting : null]}
          >
            <Text style={[styles.pillText, isLearned ? styles.pillTextOn : styles.pillTextOff]}>
              {isLearned ? '覚えた' : 'まだ'}
            </Text>
          </Pressable>
          <Pressable
            testID="close-sheet"
            accessibilityRole="button"
            accessibilityLabel="閉じる"
            onPress={props.onClose}
            style={[styles.pill, styles.pillOff]}
          >
            <Text style={[styles.pillText, styles.pillTextOff]}>閉じる</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.summary}>{s.summary}</Text>
      <Text style={styles.body}>{s.body}</Text>
      <Text style={styles.body}>
        <Text style={styles.faint}>はたらき — </Text>
        {s.function}
      </Text>
      {s.note ? <Text style={styles.note}>{s.note}</Text> : null}
      <Link href={`/catalog/${s.id}`} accessibilityRole="link" style={styles.link}>
        図鑑で見る
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  article: { flexDirection: 'column', gap: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  titles: { flexShrink: 1 },
  nameJa: { fontFamily: fontSansMedium, fontSize: 18, lineHeight: 25, color: color.fg },
  nameLa: { fontFamily: fontDisplayItalic, fontStyle: 'italic', fontSize: 14, lineHeight: 17, color: color.muted },
  meta: { fontFamily: fontSans, fontSize: 12, letterSpacing: 0.3, color: color.faint },
  actions: { flexDirection: 'row', flexShrink: 0, gap: 6 },
  pill: { height: 36, borderRadius: radius.pill, paddingHorizontal: 12, justifyContent: 'center' },
  pillOn: { backgroundColor: color.bone },
  pillOff: { backgroundColor: color.raised },
  // native は保存の読み込みが非同期。届くまで「まだ」と見せて押させると実際は覚えたものを消させる
  pillWaiting: { opacity: 0.4 },
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
  link: {
    fontFamily: fontSans,
    fontSize: 12,
    letterSpacing: 0.3,
    color: color.bone,
    textDecorationLine: 'underline',
    alignSelf: 'flex-start',
  },
})
