/**
 * grok 版の座標を実測マスクに当てて、どれが馬体から外れとったかを数える。
 * validate:coords ゲートの実効性を測るための監査。数字を出さんと「効くはず」で終わる。
 */
import { readFileSync } from 'node:fs'
import { isOnHorse, type Mask } from '../silhouette'

const sil = JSON.parse(readFileSync('src/core/data/silhouettes.json', 'utf8'))
const e = sil.entries.find((x: { file: string }) => x.file === 'muscle_left.jpg')
const mask: Mask = { bw: e.bw, bh: e.bh, size: e.size, bits: new Uint8Array(Buffer.from(e.mask, 'base64')) }
const W = e.size.w
const H = e.size.h

// 実際に画面へ描かれとった大まかな場所のマーカー（anatomy-data.js の d 配列, 単位%）
const REGION_MARKERS: [string, number, number][] = [
  ['頭部', 20, 40], ['頸部', 23.5, 29], ['前肢', 36.5, 72],
  ['体幹', 51, 45], ['後肢', 70, 56], ['尾', 88, 36],
]
// 部位側の座標（描画には使われてへんかったが、同じ書かれ方をした値）
const PART_COORDS: [string, number, number][] = [
  ['皮膚/頭部', 13, 40], ['皮膚/耳介', 20, 22], ['皮膚/頸', 26, 30], ['皮膚/鬐甲', 36, 20],
  ['皮膚/背', 52, 22], ['皮膚/尻', 68, 22], ['皮膚/尾', 88, 32], ['皮膚/胸前', 32, 48],
  ['皮膚/管', 33, 76], ['皮膚/蹄', 33, 93], ['皮膚/飛節', 74, 72],
  ['筋/咬筋', 13, 38], ['筋/腕頭筋', 26, 36], ['筋/僧帽筋', 36, 24], ['筋/上腕三頭筋', 35, 46],
  ['筋/広背筋', 48, 38], ['筋/外腹斜筋', 54, 50], ['筋/中臀筋', 68, 30], ['筋/大腿二頭筋', 72, 44],
  ['筋/腓腹筋', 74, 60],
]

const check = (label: string, rows: [string, number, number][]) => {
  let off = 0
  console.log(`\n【${label}】`)
  for (const [name, xp, yp] of rows) {
    const x = (xp / 100) * W
    const y = (yp / 100) * H
    const on = isOnHorse(mask, x, y, 1)
    if (!on) off++
    console.log(`  ${on ? '  馬体' : '✗ 背景'}  ${name.padEnd(14)} ${xp}%,${yp}% → (${Math.round(x)},${Math.round(y)})`)
  }
  console.log(`  → ${off}/${rows.length} 件が背景に落ちとる`)
  return { off, total: rows.length }
}

const a = check('画面に描かれとったマーカー', REGION_MARKERS)
const b = check('部位側の座標（死んどったデータ）', PART_COORDS)
console.log(
  `\n合計 ${a.off + b.off}/${a.total + b.total} 件を「背景に落ちとる」だけで機械検出できる。` +
    `\n残りは馬体の上には乗っとるが別の部位を指しとる分で、これはシルエットでは判定でけへん（人が見るしかない）。`,
)
