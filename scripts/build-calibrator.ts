/**
 * tools/calibrator を単一 HTML に組む。Artifact として公開して、スマホだけで座標を採るため。
 * 画像は viewBox（1600x1200 等）とは無関係に縮小してよい。<image> が引き伸ばすので座標系は変わらん。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import jpeg from 'jpeg-js'
import { STRUCTURES } from '../src/core/data/structures'
import { AREA_PRESETS } from '../src/core/data/areas'

const OUT = process.argv[2] ?? 'dist-calibrator.html'
const WIDTH = 1000
const QUALITY = 68

function shrink(src: string): Buffer {
  const raw = jpeg.decode(readFileSync(src), { useTArray: true, formatAsRGBA: true })
  const { width: w, height: h, data } = raw
  const outW = WIDTH
  const outH = Math.round((h * outW) / w)
  const out = new Uint8Array(outW * outH * 4)
  const sx = w / outW
  const sy = h / outH
  for (let y = 0; y < outH; y++) {
    const y0 = Math.floor(y * sy)
    const y1 = Math.min(h, Math.ceil((y + 1) * sy))
    for (let x = 0; x < outW; x++) {
      const x0 = Math.floor(x * sx)
      const x1 = Math.min(w, Math.ceil((x + 1) * sx))
      let r = 0
      let g = 0
      let b = 0
      let n = 0
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * w + xx) * 4
          r += data[i]!
          g += data[i + 1]!
          b += data[i + 2]!
          n++
        }
      }
      const o = (y * outW + x) * 4
      out[o] = r / n
      out[o + 1] = g / n
      out[o + 2] = b / n
      out[o + 3] = 255
    }
  }
  return Buffer.from(jpeg.encode({ data: out, width: outW, height: outH }, QUALITY).data)
}

const images: Record<string, string> = {}
for (const layer of ['skin', 'muscle', 'skeleton', 'organs']) {
  for (const view of ['left', 'front', 'rear']) {
    const key = `${layer}_${view}`
    images[key] = shrink(`assets/anatomy/${key}.jpg`).toString('base64')
  }
}

const data = {
  structures: STRUCTURES.map((s) => ({
    id: s.id,
    layer: s.layer,
    depth: s.depth ?? null,
    nameJa: s.nameJa,
    nameLa: s.nameLa,
    region: s.region,
    views: s.views,
  })),
  areas: AREA_PRESETS,
}

const body = readFileSync('tools/calibrator/body.html', 'utf8')
const js = readFileSync('tools/calibrator/script.js', 'utf8')
  .replace('__IMAGES__', JSON.stringify(images))
  .replace('__DATA__', JSON.stringify(data))

writeFileSync(OUT, `${body}\n<script>\n${js}\n</script>\n`)
console.log(`${OUT}  ${(Buffer.byteLength(body + js) / 1024 / 1024).toFixed(2)} MB  画像 ${Object.keys(images).length} 枚`)
