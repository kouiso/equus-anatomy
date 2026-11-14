import { Link } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { detailBlocks, regionLabel, structureAltName, structureName, structureText } from '../core/i18n'
import type { Structure } from '../core/types'
import { ariaLevel } from './aria'
import { useLocale, useT } from './locale-store'
import { NameSpeech } from './name-speech'
import { SaveLearnedButtons } from './save-learned-buttons'
import { PartSupervisionNote } from './supervision-status'
import { color, fontDisplayItalic, fontSans, fontSansMedium, radius } from './theme'

export function PartSheet(props: { structure: Structure; onClose: () => void; onCatalog?: () => void; hideClose?: boolean }) {
  const s = props.structure
  const locale = useLocale()
  const t = useT()
  const text = structureText(s, locale)
  return (
    <View style={styles.article} testID="part-sheet">
      <View style={styles.header}>
        <View style={styles.titles}>
          {/* 画面の h1 は Shell の 馬体解剖。ここは旧版どおり h2 */}
          <Text accessibilityRole="header" {...ariaLevel(2)} style={styles.nameJa}>
            {structureName(s, locale)}
          </Text>
          <Text style={styles.nameLa}>{s.nameLa}</Text>
          <Text style={styles.meta}>
            {structureAltName(s, locale)} · {regionLabel(s.region, locale)}
          </Text>
          <NameSpeech structure={s} />
        </View>
        <View style={styles.actions}>
          <SaveLearnedButtons structureId={s.id} compact />
          {props.hideClose ? null : (
          <Pressable
            testID="close-sheet"
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={props.onClose}
            style={[styles.pill, styles.pillOff]}
          >
            <Text style={[styles.pillText, styles.pillTextOff]}>{t('common.close')}</Text>
          </Pressable>
          )}
        </View>
      </View>
      {text.lang !== locale ? <Text testID="part-sheet-ja-only" style={styles.meta}>{t('detail.jaOnly')}</Text> : null}
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
      {props.onCatalog ? <Pressable accessibilityRole="link" onPress={props.onCatalog} style={styles.pill}><Text style={styles.link}>{t('detail.openInCatalog')}</Text></Pressable> : <Link href={`/catalog/${s.id}?from=anatomy`} accessibilityRole="link" style={styles.link}>
        {t('detail.openInCatalog')}
      </Link>}
    </View>
  )
}

const styles = StyleSheet.create({
  article: { flexDirection: 'column', gap: 12 },
  header: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  titles: { flexShrink: 1 },
  nameJa: { fontFamily: fontSansMedium, fontSize: 18, lineHeight: 25, color: color.fg },
  nameLa: { fontFamily: fontDisplayItalic, fontStyle: 'italic', fontSize: 14, lineHeight: 17, color: color.muted },
  meta: { fontFamily: fontSans, fontSize: 12, letterSpacing: 0.3, color: color.faint },
  actions: { flexDirection: 'row', flexWrap:'wrap', flexShrink: 0, gap: 6 },
  pill: { minHeight: 44, borderRadius: radius.pill, paddingHorizontal: 12, justifyContent: 'center' },
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
  link: {
    fontFamily: fontSans,
    fontSize: 12,
    letterSpacing: 0.3,
    color: color.bone,
    textDecorationLine: 'underline',
    alignSelf: 'flex-start',
  },
})
