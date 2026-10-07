// 場所→部位への切替で viewBox がズーム先へ飛ぶ。ズーム前の表示を狙った
// 連続タップの 2 タップ目は切替後の座標へ着弾して別の部位を選んでしまうので、
// 切替直後の部位判定には猶予を置く(#67)
// 400ms の根拠: viewBox は updateAnatomy で即座に切替わりズームアニメーションは
// 無い。猶予がカバーするのは「同じ表示を狙った連続タップの間隔」で、短すぎると
// ダブルタップを拾えない。長すぎると意図して素早く部位を選ぶタップまで捨てるので
// 両方の代償を取れる値として置いた。
export const PART_PICK_GUARD_MS = 400

export function pickGuardActive(transitionAt: number | null, now: number): boolean {
  // now < transitionAt は時計の逆行(NTP補正等)。負の差で猶予が張り付かないようにする
  return transitionAt !== null && now >= transitionAt && now - transitionAt < PART_PICK_GUARD_MS
}
