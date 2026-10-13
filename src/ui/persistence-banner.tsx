import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect } from 'react'
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native'
import type { Translator } from '../core/i18n'
import { useT } from './locale-store'
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

function statusText(t: Translator, label: string, state: PersistenceState<unknown>): string | null {
  if (state.phase === 'error') {
    if (state.problem === 'corrupt') return t('persistence.corrupt', { label })
    if (state.problem === 'read') return t('persistence.read', { label })
    return t('persistence.write', { label })
  }
  if (state.dirty) return t('persistence.saving', { label })
  return null
}

/** Persistent, non-dismissible warning. Mount once near the app shell. */
export function PersistenceBanner() {
  const { persistence: saved } = useSaved()
  const { persistence: mastery } = useMastery()
  const t = useT()
  const messages = [
    statusText(t, t('persistence.savedLabel'), saved),
    statusText(t, t('persistence.masteryLabel'), mastery),
  ].filter(
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
    <View testID="persistence-banner" accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.banner}>
      <View style={styles.copy}>
        {messages.map((message) => (
          <Text key={message} style={styles.message}>
            {message}
          </Text>
        ))}
        {retryable ? <Text style={styles.caution}>{t('persistence.caution')}</Text> : null}
      </View>
      {retryable ? (
        <Pressable
          testID="persistence-retry"
          accessibilityRole="button"
          accessibilityLabel={t('persistence.retryLabel')}
          onPress={() => retryIfNeeded(saved, mastery)}
          style={styles.retry}
        >
          <Text style={styles.retryText}>{t('persistence.retry')}</Text>
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
