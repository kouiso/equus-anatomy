/** 馬体マスクの構造を測って数字で出す。領域の切り方をここから決める。 */
import { BLOCK } from './silhouette'
import { loadMask, renderDebug } from './debug-render'

const mask = loadMask('muscle_left.jpg')
const { bw, bh } = mask
const on = (bx: number, by: number) => mask.bits[by * bw + bx] === 1
const toPx = (b: number) => b * BLOCK + BLOCK / 2

console.log('=== 列ごとの上端・下端（px、32px 刻み）===')
for (let bx = 0; bx < bw; bx += 4) {
  let top = -1
  let bot = -1
  for (let by = 0; by < bh; by++) if (on(bx, by)) { if (top < 0) top = by; bot = by }
  if (top >= 0) console.log(`x=${String(toPx(bx)).padStart(4)}  上端 ${String(toPx(top)).padStart(4)}  下端 ${String(toPx(bot)).padStart(4)}  高さ ${toPx(bot) - toPx(top)}`)
}

console.log('\n=== 行ごとの馬体の塊（脚の分離を見る）===')
for (const ypx of [420, 500, 560, 600, 640, 700, 780, 860, 940, 1020, 1080]) {
  const by = Math.floor(ypx / BLOCK)
  const runs: [number, number][] = []
  let start = -1
  for (let bx = 0; bx < bw; bx++) {
    if (on(bx, by) && start < 0) start = bx
    if ((!on(bx, by) || bx === bw - 1) && start >= 0) { runs.push([toPx(start), toPx(bx - 1)]); start = -1 }
  }
  console.log(`y=${String(ypx).padStart(4)}  塊 ${runs.length} 個  ${runs.map(([a, b]) => `${a}-${b}`).join('  ')}`)
}

renderDebug({ imageFile: 'muscle_left.jpg', mask, out: 'shots/debug-mask.jpg' })
console.log('\nマスクの縁を shots/debug-mask.jpg に焼いた')
