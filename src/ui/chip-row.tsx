import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { chipVisual } from './chip-state'
import { color, fontSans, radius } from './theme'

export type Chip<T extends string> = { id: T; label: string; disabled?: boolean }

export function ChipRow<T extends string>(props: {
  items: readonly Chip<T>[]
  value: T
  onChange: (v: T) => void
  ariaLabel: string
  title?: string
  /** 選択肢が少ない所は折り返して全部見せる。横スクロールは端が切れても手掛かりが無い */
  wrap?: boolean
}) {
  const chips = props.items.map((it) => {
    const disabled = it.disabled ?? false
    // disabled と選択中を同時に成立させない。押せないチップは常に off 見た目
    const visual = chipVisual(it.id === props.value, disabled)
    return (
      <Pressable
        key={it.id}
        testID={`chip-${it.id}`}
        accessibilityRole="radio"
        // accessibilityState は react-native-web が DOM へ出さん。aria-checked は native では state.checked になる
        aria-checked={visual === 'on'}
        accessibilityLabel={it.label}
        disabled={disabled}
        onPress={() => props.onChange(it.id)}
        style={[styles.chip, visual === 'on' ? styles.chipOn : styles.chipOff, visual === 'disabled' ? styles.chipDisabled : null]}
      >
        <Text style={[styles.label, visual === 'on' ? styles.labelOn : styles.labelOff]}>{it.label}</Text>
      </Pressable>
    )
  })
  if (props.wrap) {
    return (
      <View accessibilityRole="radiogroup" accessibilityLabel={props.ariaLabel} style={[styles.content, styles.wrapContent]}>
        {chips}
      </View>
    )
  }
  return (
    <View style={styles.wrapper}>
      {props.title ? <Text style={styles.title}>{props.title}</Text> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        accessibilityRole="radiogroup"
        accessibilityLabel={props.ariaLabel}
        style={styles.row}
        contentContainerStyle={styles.content}
      >
        {chips}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  // 横スクロールが縦に伸びんように flexGrow 0。Web 版の overflow-x-auto と同じ役
  wrapper: {flexDirection:'row',alignItems:'center',flexShrink:0},
  // 幅を固定すると文字拡大時に「場所」が1字ずつ縦に割れる。下限だけ決めて中身に合わせて伸ばす
  title: {fontFamily:fontSans,fontSize:12,color:color.muted,minWidth:44,paddingLeft:12,flexShrink:0},
  row: { flexGrow: 0, flexShrink:1 },
  content: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  wrapContent: { flexWrap: 'wrap' },
  chip: { minHeight: 44, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, justifyContent: 'center' },
  chipOn: { backgroundColor: color.bone },
  chipOff: { backgroundColor: color.raised },
  chipDisabled: { opacity: 0.4 },
  label: { fontFamily: fontSans, fontSize: 14, letterSpacing: 0.35 },
  labelOn: { color: color.accentFg },
  labelOff: { color: color.muted },
})
