import { Link, type Tabs } from 'expo-router'
import type { ComponentProps } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ariaCurrent } from './aria'
import { BookIcon, BookmarkIcon, LayersIcon, QuizIcon } from './icons'
import { color, fontSans } from './theme'

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0]

const TABS = [
  { name: 'catalog', href: '/catalog', label: '図鑑', Icon: BookIcon },
  { name: 'index', href: '/', label: '解剖', Icon: LayersIcon },
  { name: 'quiz', href: '/quiz', label: 'テスト', Icon: QuizIcon },
  { name: 'saved', href: '/saved', label: '保存', Icon: BookmarkIcon },
] as const

/**
 * 旧 Web 版 Shell の <BottomNav>。expo-router の既定タブバーは nav の名前も href も持たんので自前で組む。
 * 図鑑タブの中で詳細を開いとる間も state 上は catalog なので、旧版の fuzzy 一致と同じく 図鑑 が点く。
 */
export function BottomNav(props: TabBarProps) {
  const current = props.state.routes[props.state.index]?.name
  return (
    <View
      testID="bottom-nav"
      role="navigation"
      accessibilityLabel="メイン"
      // ホームバーの下にリンクが潜らんように。Web 版の pb-[max(0.5rem,env(safe-area-inset-bottom))] と同じ
      style={[styles.nav, { paddingBottom: Math.max(8, props.insets.bottom) }]}
    >
      {TABS.map(({ name, href, label, Icon }) => {
        const active = current === name
        return (
          // asChild で Pressable に href を渡す。Link そのままやと Text になって縦並びが組めん
          <Link key={name} href={href} asChild>
            <Pressable testID={`tab-${name}`} accessibilityRole="link" {...ariaCurrent(active)} style={styles.tab}>
              <Icon color={active ? color.fg : color.faint} size={20} />
              <Text style={[styles.label, active ? styles.labelOn : styles.labelOff]}>{label}</Text>
            </Pressable>
          </Link>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: color.line,
    // bg-bg/95
    backgroundColor: 'rgba(11,12,14,0.95)',
    paddingTop: 4,
  },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontFamily: fontSans, fontSize: 12, letterSpacing: 0.3 },
  labelOn: { color: color.fg },
  labelOff: { color: color.faint },
})
