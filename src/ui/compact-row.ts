import { useSyncExternalStore } from 'react'
import { useWindowDimensions } from 'react-native'
import { isCompactRow } from '../core/compact-row'

const subscribe = () => () => {}

/**
 * 図鑑・保存の行を縦積みにするか。Web の hydration 中だけは、書き出し時と同じ「縦積み」を返す。
 *
 * 静的に書き出した HTML は幅 0 で描かれるので、縦積みの style が入る。hydration の最初の描画で
 * 実際の幅から横並びを返すと、React は食い違った属性を直さず、広い画面で直接開いても縦積みのまま残る（#276）。
 * useSyncExternalStore は hydration 中だけ getServerSnapshot（false）を使い、終わると getSnapshot（true）で
 * 描き直すので、style が入れ替わる。hydration を通らない描画（タブで移った時・ネイティブ）は最初から幅で決まり、
 * 縦積みの1フレームが挟まらない。
 * RN の StyleSheet はメディアクエリを持たないので、iOS / Android と同じ書き方で済むこちらにした。
 */
export function useCompactRow(): boolean {
  const { width, fontScale } = useWindowDimensions()
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
  return hydrated ? isCompactRow(width, fontScale) : true
}
