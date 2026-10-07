// 場所→部位への切替で viewBox がズーム先へ飛ぶ。ズーム前の表示を狙った
// 連続タップの 2 タップ目は切替後の座標へ着弾して別の部位を選んでしまうので、
// 切替直後の部位判定には猶予を置く(#67)
export const PART_PICK_GUARD_MS = 400

export function pickGuardActive(transitionAt: number | null, now: number): boolean {
  return transitionAt !== null && now - transitionAt < PART_PICK_GUARD_MS
}
