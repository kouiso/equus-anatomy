import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import { appInfo, CONTACT_URL, openExternal } from './about-info'
import { formatCrashReport } from './crash-report'
import { translateNow } from './locale-store'
import { color, fontSans, fontSansBold, fontSansMedium, radius } from './theme'

type Props = { children: ReactNode }
type CopyState = 'idle' | 'copied' | 'failed'
type State = { error: unknown; caught: boolean; occurredAt: Date | null; componentStack: string | null; copy: CopyState }

const INITIAL: State = { error: null, caught: false, occurredAt: null, componentStack: null, copy: 'idle' }

/**
 * 描画系の例外が上がってきた時、真っ暗のまま落ちる代わりに
 * 再起動の導線を出す。保存データは端末内にあるので再起動すれば戻る。
 * 診断テキストは画面に出して利用者がコピー・共有するだけで、どこへも送らん（収集ゼロ）。
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = INITIAL

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error, caught: true, occurredAt: new Date(), copy: 'idle' }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[equus] 描画で捕捉した例外:', error, info.componentStack)
    this.setState({ componentStack: info.componentStack ?? null })
  }

  private report(): string {
    const info = appInfo()
    return formatCrashReport({
      error: this.state.error,
      appName: info.name,
      version: info.version,
      buildNumber: info.buildNumber,
      platform: info.platform,
      occurredAt: this.state.occurredAt ?? new Date(),
      componentStack: this.state.componentStack,
    })
  }

  private copyReport = async () => {
    const text = this.report()
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(text)
        this.setState({ copy: 'copied' })
      } else {
        await Share.share({ message: text })
      }
    } catch {
      this.setState({ copy: 'failed' })
    }
  }

  override render() {
    if (!this.state.caught) return this.props.children
    const report = this.report()
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.root} testID="error-screen">
        <Text accessibilityRole="header" style={styles.title}>
          {translateNow('error.title')}
        </Text>
        <Text style={styles.body}>{translateNow('error.body')}</Text>
        <Pressable
          accessibilityRole="button"
          testID="error-reload"
          onPress={() => this.setState(INITIAL)}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{translateNow('error.reload')}</Text>
        </Pressable>

        <View style={styles.details}>
          <Text style={styles.detailsTitle}>{translateNow('error.details')}</Text>
          <Text style={styles.detailsNote}>{translateNow('error.detailsNote')}</Text>
          <Text selectable testID="crash-details" style={styles.detailsText}>
            {report}
          </Text>
          <View style={styles.row}>
            <Pressable accessibilityRole="button" testID="crash-copy" onPress={this.copyReport} style={styles.secondary}>
              <Text style={styles.secondaryText}>
                {Platform.OS === 'web' ? translateNow('error.copy') : translateNow('error.share')}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="link" onPress={() => openExternal(CONTACT_URL)} style={styles.secondary}>
              <Text style={styles.secondaryText}>{translateNow('error.contact')}</Text>
            </Pressable>
          </View>
          {this.state.copy === 'copied' ? (
            <Text accessibilityLiveRegion="polite" style={styles.detailsNote}>
              {translateNow('error.copied')}
            </Text>
          ) : null}
          {this.state.copy === 'failed' ? (
            <Text accessibilityLiveRegion="polite" style={styles.detailsNote}>
              {translateNow('error.copyFailed')}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    )
  }
}

type ProbeGlobal = { __EQUUS_CRASH_PROBE__?: unknown }

/**
 * クラッシュ画面の e2e・実写確認用。globalThis.__EQUUS_CRASH_PROBE__ を立てた時だけ描画中に投げる。
 * 本番のコードはこのフラグを立てないので、テストが addInitScript で立てん限り何もしない。
 */
export function CrashProbe() {
  if ((globalThis as ProbeGlobal).__EQUUS_CRASH_PROBE__ === true) {
    throw new Error('クラッシュ画面の確認用に投げた例外')
  }
  return null
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: color.bg },
  root: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  title: { color: color.fg, fontFamily: fontSansBold, fontSize: 20 },
  body: { color: color.muted, fontFamily: fontSans, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  button: {
    backgroundColor: color.bone,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonText: { color: color.accentFg, fontFamily: fontSansMedium, fontSize: 15 },
  details: {
    alignSelf: 'center',
    maxWidth: 640,
    width: '100%',
    gap: 8,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
  },
  detailsTitle: { color: color.fg, fontFamily: fontSansMedium, fontSize: 14 },
  detailsNote: { color: color.muted, fontFamily: fontSans, fontSize: 12, lineHeight: 18 },
  detailsText: {
    color: color.fg,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 12,
    lineHeight: 18,
    padding: 12,
    borderRadius: radius.card,
    backgroundColor: color.raised,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  secondary: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: color.raised,
  },
  secondaryText: { color: color.fg, fontFamily: fontSans, fontSize: 13 },
})
