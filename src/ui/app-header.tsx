import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { color, fontDisplayItalic, fontSans, fontSansMedium, trackingBrand } from './theme'

const BRAND_SIZE = 14

/** 全タブ共通のヘッダ。旧 Web 版 Shell の <header> をそのまま持ってきとる。 */
export function AppHeader() {
  const insets = useSafeAreaInsets()
  return (
    <View
      testID="app-header"
      // ノッチの下に潜らんように。Web 版の pt-[max(1rem,env(safe-area-inset-top))] と同じ
      style={[styles.header, { paddingTop: Math.max(16, insets.top) }]}
    >
      <View>
        <Text accessibilityRole="header" style={styles.title}>
          馬体解剖
        </Text>
        <Text style={styles.brand}>EQUUS</Text>
      </View>
      {/* 監修前に「正しい解剖図」と受け取られんように。公開・収益化の段階で監修を入れるまで外さん */}
      <Text testID="demo-note" style={styles.note}>
        学習デモ — 解剖学的正確性は未監修
      </Text>
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
  note: { flexShrink: 1, textAlign: 'right', fontFamily: fontSans, fontSize: 11, lineHeight: 15, color: color.faint },
})
