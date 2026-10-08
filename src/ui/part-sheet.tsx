import { Link } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { regionLabel, structureAltName, structureName, structureText } from '../core/i18n'
import type { Structure } from '../core/types'
import { ariaLevel, ariaPressed } from './aria'
import { useLocale, useT } from './locale-store'
import { useMastery } from './mastery-store'
import { useSaved } from './saved-store'
import { color, fontDisplayItalic, fontSans, fontSansMedium, radius } from './theme'

export function PartSheet(props: { structure: Structure; onClose: () => void; onCatalog?: () => void; hideClose?: boolean }) {
  const s = props.structure
  const { has, toggle, persistence } = useSaved()
  const { learned, mark } = useMastery()
  const saved = has(s.id)
  const isLearned = learned(s.id)
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
        </View>
        <View style={styles.actions}>
          <Pressable
            testID="save-toggle"
            accessibilityRole="button"
            accessibilityState={{ selected: saved }}
            {...ariaPressed(saved)}
            accessibilityLabel={saved ? t(persistence.dirty ? 'save.pending' : 'save.saved') : t('save.save')}
            onPress={() => toggle(s.id)}
            style={[styles.pill, saved ? styles.pillOn : styles.pillOff]}
          >
            <Text style={[styles.pillText, saved ? styles.pillTextOn : styles.pillTextOff]}>
              {saved ? t(persistence.dirty ? 'save.pending' : 'save.saved') : t('save.save')}
            </Text>
          </Pressable>
          <Pressable
            testID="mastery-toggle"
            accessibilityRole="button"
            accessibilityState={{ selected: isLearned }}
            {...ariaPressed(isLearned)}
            accessibilityLabel={t(isLearned ? 'mastery.learned' : 'mastery.mark')}
            onPress={() => mark(s.id, !isLearned)}
            style={[styles.pill, isLearned ? styles.pillOn : styles.pillOff]}
          >
            <Text style={[styles.pillText, isLearned ? styles.pillTextOn : styles.pillTextOff]}>
              {t(isLearned ? 'mastery.learned' : 'mastery.mark')}
            </Text>
          </Pressable>
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
      <Text style={styles.body}>{text.body}</Text>
      <Text style={styles.body}>
        <Text style={styles.faint}>{t('common.functionLabel')}</Text>
        {text.function}
      </Text>
      {text.note ? <Text style={styles.note}>{text.note}</Text> : null}
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
  link: {
    fontFamily: fontSans,
    fontSize: 12,
    letterSpacing: 0.3,
    color: color.bone,
    textDecorationLine: 'underline',
    alignSelf: 'flex-start',
  },
})
