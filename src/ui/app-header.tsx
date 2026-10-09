import { Pressable, StyleSheet, Text, View } from 'react-native'
import { usePathname, useRouter } from 'expo-router'
import { InfoIcon } from './icons'
import { LanguageToggle } from './language-toggle'
import { useT } from './locale-store'
import { useStableTopInset } from './safe-area'
import { supervisionNotice } from '../core/supervision'
import { SUPERVISION_SUMMARY } from './supervision-status'
import { color, fontDisplayItalic, fontSans, fontSansMedium, trackingBrand } from './theme'

const BRAND_SIZE = 14

/** 全タブ共通のヘッダ。旧 Web 版 Shell の <header> をそのまま持ってきとる。 */
export function AppHeader() {
  // リロード直後に生の insets が 0 を返しても潜らんよう、退避込みの値を使う (#62)
  const topInset = useStableTopInset()
  const path = usePathname()
  const router = useRouter()
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
      <View style={styles.trailing}>
        {/* 監修前に「正しい解剖図」と受け取られんように（文言は監修記録から決まる）。全文は About へ。文字拡大で何行にも割れるとヘッダが画面を食い尽くすので2行まで */}
        <Text testID="demo-note" numberOfLines={2} style={styles.note}>
          {supervisionNotice(SUPERVISION_SUMMARY, t)}
        </Text>
        <LanguageToggle />
        <Pressable
          testID="open-about"
          accessibilityRole="button"
          accessibilityLabel={t('about.screenTitle')}
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
    // 文字が大きい環境では trailing（注記+言語切替+About）をタイトル行の下へ折り返す。
    // 折り返さんと注記が数文字幅で縦に積まれてヘッダが画面を食い尽くす（#66 再発）
    flexWrap: 'wrap',
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
