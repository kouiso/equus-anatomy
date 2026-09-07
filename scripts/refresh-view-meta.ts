/**
 * 各ビューの size / images(ハッシュ) / frame を実測値で書き直す。
 *
 * 画像を差し替えたり切り詰めたりしたら、座標系の寸法もハッシュも変わる。
 * 座標を作るスクリプトごとに書かせると必ずどれかが漏れるので、1箇所に集める。
 * frame は「馬体が占める枠」。正面と後面は絵の中で馬が小さいので、ここを初期表示にする。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { BLOCK } from './silhouette'
import { loadMask } from './debug-render'

type Sil = { entries: { file: string; hash: string; size: { w: number; h: number } }[] }
const sil: Sil = JSON.parse(readFileSync('src/core/data/silhouettes.json', 'utf8'))
const PLATES = [
  ['skin', 'skin'],
  ['muscle-superficial', 'muscle'],
  ['skeleton', 'skeleton'],
  ['organs', 'organs'],
] as const

for (const view of ['left', 'front', 'rear'] as const) {
  const m = loadMask(`muscle_${view}.jpg`)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let by = 0; by < m.bh; by++) {
    for (let bx = 0; bx < m.bw; bx++) {
      if (!m.bits[by * m.bw + bx]) continue
      minX = Math.min(minX, bx * BLOCK)
      minY = Math.min(minY, by * BLOCK)
      maxX = Math.max(maxX, (bx + 1) * BLOCK)
      maxY = Math.max(maxY, (by + 1) * BLOCK)
    }
  }
  const padX = Math.round((maxX - minX) * 0.05)
  const padY = Math.round((maxY - minY) * 0.05)
  const x1 = Math.max(0, minX - padX)
  const y1 = Math.max(0, minY - padY)
  const x2 = Math.min(m.size.w, maxX + padX)
  const y2 = Math.min(m.size.h, maxY + padY)

  const images: Record<string, { src: string; hash: string }> = {}
  for (const [plate, prefix] of PLATES) {
    const e = sil.entries.find((x) => x.file === `${prefix}_${view}.jpg`)
    if (!e) throw new Error(`${prefix}_${view}.jpg が silhouettes.json に無い`)
    images[plate] = { src: `/anatomy/${prefix}_${view}.jpg`, hash: e.hash }
  }

  const path = `src/core/data/regions/${view}.json`
  const file = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        ...file,
        size: m.size,
        images,
        frame: [
          [x1, y1],
          [x2, y1],
          [x2, y2],
          [x1, y2],
        ],
      },
      null,
      2,
    )}\n`,
  )
  console.log(
    `${view.padEnd(6)} ${m.size.w}x${m.size.h}  枠 ${x2 - x1}x${y2 - y1}（幅の ${Math.round(((x2 - x1) / m.size.w) * 100)}%）`,
  )
}
