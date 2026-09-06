/**
 * 正面・後面の絵を馬体に合わせて切り詰める。
 *
 * 元の絵は馬が幅の 22〜26% にしか写っとらん。そのまま出すとスマホで極小になる。
 * viewBox のアスペクトは画像に合わせとるので、画像を切るのが一番素直な直し方になる。
 * 座標は切った後の画像を基準に取り直すので、この処理は座標を作る前に1回だけ走らせる。
 *
 * 二度切りせんよう、既に切ってあるサイズなら何もせん。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import jpeg from 'jpeg-js'

/** 馬体の外接矩形（scripts/derive-frames.ts の実測）に余白を足した切り取り箱。 */
const CROP: Record<string, { x: number; y: number; w: number; h: number }> = {
  front: { x: 596, y: 8, w: 520, h: 1136 },
  rear: { x: 584, y: 4, w: 560, h: 1144 },
}
const LAYERS = ['skin', 'muscle', 'skeleton', 'organs']

for (const [view, c] of Object.entries(CROP)) {
  for (const layer of LAYERS) {
    const path = `public/anatomy/${layer}_${view}.jpg`
    const raw = jpeg.decode(readFileSync(path), { useTArray: true, formatAsRGBA: true })
    if (raw.width === c.w && raw.height === c.h) {
      console.log(`${layer}_${view}.jpg  切り取り済み`)
      continue
    }
    const out = new Uint8Array(c.w * c.h * 4)
    for (let y = 0; y < c.h; y++) {
      for (let x = 0; x < c.w; x++) {
        const sx = c.x + x
        const sy = c.y + y
        const o = (y * c.w + x) * 4
        if (sx < 0 || sy < 0 || sx >= raw.width || sy >= raw.height) {
          out[o + 3] = 255
          continue
        }
        const i = (sy * raw.width + sx) * 4
        out[o] = raw.data[i]!
        out[o + 1] = raw.data[i + 1]!
        out[o + 2] = raw.data[i + 2]!
        out[o + 3] = 255
      }
    }
    writeFileSync(path, jpeg.encode({ data: Buffer.from(out), width: c.w, height: c.h }, 88).data)
    console.log(`${layer}_${view}.jpg  ${raw.width}x${raw.height} → ${c.w}x${c.h}`)
  }
}
console.log('\n次に: pnpm measure:silhouette → 座標の作り直し')
