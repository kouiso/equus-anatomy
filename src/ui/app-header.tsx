import { StyleSheet, Text, View } from 'react-native'
import { usePathname } from 'expo-router'
import { LanguageToggle } from './language-toggle'
import { useT } from './locale-store'
import { useStableTopInset } from './safe-area'
import { color, fontDisplayItalic, fontSans, fontSansMedium, trackingBrand } from './theme'

const BRAND_SIZE = 14

/** 全タブ共通のヘッダ。旧 Web 版 Shell の <header> をそのまま持ってきとる。 */
export function AppHeader() {
  // リロード直後に生の insets が 0 を返しても潜らんよう、退避込みの値を使う (#62)
  const topInset = useStableTopInset()
  const path = usePathname()
  const t = useT()
  const pageName = t(path.startsWith('/catalog') ? 'tab.catalog' : path.startsWith('/saved') ? 'tab.saved' : 'tab.anatomy')
  return (
    <View
      testID="app-header"
      // ノッチの下に潜らんように。Web 版の pt-[max(1rem,env(safe-area-inset-top))] と同じ
      style={[styles.header, { paddingTop: Math.max(16, topInset) }]}
    >
      <View>
        <Text accessibilityRole="header" style={styles.title}>
          {pageName}
        </Text>
        <Text style={styles.brand}>EQUUS</Text>
      </View>
      {/* 監修前に「正しい解剖図」と受け取られんように。公開・収益化の段階で監修を入れるまで外さん */}
      <Text testID="demo-note" style={styles.note}>
        {t('header.demoNote')}
      </Text>
      <LanguageToggle />
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: color.bg,
  },
  title: { fontFamily: fontSansMedium, fontSize: 18, lineHeight: 25, letterSpacing: 0.45, color: color.fg },
  brand: {
    fontFamily: fontDisplayItalic,
    fontStyle: 'italic',
    fontSize: BRAND_SIZE,
    lineHeight: BRAND_SIZE,
    letterSpacing: trackingBrand(BRAND_SIZE),
    color: color.muted,
  },
  note: { flex: 1, textAlign: 'right', fontFamily: fontSans, fontSize: 12, lineHeight: 18, color: color.faint },
})
