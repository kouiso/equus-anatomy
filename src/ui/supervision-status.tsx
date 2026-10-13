import { StyleSheet, Text } from 'react-native'
import { STRUCTURES } from '../core/data'
import { SUPERVISION_RECORDS } from '../core/data/supervision'
import { partSupervisionLabel, summarizeSupervision, supervisionOf } from '../core/supervision'
import type { Structure } from '../core/types'
import { useT } from './locale-store'
import { color, fontSans, radius } from './theme'

export const SUPERVISION_SUMMARY = summarizeSupervision(STRUCTURES, SUPERVISION_RECORDS)

/** 部位の詳細に出す監修状態。未監修の部位はそうと読めるように必ず出す。 */
export function PartSupervisionNote(props: { structure: Structure }) {
  const t = useT()
  const supervision = supervisionOf(props.structure, SUPERVISION_RECORDS)
  return (
    <Text
      testID="supervision-status"
      style={[styles.note, supervision.status === 'supervised' ? styles.supervised : null]}
    >
      {partSupervisionLabel(supervision, t)}
    </Text>
  )
}

const styles = StyleSheet.create({
  note: {
    alignSelf: 'flex-start',
    fontFamily: fontSans,
    fontSize: 12,
    lineHeight: 18,
    color: color.muted,
    borderWidth: 1,
    borderColor: color.lineStrong,
    borderRadius: radius.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  supervised: { color: color.bone, borderColor: color.bone },
})
