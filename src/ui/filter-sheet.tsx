import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { Chip } from './chip-row'
import { ariaPopup } from './aria'
import { filterButtonLabel } from './filter-label'
import { useT } from './locale-store'
import { color, fontSans, fontSansMedium, radius } from './theme'

/**
 * 絞り込みの1項目。ボタン1つに畳み、押すと選択肢を下から開く（#264）。
 *
 * 下から開くのは RN の Modal にした。iOS・Android・Web で同じコードで動き、Android の戻るボタンと
 * Web の Escape は onRequestClose に来るので、閉じる手段が3つで揃う。一覧はその下で描かれたままなので、
 * 検索語・スクロール位置は開閉で動かない。
 */
export function FilterButton<T extends string>(props: {
  testID: string
  /** 開いた選択肢の画面の testID。閉じるボタンは `${sheetTestID}-close` */
  sheetTestID: string
  title: string
  /** 選択肢の画面の見出し（読み上げ名にも使う） */
  sheetTitle: string
  items: readonly Chip<T>[]
  value: T
  /** 「すべて」の id。効いていない時はボタンに値を出さない */
  allId: T
  onChange: (v: T) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  closeLabel: string
  selectedLabel: string
}) {
  const active = props.value !== props.allId
  const current = props.items.find((it) => it.id === props.value)
  const label = active && current ? `${props.title}: ${current.label}` : props.title
  const t = useT()
  const bottom = useSafeAreaInsets().bottom
  const close = () => props.onOpenChange(false)
  return (
    <>
      <Pressable
        testID={props.testID}
        accessibilityRole="button"
        accessibilityLabel={filterButtonLabel(t, props.sheetTitle, active && current ? current.label : props.items[0]?.label ?? '')}
        // 押すと選択肢の一覧が開く。開いている間は expanded（Modal は別の層に出るので、閉じると false に戻る）
        accessibilityState={{ expanded: props.open }}
        {...ariaPopup(props.open)}
        onPress={() => props.onOpenChange(true)}
        style={[styles.button, active ? styles.buttonOn : styles.buttonOff]}
      >
        <Text style={[styles.buttonText, active ? styles.buttonTextOn : styles.buttonTextOff]}>{label}</Text>
        <Text style={[styles.caret, active ? styles.buttonTextOn : styles.buttonTextOff]}>▾</Text>
      </Pressable>
      <Modal visible={props.open} transparent animationType="slide" onRequestClose={close}>
        <View style={styles.backdrop}>
          {/* 上の暗い所を押しても閉じる。読み上げでは「閉じる」ボタンを使う */}
          <Pressable style={styles.backdropTap} onPress={close} accessible={false} />
          <View testID={props.sheetTestID} style={[styles.sheet, { paddingBottom: Math.max(16, bottom) }]}>
            <Text accessibilityRole="header" style={styles.sheetTitle}>
              {props.sheetTitle}
            </Text>
            <ScrollView accessibilityRole="radiogroup" accessibilityLabel={props.sheetTitle} style={styles.options}>
              {props.items.map((it) => {
                const on = it.id === props.value
                return (
                  <Pressable
                    key={it.id}
                    testID={`filter-option-${it.id}`}
                    accessibilityRole="radio"
                    aria-checked={on}
                    accessibilityLabel={it.label}
                    onPress={() => {
                      props.onChange(it.id)
                      close()
                    }}
                    style={styles.option}
                  >
                    <Text style={styles.optionText}>{it.label}</Text>
                    {on ? (
                      <View style={styles.selected}>
                        <Text style={styles.selectedText}>{props.selectedLabel}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                )
              })}
            </ScrollView>
            <Pressable
              testID={`${props.sheetTestID}-close`}
              accessibilityRole="button"
              accessibilityLabel={props.closeLabel}
              onPress={close}
              style={styles.close}
            >
              <Text style={styles.closeText}>{props.closeLabel}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  button: { minHeight: 44, borderRadius: radius.pill, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  buttonOn: { backgroundColor: color.bone },
  buttonOff: { backgroundColor: color.raised },
  buttonText: { fontFamily: fontSans, fontSize: 14, letterSpacing: 0.35, flexShrink: 1 },
  buttonTextOn: { color: color.accentFg },
  buttonTextOff: { color: color.muted },
  caret: { fontFamily: fontSans, fontSize: 12, lineHeight: 16 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  backdropTap: { flex: 1 },
  sheet: {
    maxHeight: '80%',
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: 20,
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  sheetTitle: { fontFamily: fontSansMedium, fontSize: 15, color: color.fg, paddingHorizontal: 4, paddingBottom: 8 },
  options: { flexGrow: 0 },
  option: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  optionText: { fontFamily: fontSans, fontSize: 14, color: color.fg, flexShrink: 1 },
  selected: { borderWidth: 1, borderColor: color.bone, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  selectedText: { fontFamily: fontSans, fontSize: 11, color: color.bone },
  close: { marginTop: 12, minHeight: 48, borderRadius: radius.pill, borderWidth: 1, borderColor: color.lineStrong, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontFamily: fontSans, fontSize: 14, color: color.fg },
})
