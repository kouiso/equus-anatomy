/**
 * e2e 用のフィクスチャ座標を作る。
 *
 * 【重要】これは解剖学的に正しい座標やない。仕組みが動くことを確かめるためだけの当て物で、
 * src/core/data/regions/ には絶対に入れん。本物の座標は人が実測して入れる。
 * 位置は実測マスクを見て「確実に馬体の上」に置いとるので、validate:coords も通る。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { isOnHorse, type Mask } from './silhouette'

const sil = JSON.parse(readFileSync('src/core/data/silhouettes.json', 'utf8'))
const e = sil.entries.find((x: { file: string }) => x.file === 'muscle_left.jpg')
const mask: Mask = { bw: e.bw, bh: e.bh, size: e.size, bits: new Uint8Array(Buffer.from(e.mask, 'base64')) }

const HALF = 34 // フィクスチャの四角の半辺（px）

/** 指定の狙い位置から一番近い「馬体の上」の点を探す。当て物でも背景には置かん。 */
function nearestOnHorse(cx: number, cy: number): [number, number] | null {
  for (let r = 0; r <= 400; r += 8) {
    for (let a = 0; a < 32; a++) {
      const t = (a / 32) * Math.PI * 2
      const x = Math.round(cx + Math.cos(t) * r)
      const y = Math.round(cy + Math.sin(t) * r)
      if (x - HALF < 0 || y - HALF < 0 || x + HALF > mask.size.w || y + HALF > mask.size.h) continue
      const corners: [number, number][] = [
        [x - HALF, y - HALF],
        [x + HALF, y - HALF],
        [x + HALF, y + HALF],
        [x - HALF, y + HALF],
      ]
      if (corners.every(([px, py]) => isOnHorse(mask, px, py, 0)) && isOnHorse(mask, x, y, 0)) return [x, y]
    }
  }
  return null
}

// 互いに離れた12点。タップ判定が別々の部位を返すことを確かめられる配置にする。
const TARGETS: [string, number, number][] = [
  ['muscle-masseter', 230, 240],
  ['muscle-splenius', 430, 290],
  ['muscle-brachiocephalicus', 470, 430],
  ['muscle-trapezius', 640, 330],
  ['muscle-supraspinatus', 560, 470],
  ['muscle-triceps', 600, 600],
  ['muscle-latissimus', 800, 480],
  ['muscle-oblique', 900, 600],
  ['muscle-gluteus', 1120, 400],
  ['muscle-biceps-femoris', 1230, 560],
  ['muscle-gastrocnemius', 1200, 720],
  ['muscle-ecr', 630, 800],
]

const shapes = TARGETS.flatMap(([id, cx, cy]) => {
  const c = nearestOnHorse(cx, cy)
  if (!c) {
    console.warn(`${id}: 馬体上に置ける場所が見つからんかった。飛ばす`)
    return []
  }
  const [x, y] = c
  return [
    {
      kind: 'part' as const,
      id,
      points: [
        [x - HALF, y - HALF],
        [x + HALF, y - HALF],
        [x + HALF, y + HALF],
        [x - HALF, y + HALF],
      ],
    },
  ]
})

writeFileSync('e2e/fixtures/draft.json', `${JSON.stringify({ left: shapes }, null, 2)}\n`)
console.log(`${shapes.length}/${TARGETS.length} 件を e2e/fixtures/draft.json へ（全部マスク上で馬体判定済み）`)
for (const s of shapes) {
  const p = s.points[0]!
  console.log(`  ${s.id.padEnd(28)} 左上(${p[0]},${p[1]})`)
}
