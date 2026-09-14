import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { color, fontSans } from '../ui/theme'

export default function NotFound() {
  const router = useRouter()
  // overlay と同じ理由: 静的書き出しの本文と初回レンダーを一致させるため中身はマウント後
  const [mounted, setMounted] = useState(Platform.OS !== 'web')
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return (
    <View style={styles.root}>
      {mounted ? (
        <>
          <Text style={styles.body}>そのページは見つかりませんでした。</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="解剖図へ戻る"
            onPress={() => router.replace('/')}
            style={styles.button}
          >
            <Text style={styles.buttonText}>解剖図へ戻る</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, backgroundColor: color.bg },
  body: { fontFamily: fontSans, fontSize: 15, color: color.fg },
  button: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center', backgroundColor: color.raised, borderRadius: 999 },
  buttonText: { fontFamily: fontSans, fontSize: 13, color: color.muted },
})
