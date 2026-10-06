/**
 * in-place リロード（端末のフォントサイズ変更等による Activity 再生成 + JS リロード）の直後に
 * react-native-safe-area-context のプロバイダが insets.top=0 を返し続ける既知の不具合 (#62) への退避。
 *
 * 0 は「まだ測れてへん」扱いにして、直前に観測した実測値か端末定数の推定値に退避する。
 * portrait 固定でステータスバーも隠さんアプリなので、正の値が来たらそれを正として記憶し直す。
 * react-native に依存せん純粋なロジックだけここに置く（node の vitest で検証するため）。
 */
export class TopInsetMemory {
  private last = 0

  /**
   * @param measured プロバイダが返した insets.top
   * @param platformEstimate 端末定数からの推定値（Android: StatusBar.currentHeight、iOS: initialWindowMetrics）
   * @returns 使うべき top inset。measured > 0 ならそれを記憶して返す。0 なら記憶値と推定値の大きい方へ退避。
   */
  resolve(measured: number, platformEstimate = 0): number {
    if (measured > 0) {
      this.last = measured
      return measured
    }
    return Math.max(this.last, platformEstimate)
  }
}
