import { Tabs } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { AppHeader } from '../../ui/app-header'
import { BottomNav } from '../../ui/bottom-nav'
import { useT } from '../../ui/locale-store'
import { color } from '../../ui/theme'

/** 旧 Web 版 Shell の max-w-md / lg:max-w-6xl（28rem / 72rem） */
const COLUMN_MAX_WIDE = 1152

export default function TabsLayout() {
  const t = useT()
  return (
    // 旧版と同じく中央寄せの列に収める。広い画面で全幅に伸びると図鑑の行が読みにくい
    <View style={[styles.root, { maxWidth: COLUMN_MAX_WIDE }]}>
      {/* ヘッダは Tabs の外に置く。各画面が持つとタブを跨ぐたびに描き直して揺れる */}
      <AppHeader />
      <Tabs
        initialRouteName="index"
        // 既定の 'firstRoute' やとタブ履歴が常に先頭（図鑑）へ潰れて、
        // 保存 → 図で見る → 戻る が図鑑一覧に着陸する（issue #68）。
        // 'fullHistory' なら遷移ごとに履歴が積まれ、戻るは常に直前の画面へ戻る。
        // 'history'（重複除去）は往復で履歴長が変わらず Web では replaceState になって
        // 詳細画面の履歴エントリを壊すので使わん。
        backBehavior="fullHistory"
        tabBar={(props) => <BottomNav {...props} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: color.bg } }}
      >
        {/* 主画面の解剖を左端に置く。戻る=左端からのスワイプという OS の感覚と揃える */}
        <Tabs.Screen name="index" options={{ title: t('tab.anatomy') }} />
        <Tabs.Screen name="catalog" options={{ title: t('tab.catalog') }} />
        <Tabs.Screen name="saved" options={{ title: t('tab.saved') }} />
      </Tabs>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, overflow: 'hidden', width: '100%', alignSelf: 'center', backgroundColor: color.bg },
})
