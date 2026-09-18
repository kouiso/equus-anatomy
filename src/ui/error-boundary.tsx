import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { color, fontSans, fontSansBold, fontSansMedium } from './theme'

type Props = { children: ReactNode }
type State = { error: Error | null }

/**
 * 描画系の例外が上がってきた時、真っ暗のまま落ちる代わりに
 * 再起動の導線を出す。保存データは端末内にあるので再起動すれば戻る。
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[equus] 描画で捕捉した例外:', error, info.componentStack)
  }

  override render() {
    if (this.state.error === null) return this.props.children
    return (
      <View style={styles.root}>
        <Text style={styles.title}>問題が発生しました</Text>
        <Text style={styles.body}>
          画面の描画中に予期しないエラーが起きました。保存した部位や「覚えた」の記録は端末内に残っています。
        </Text>
        <Pressable
          accessibilityRole="button"
          testID="error-reload"
          onPress={() => this.setState({ error: null })}
          style={styles.button}
        >
          <Text style={styles.buttonText}>もう一度開く</Text>
        </Pressable>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.bg,
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
})
