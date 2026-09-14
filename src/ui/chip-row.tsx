import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { color, fontSans, radius } from './theme'

export type Chip<T extends string> = { id: T; label: string; disabled?: boolean }

export function ChipRow<T extends string>(props: {
  items: readonly Chip<T>[]
  value: T
  onChange: (v: T) => void
  ariaLabel: string
  title?: string
}) {
  return (
    <View style={styles.wrapper}>
      {props.title?<Text style={styles.title}>{props.title}</Text>:null}
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator
      accessibilityRole="radiogroup"
      accessibilityLabel={props.ariaLabel}
      style={styles.row}
      contentContainerStyle={styles.content}
    >
      {props.items.map((it) => {
        const on = it.id === props.value
        const disabled = it.disabled ?? false
        return (
          <Pressable
            key={it.id}
            testID={`chip-${it.id}`}
            accessibilityRole="radio"
            // accessibilityState は react-native-web が DOM へ出さん。aria-checked は native では state.checked になる
            aria-checked={on}
            accessibilityLabel={it.label}
            disabled={disabled}
            onPress={() => props.onChange(it.id)}
            style={[styles.chip, on ? styles.chipOn : styles.chipOff, disabled ? styles.chipDisabled : null]}
          >
            <Text style={[styles.label, on ? styles.labelOn : styles.labelOff]}>{it.label}</Text>
          </Pressable>
        )
      })}
    </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  // 横スクロールが縦に伸びんように flexGrow 0。Web 版の overflow-x-auto と同じ役
  wrapper: {flexDirection:'row',alignItems:'center',flexShrink:0},
  title: {fontFamily:fontSans,fontSize:12,color:color.muted,width:44,paddingLeft:12,flexShrink:0},
  row: { flexGrow: 0, flexShrink:1 },
  content: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  chip: { minHeight: 44, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, justifyContent: 'center' },
  chipOn: { backgroundColor: color.bone },
  chipOff: { backgroundColor: color.raised },
  chipDisabled: { opacity: 0.4 },
  label: { fontFamily: fontSans, fontSize: 14, letterSpacing: 0.35 },
  labelOn: { color: color.accentFg },
  labelOff: { color: color.muted },
})
