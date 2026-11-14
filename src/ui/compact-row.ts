import { useEffect, useState } from 'react'
import { Platform, useWindowDimensions } from 'react-native'
import { isCompactRow } from '../core/compact-row'

/**
 * 図鑑・保存の行を縦積みにするか。Web ではマウントした後にだけ幅で決める。
 *
 * 静的に書き出した HTML は幅 0 で描かれるので、縦積みの style が入る。最初の描画で実際の幅から
 * 横並びを返すと、hydration は食い違った属性を直さず、広い画面で直接開いても縦積みのまま残る（#276）。
 * マウント前は書き出し時と同じ「縦積み」を返し、マウント後に描き直させて style を入れ替える。
 * RN の StyleSheet はメディアクエリを持たないので、iOS / Android と同じ書き方で済むこちらにした。
 * ネイティブには静的書き出しが無いので、最初から幅で決める。
 */
export function useCompactRow(): boolean {
  const { width, fontScale } = useWindowDimensions()
  const [mounted, setMounted] = useState(Platform.OS !== 'web')
  // overlay.tsx の mounted と同じ形。描画の次のフレームで切り替える
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return mounted ? isCompactRow(width, fontScale) : true
}
