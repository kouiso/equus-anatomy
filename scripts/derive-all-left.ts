/** 左側望の座標を全部作り直す。順番に依存せんよう1本にまとめとく。 */
import { execFileSync } from 'node:child_process'
for (const s of ['derive-areas', 'derive-parts-skin-left', 'derive-parts-left', 'derive-parts-skeleton-left', 'derive-parts-organs-left']) {
  process.stdout.write(execFileSync('pnpm', ['tsx', `scripts/${s}.ts`], { encoding: 'utf8' }).split('\n').slice(-3).join('\n'))
}
