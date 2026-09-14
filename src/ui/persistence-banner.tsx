import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect } from 'react'
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native'
import type { PersistenceState } from './persistence-controller'
import { retryMasteryPersistence, useMastery } from './mastery-store'
import { retrySavedPersistence, useSaved } from './saved-store'
import { color, fontSans, fontSansMedium, radius } from './theme'

function needsRetry(state: PersistenceState<unknown>): boolean {
  return state.phase === 'error' || state.dirty
}

function retryIfNeeded(saved: PersistenceState<unknown>, mastery: PersistenceState<unknown>): void {
  if (needsRetry(saved)) retrySavedPersistence()
  if (needsRetry(mastery)) retryMasteryPersistence()
}

function retryBoth(): void {
  retrySavedPersistence()
  retryMasteryPersistence()
}

/** Call from route screens so returning to a route makes one bounded retry attempt. */
export function usePersistenceRetryOnFocus(): void {
  useFocusEffect(
    useCallback(() => {
      retryBoth()
    }, []),
  )
}

function statusText(label: string, state: PersistenceState<unknown>): string | null {
  if (state.phase === 'error') {
    if (state.problem === 'corrupt') return `${label}の保存データを読み取れません。上書きせず保留しています。`
    if (state.problem === 'read') return `${label}を読み込めません。変更は端末内にまだ保存されていません。`
    return `${label}を端末に保存できませんでした。変更はこの画面には残っています。`
  }
  if (state.dirty) return `${label}を端末に保存しています。`
  return null
}

/** Persistent, non-dismissible warning. Mount once near the app shell. */
export function PersistenceBanner() {
  const { persistence: saved } = useSaved()
  const { persistence: mastery } = useMastery()
  const messages = [statusText('保存した部位', saved), statusText('学習記録', mastery)].filter(
    (message): message is string => message !== null,
  )
  const retryable = needsRetry(saved) || needsRetry(mastery)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') retryBoth()
    })
    return () => subscription.remove()
  }, [])

  if (messages.length === 0) return null
  return (
    <View testID="persistence-banner" accessibilityRole="alert" style={styles.banner}>
      <View style={styles.copy}>
        {messages.map((message) => (
          <Text key={message} style={styles.message}>
            {message}
          </Text>
        ))}
        {retryable ? <Text style={styles.caution}>アプリを閉じると、未保存の変更は失われる可能性があります。</Text> : null}
      </View>
      {retryable ? (
        <Pressable
          testID="persistence-retry"
          accessibilityRole="button"
          accessibilityLabel="端末への保存を再試行"
          onPress={() => retryIfNeeded(saved, mastery)}
          style={styles.retry}
        >
          <Text style={styles.retryText}>再試行</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3a2d18',
    borderBottomWidth: 1,
    borderBottomColor: '#8e7040',
  },
  copy: { flex: 1, gap: 2 },
  message: { fontFamily: fontSansMedium, fontSize: 12, lineHeight: 17, color: color.fg },
  caution: { fontFamily: fontSans, fontSize: 11, lineHeight: 16, color: color.muted },
  retry: {
    minWidth: 64,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: color.bone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: { fontFamily: fontSansMedium, fontSize: 13, color: color.accentFg },
})
