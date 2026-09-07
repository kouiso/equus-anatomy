/**
 * 座標ファイルの器を作る。中身（areas / parts）は空。
 * 人が実測して入れるまで空のままにするのが仕様。埋めた気にさせん。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import type { PlateId, View } from '../../src/core/types'

type Sil = { entries: { file: string; hash: string; size: { w: number; h: number } }[] }
const sil: Sil = JSON.parse(readFileSync('src/core/data/silhouettes.json', 'utf8'))
const hashOf = (file: string) => sil.entries.find((e) => e.file === file)
const PLATES: [PlateId, string][] = [
  ['skin', 'skin'],
  ['muscle-superficial', 'muscle'],
  ['skeleton', 'skeleton'],
  ['organs', 'organs'],
]

for (const view of ['left', 'front', 'rear'] as const satisfies readonly View[]) {
  const out = `src/core/data/regions/${view}.json`
  if (existsSync(out)) {
    console.log(`skip ${out}（既にある。人が入れた座標を上書きせん）`)
    continue
  }
  const images: Record<string, { src: string; hash: string }> = {}
  let size = { w: 0, h: 0 }
  for (const [plate, prefix] of PLATES) {
    const file = `${prefix}_${view}.jpg`
    const e = hashOf(file)
    if (!e) throw new Error(`${file} が silhouettes.json に無い`)
    images[plate] = { src: `/anatomy/${file}`, hash: e.hash }
    size = e.size
  }
  writeFileSync(
    out,
    `${JSON.stringify({ view, size, images, measuredOn: 'muscle-superficial', areas: [], parts: [] }, null, 2)}\n`,
  )
  console.log(`${out}  ${size.w}x${size.h}  プレート${Object.keys(images).length}枚  areas 0  parts 0`)
}
console.log('\n深層筋(muscle-deep)の絵は元アプリにも存在せん。無い物は持たせん。')
