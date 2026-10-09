import { Pressable, StyleSheet, Text } from 'react-native'
import { setLocale, useLocale, useT } from './locale-store'
import { color, fontSans, radius } from './theme'

/**
 * 表示言語の切替。ja / en の2つだけなので、押すと相手の言語へ移る1つのボタンにする。
 * 表示は切替先の言語で書く（読めない言語の画面でも自分の言語の名前は見つけられるように）。
 */
export function LanguageToggle() {
  const locale = useLocale()
  const t = useT()
  const next = locale === 'ja' ? 'en' : 'ja'
  return (
    <Pressable
      testID="language-toggle"
      accessibilityRole="button"
      accessibilityLabel={t('language.toggleLabel')}
      onPress={() => setLocale(next)}
      style={styles.button}
    >
      <Text style={styles.text}>{t('language.toggle')}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    minWidth: 44,
    flexShrink: 0,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: color.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontFamily: fontSans, fontSize: 12, letterSpacing: 0.3, color: color.fg },
})
