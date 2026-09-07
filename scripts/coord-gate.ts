/**
 * 座標ゲートの本体。CLI から切り離してテストできるようにしとる。
 * 「測られてへん座標」を弾くのが仕事で、これが緑やからといって解剖学的に正しいとは限らん。
 */
import { BLOCK, isOnHorse, type Mask } from './silhouette'
import { area, centroid } from '../src/core/geometry'
import type { Point, Polygon } from '../src/core/types'

export type Problem = { level: 'error' | 'note'; message: string }

export function checkPolygon(args: {
  mask: Mask
  size: { w: number; h: number }
  kind: string
  id: string
  points: Polygon
}): Problem[] {
  const { mask, size, kind, id, points } = args
  const where = `${kind} ${id}`
  const out: Problem[] = []
  const err = (m: string) => out.push({ level: 'error', message: `${where}: ${m}` })

  if (points.length < 3) {
    err(`頂点が ${points.length} 個。多角形になってへん`)
    return out
  }
  if (area(points) < BLOCK * BLOCK) err('面積が小さすぎる（誤クリックの疑い）')

  const outside = points.filter(([x, y]) => !isOnHorse(mask, x, y, 2))
  // 輪郭をなぞると縁が少しはみ出るのは正常。過半数が外なら測ってへん。
  if (outside.length > points.length / 2) {
    err(`頂点 ${outside.length}/${points.length} が馬体の外。測られてへん座標の疑い`)
  }
  const c: Point = centroid(points)
  if (!isOnHorse(mask, c[0], c[1], 1)) {
    err(`重心 (${Math.round(c[0])},${Math.round(c[1])}) が馬体の外`)
  }
  for (const [x, y] of points) {
    if (x < 0 || y < 0 || x > size.w || y > size.h) {
      err(`頂点 (${x},${y}) が画像の外`)
      break
    }
  }
  return out
}

export function maskFromEntry(e: { bw: number; bh: number; size: { w: number; h: number }; mask: string }): Mask {
  return { bw: e.bw, bh: e.bh, size: e.size, bits: new Uint8Array(Buffer.from(e.mask, 'base64')) }
}
