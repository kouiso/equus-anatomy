import { Pressable, StyleSheet, Text } from 'react-native'
import { ariaPressed } from './aria'
import { useT } from './locale-store'
import { useMastery } from './mastery-store'
import { useSaved } from './saved-store'
import { color, fontSans, radius } from './theme'

/**
 * 保存・覚えたの操作ボタン対。図鑑の詳細と解剖図の部位シートが同じ対を出す。
 * 文言・aria・「保存待ち」の出し分けは変更理由が同じなので、ここ1か所に置く。
 * 並べる枠（余白・折り返し）は呼び出し側が持つ。余白が狭いシートは compact。
 */
export function SaveLearnedButtons(props: { structureId: string; compact?: boolean }) {
  const id = props.structureId
  const { has, toggle, persistence } = useSaved()
  const { learned, mark } = useMastery()
  const t = useT()
  const saved = has(id)
  const isLearned = learned(id)
  const pill = props.compact ? styles.pillCompact : styles.pill
  const saveLabel = saved ? t(persistence.dirty ? 'save.pending' : 'save.saved') : t('save.save')
  const masteryLabel = t(isLearned ? 'mastery.learned' : 'mastery.mark')
  return (
    <>
      <Pressable
        testID="save-toggle"
        accessibilityRole="button"
        accessibilityState={{ selected: saved }}
        {...ariaPressed(saved)}
        accessibilityLabel={saveLabel}
        onPress={() => toggle(id)}
        style={[pill, saved ? styles.pillOn : styles.pillOff]}
      >
        <Text style={[styles.pillText, saved ? styles.pillTextOn : styles.pillTextOff]}>{saveLabel}</Text>
      </Pressable>
      <Pressable
        testID="mastery-toggle"
        accessibilityRole="button"
        accessibilityState={{ selected: isLearned }}
        {...ariaPressed(isLearned)}
        accessibilityLabel={masteryLabel}
        onPress={() => mark(id, !isLearned)}
        style={[pill, isLearned ? styles.pillOn : styles.pillOff]}
      >
        <Text style={[styles.pillText, isLearned ? styles.pillTextOn : styles.pillTextOff]}>{masteryLabel}</Text>
      </Pressable>
    </>
  )
}

const styles = StyleSheet.create({
  pill: { minHeight: 44, flexShrink: 0, borderRadius: radius.pill, paddingHorizontal: 16, justifyContent: 'center' },
  pillCompact: { minHeight: 44, borderRadius: radius.pill, paddingHorizontal: 12, justifyContent: 'center' },
  pillOn: { backgroundColor: color.bone },
  pillOff: { backgroundColor: color.raised },
  pillText: { fontFamily: fontSans, fontSize: 12, letterSpacing: 0.3 },
  pillTextOn: { color: color.accentFg },
  pillTextOff: { color: color.muted },
})
