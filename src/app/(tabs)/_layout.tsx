import { Tabs } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { AppHeader } from '../../ui/app-header'
import { BottomNav } from '../../ui/bottom-nav'
import { color } from '../../ui/theme'

/** 旧 Web 版 Shell の max-w-md / lg:max-w-6xl（28rem / 72rem） */
const COLUMN_MAX_WIDE = 1152

export default function TabsLayout() {
  return (
    // 旧版と同じく中央寄せの列に収める。広い画面で全幅に伸びると図鑑の行が読みにくい
    <View style={[styles.root, { maxWidth: COLUMN_MAX_WIDE }]}>
      {/* ヘッダは Tabs の外に置く。各画面が持つとタブを跨ぐたびに描き直して揺れる */}
      <AppHeader />
      <Tabs
        initialRouteName="index"
        tabBar={(props) => <BottomNav {...props} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.bg } }}
      >
        <Tabs.Screen name="catalog" options={{ title: '図鑑' }} />
        <Tabs.Screen name="index" options={{ title: '解剖' }} />
        <Tabs.Screen name="saved" options={{ title: '保存' }} />
      </Tabs>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, overflow: 'hidden', width: '100%', alignSelf: 'center', backgroundColor: color.bg },
})
