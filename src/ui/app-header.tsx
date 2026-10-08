import { Pressable, StyleSheet, Text, View } from 'react-native'
import { usePathname, useRouter } from 'expo-router'
import { InfoIcon } from './icons'
import { useStableTopInset } from './safe-area'
import { SUPERVISION_NOTICE } from './supervision-status'
import { color, fontDisplayItalic, fontSans, fontSansMedium, trackingBrand } from './theme'

const BRAND_SIZE = 14

/** 全タブ共通のヘッダ。旧 Web 版 Shell の <header> をそのまま持ってきとる。 */
export function AppHeader() {
  // リロード直後に生の insets が 0 を返しても潜らんよう、退避込みの値を使う (#62)
  const topInset = useStableTopInset()
  const path = usePathname()
  const router = useRouter()
  const pageName = path.startsWith('/catalog') ? '図鑑' : path.startsWith('/saved') ? '保存' : '解剖'
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
      <View style={styles.trailing}>
        {/* 監修前に「正しい解剖図」と受け取られんように。文言は監修記録（core/data/supervision.ts）から決まる */}
        <Text testID="demo-note" style={styles.note}>
          {SUPERVISION_NOTICE}
        </Text>
        <Pressable
          testID="open-about"
          accessibilityRole="button"
          accessibilityLabel="このアプリについて"
          onPress={() => router.push('/about')}
          style={styles.about}
        >
          <InfoIcon color={color.muted} size={20} />
        </Pressable>
      </View>
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
  trailing: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  // 44pt のタップ域は確保しつつ、ヘッダの高さは押し広げない
  about: { width: 44, height: 44, marginRight: -12, marginVertical: -6, alignItems: 'center', justifyContent: 'center' },
  note: { flexShrink: 1, textAlign: 'right', fontFamily: fontSans, fontSize: 12, lineHeight: 18, color: color.faint },
})
