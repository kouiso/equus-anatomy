/**
 * 12枚の画像から馬体マスクを作り、ランドマークを実測して JSON に落とす。
 * validate-coords.ts の土台であり、「点が背景に落ちとる」を機械で検出するための材料。
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { coverage, isOnHorse, serialize, silhouetteOf, BLOCK } from './silhouette'

const DIR = 'assets/anatomy'
const OUT = 'src/core/data/silhouettes.json'

type Entry = {
  file: string
  hash: string
  size: { w: number; h: number }
  block: number
  bw: number
  bh: number
  coverage: number
  landmarks: Record<string, [number, number]>
  mask: string
}

function landmarksOf(bits: Uint8Array, bw: number, bh: number): Record<string, [number, number]> {
  const on = (bx: number, by: number) => bits[by * bw + bx] === 1
  const px = (b: number) => b * BLOCK + BLOCK / 2

  let top: [number, number] | null = null
  let left: [number, number] | null = null
  let right: [number, number] | null = null
  let bottom: [number, number] | null = null
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      if (!on(bx, by)) continue
      if (top === null) top = [px(bx), px(by)]
      if (bottom === null || px(by) > bottom[1]) bottom = [px(bx), px(by)]
      if (left === null || px(bx) < left[0]) left = [px(bx), px(by)]
      if (right === null || px(bx) > right[0]) right = [px(bx), px(by)]
    }
  }
  const out: Record<string, [number, number]> = {}
  if (top) out.topmost = top
  if (left) out.leftmost = left
  if (right) out.rightmost = right
  if (bottom) out.bottommost = bottom
  return out
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.jpg')).sort()
const entries: Entry[] = []
for (const file of files) {
  const path = join(DIR, file)
  const mask = silhouetteOf(path)
  const hash = `sha256:${createHash('sha256').update(readFileSync(path)).digest('hex')}`
  const cov = coverage(mask)
  entries.push({
    file,
    hash,
    size: mask.size,
    block: BLOCK,
    bw: mask.bw,
    bh: mask.bh,
    coverage: Math.round(cov * 10000) / 10000,
    landmarks: landmarksOf(mask.bits, mask.bw, mask.bh),
    mask: serialize(mask),
  })
  const l = entries.at(-1)!.landmarks
  console.log(
    `${file.padEnd(20)} ${mask.size.w}x${mask.size.h}  馬体 ${(cov * 100).toFixed(1)}%  ` +
      `上端 ${l.topmost?.join(',')}  左端 ${l.leftmost?.join(',')}  右端 ${l.rightmost?.join(',')}  下端 ${l.bottommost?.join(',')}`,
  )
  // 妥当性の自己チェック: 馬体が画像の 5%未満 / 80%超は抽出失敗
  if (cov < 0.05 || cov > 0.8) {
    console.error(`  !! ${file}: 馬体の占有率が異常。しきい値かフラッドフィルを疑う`)
    process.exitCode = 1
  }
  // 中心付近は必ず馬体のはず（どの向きでも胴か脚が通る）
  if (!isOnHorse(mask, mask.size.w / 2, mask.size.h / 2, 3)) {
    console.error(`  !! ${file}: 画像中心が背景と判定された。抽出失敗の疑い`)
    process.exitCode = 1
  }
}

writeFileSync(OUT, `${JSON.stringify({ generatedFrom: DIR, entries }, null, 0)}\n`)
console.log(`\n${entries.length} 枚 → ${OUT}`)
