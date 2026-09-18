import {
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_600SemiBold_Italic,
} from '@expo-google-fonts/cormorant-garamond'
import {
  ZenKakuGothicNew_400Regular,
  ZenKakuGothicNew_500Medium,
  ZenKakuGothicNew_700Bold,
} from '@expo-google-fonts/zen-kaku-gothic-new'
import { useFonts } from 'expo-font'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { ErrorBoundary } from '../ui/error-boundary'
import { PersistenceBanner } from '../ui/persistence-banner'
import { color } from '../ui/theme'

// フォントが来るまで OS スプラッシュを保持する。空白 View だと起動直後に暗転だけが見える
SplashScreen.preventAutoHideAsync().catch(() => {})

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ZenKakuGothicNew_400Regular,
    ZenKakuGothicNew_500Medium,
    ZenKakuGothicNew_700Bold,
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_500Medium_Italic,
    CormorantGaramond_600SemiBold_Italic,
  })
  const ready = loaded || error !== null
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {})
  }, [ready])
  // フォント前に描くと代替フォントで一瞬出て化ける。読み込みに失敗した時だけ代替で進める（真っ暗のまま止まらんように）
  if (!ready) return <View style={styles.blank} />

  return (
    // ジェスチャは root にこれが無いと native で一切反応せん
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="light" />
      <PersistenceBanner />
      <ErrorBoundary>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="overlay" options={{ presentation: 'modal', title: '表示・部位の詳細' }} />
        </Stack>
      </ErrorBoundary>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, overflow: 'hidden', backgroundColor: color.bg },
  blank: { flex: 1, backgroundColor: color.bg },
})
