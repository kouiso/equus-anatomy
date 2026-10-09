import type { HorseMask, Point, ViewBox } from './types'

/**
 * プレート JPEG から実測した「馬体が描かれとる範囲」のビットマップを触る道具。
 * scripts/measure-silhouette.ts が縁からのフラッドフィルで作った値を
 * src/core/data/silhouettes.json が持っとる。矩形（外接枠・部位 union の bbox）と
 * 違って、脚の間や首の下の黒い凹みはちゃんと「外」になる。
 */

/** base64 → bytes。実行環境（Hermes/web/node）どれでも動くよう自前で引く。 */
export function decodeBits(b64: string): Uint8Array {
  const table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  const out: number[] = []
  let acc = 0
  let nbits = 0
  for (const ch of b64) {
    const v = table.indexOf(ch)
    if (v < 0) continue // '=' や改行は捨てる
    acc = (acc << 6) | v
    nbits += 6
    if (nbits >= 8) {
      nbits -= 8
      out.push((acc >> nbits) & 0xff)
    }
  }
  return new Uint8Array(out)
}

export function makeMask(args: {
  block: number
  bw: number
  bh: number
  size: { readonly w: number; readonly h: number }
  bits: Uint8Array
}): HorseMask {
  return { block: args.block, bw: args.bw, bh: args.bh, size: args.size, bits: args.bits }
}

/** 同じ寸法のマスクをいくつでも足し合わせる（どれかの層で絵があれば馬体）。 */
export function unionMasks(masks: readonly HorseMask[]): HorseMask | null {
  const first = masks[0]
  if (first === undefined) return null
  const bits = new Uint8Array(first.bits)
  for (const m of masks.slice(1)) {
    if (m.bw !== first.bw || m.bh !== first.bh || m.block !== first.block) {
      throw new Error('unionMasks: 寸法の違うマスクは足せん')
    }
    for (let i = 0; i < bits.length; i++) bits[i]! |= m.bits[i]!
  }
  return { ...first, bits }
}

/** 右側望は左側望の絵を左右反転して使うので、マスクも同じく反転する。 */
export function flipMaskX(mask: HorseMask): HorseMask {
  const bits = new Uint8Array(mask.bits.length)
  for (let y = 0; y < mask.bh; y++) {
    for (let x = 0; x < mask.bw; x++) {
      bits[y * mask.bw + x] = mask.bits[y * mask.bw + (mask.bw - 1 - x)]!
    }
  }
  return { ...mask, bits }
}

/** 座標が馬体の上か。ブロック単位の実測値そのままで見る。 */
export function onHorse(mask: HorseMask, x: number, y: number): boolean {
  const bx = Math.floor(x / mask.block)
  const by = Math.floor(y / mask.block)
  if (bx < 0 || by < 0 || bx >= mask.bw || by >= mask.bh) return false
  return mask.bits[by * mask.bw + bx] === 1
}

/**
 * (x, y) に一番近い馬体ブロックを探す。
 * 見つかったブロックの中で (x, y) に一番近い点を返す（ブロック中心への
 * 吸着やと数px分跳ぶので、クランプの動きを滑らかにする）。
 * maxRadius ブロック以内に馬体が無ければ null。
 *
 * within を渡すと「その矩形と交わる馬体ブロック」だけを候補にし、
 * 返す点も必ず within の中に入れる。viewBox の中心として実現できる
 * 点だけを選びたい時に使う（画像の外へは出られんので）。
 */
export function nearestOnHorse(mask: HorseMask, x: number, y: number, within?: ViewBox, maxRadius = 96): Point | null {
  const bx = Math.floor(x / mask.block)
  const by = Math.floor(y / mask.block)
  const on = (ix: number, iy: number) =>
    ix >= 0 && iy >= 0 && ix < mask.bw && iy < mask.bh && mask.bits[iy * mask.bw + ix] === 1
  const accept = (ix: number, iy: number) => {
    if (!on(ix, iy)) return false
    if (within === undefined) return true
    // ブロック矩形が within と交わる = その中に within 内の点がある
    return (
      ix * mask.block + mask.block > within.x &&
      ix * mask.block < within.x + within.w &&
      iy * mask.block + mask.block > within.y &&
      iy * mask.block < within.y + within.h
    )
  }
  const pointIn = (ix: number, iy: number): Point => {
    const loX = ix * mask.block
    const loY = iy * mask.block
    const hiX = Math.min(loX + mask.block - 1, within === undefined ? Infinity : within.x + within.w)
    const hiY = Math.min(loY + mask.block - 1, within === undefined ? Infinity : within.y + within.h)
    const minX = within === undefined ? loX : Math.max(loX, within.x)
    const minY = within === undefined ? loY : Math.max(loY, within.y)
    return [Math.min(Math.max(x, minX), hiX), Math.min(Math.max(y, minY), hiY)]
  }
  if (accept(bx, by)) return pointIn(bx, by)
  for (let r = 1; r <= maxRadius; r++) {
    let best: { dx: number; dy: number; d2: number } | null = null
    // チェビシェフ距離 r の輪っか。内側の輪の方が必ず近いので、最初に
    // 見つかった輪の中でユークリッド距離最小を取れば最近傍になる。
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
        if (!accept(bx + dx, by + dy)) continue
        const d2 = dx * dx + dy * dy
        if (best === null || d2 < best.d2) best = { dx, dy, d2 }
      }
    }
    if (best !== null) return pointIn(bx + best.dx, by + best.dy)
  }
  return null
}
