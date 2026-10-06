import { describe, expect, it } from 'vitest'
import { makeMask, onHorse } from './mask'
import { MAX_ZOOM, clamp, fit, pan, pinch, scaleOf, zoomAt, zoomByStep, zoomToPolygon, zoomToPolygons } from './zoom'
import type { HorseMask, Point, Polygon, Size } from './types'

const size: Size = { w: 1600, h: 1200 }
const aspect = size.w / size.h

/** on(bx,by) が true のブロックを立てただけの試験用マスク（8px ブロック）。 */
const maskFrom = (on: (bx: number, by: number) => boolean): HorseMask => {
  const bw = size.w / 8
  const bh = size.h / 8
  const bits = new Uint8Array(bw * bh)
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      if (on(x, y)) bits[y * bw + x] = 1
    }
  }
  return makeMask({ block: 8, bw, bh, size, bits })
}

const centerOn = (mask: HorseMask, vb: { x: number; y: number; w: number; h: number }) =>
  onHorse(mask, vb.x + vb.w / 2, vb.y + vb.h / 2)

describe('fit', () => {
  it('画像全体', () => expect(fit(size)).toEqual({ x: 0, y: 0, w: 1600, h: 1200 }))
})

describe('clamp', () => {
  it('アスペクトを画像に固定する', () => {
    const vb = clamp({ x: 0, y: 0, w: 800, h: 999 }, size)
    expect(vb.w / vb.h).toBeCloseTo(aspect, 9)
  })
  it('画像の外へ出さん', () => {
    const vb = clamp({ x: -500, y: -500, w: 800, h: 600 }, size)
    expect(vb.x).toBe(0)
    expect(vb.y).toBe(0)
  })
  it('右下もはみ出さん', () => {
    const vb = clamp({ x: 5000, y: 5000, w: 800, h: 600 }, size)
    expect(vb.x + vb.w).toBeLessThanOrEqual(size.w)
    expect(vb.y + vb.h).toBeLessThanOrEqual(size.h)
  })
  it('全体より引けん', () => {
    expect(clamp({ x: 0, y: 0, w: 99999, h: 99999 }, size).w).toBe(size.w)
  })
  it('上限を超えて寄れん', () => {
    expect(scaleOf(clamp({ x: 800, y: 600, w: 1, h: 1 }, size), size)).toBeLessThanOrEqual(MAX_ZOOM)
  })
})

describe('clamp の馬体制限（#65: ズーム中にパンすると全面黒）', () => {
  /**
   * 左側望を模した形。馬体はほぼ全面だが、脚の間・首の下に黒い凹みがある。
   * この凹みは外接矩形（frame）や部位 union の bbox の「内側」なので、
   * 矩形への clamp では真っ黒な画面を防げん。
   */
  const horse = maskFrom(
    (bx, by) => bx >= 12 && bx <= 183 && by >= 5 && by <= 138 && !(bx >= 18 && bx <= 70 && by >= 55 && by <= 130),
  )

  it('上限ズームで四端までパンしても、画面中心は馬体の上に留まる', () => {
    let vb = fit(size)
    for (let i = 0; i < 12; i++) vb = zoomByStep(vb, 1.6, size, horse)
    for (const [dx, dy] of [
      [1e6, 0],
      [-1e6, 0],
      [0, 1e6],
      [0, -1e6],
      [1e6, 1e6],
      [-1e6, -1e6],
      [1e6, -1e6],
      [-1e6, 1e6],
    ] as const) {
      const after = pan(vb, dx, dy, size, horse)
      expect(centerOn(horse, after), `center of ${JSON.stringify(after)}`).toBe(true)
    }
  })

  it('黒い凹みの中へパンしても、中心は凹みの縁で止まる', () => {
    // (400,700) は凹みブロック (50,87) の中。矩形クランプなら素通りする
    const after = clamp({ x: 300, y: 625, w: 200, h: 150 }, size, horse)
    expect(centerOn(horse, after)).toBe(true)
    // 一番近い馬体（凹みの縁）へ寄るので、移動は最小限になる
    expect(after.x + after.w / 2).toBeGreaterThanOrEqual(568) // 凹みの右縁 (bx=71)*8
  })

  it('ピンチでも同じ制限が効く（ピンチ連続でも真っ黒に到達できた）', () => {
    let vb = fit(size)
    for (let i = 0; i < 30; i++) vb = pinch(vb, [160, 600], 1.5, size, horse)
    expect(centerOn(horse, vb)).toBe(true)
  })

  it('全面が馬体なら、マスクは画像矩形と同じ制限に落ちる', () => {
    const full = maskFrom(() => true)
    const vb = clamp({ x: -500, y: -500, w: 800, h: 600 }, size, full)
    expect(vb).toEqual({ x: 0, y: 0, w: 800, h: 600 })
  })

  it('マスクを渡さん時は今までどおり画像矩形だけで制限する', () => {
    const vb = clamp({ x: 300, y: 625, w: 200, h: 150 }, size)
    expect(vb).toEqual({ x: 300, y: 625, w: 200, h: 150 })
  })
})

describe('zoomAt', () => {
  it('アンカーは画面上の同じ相対位置に留まる', () => {
    const start = { x: 0, y: 0, w: 1600, h: 1200 }
    const anchor: Point = [400, 300]
    const relBefore = [(anchor[0] - start.x) / start.w, (anchor[1] - start.y) / start.h]
    const after = zoomAt(start, anchor, 2, size)
    const relAfter = [(anchor[0] - after.x) / after.w, (anchor[1] - after.y) / after.h]
    expect(relAfter[0]).toBeCloseTo(relBefore[0]!, 6)
    expect(relAfter[1]).toBeCloseTo(relBefore[1]!, 6)
  })

  it('端でクランプが効いた時もアスペクトは崩れん', () => {
    const after = zoomAt({ x: 0, y: 0, w: 1600, h: 1200 }, [0, 0], 4, size)
    expect(after.w / after.h).toBeCloseTo(aspect, 9)
  })

  it('倍率どおりに寄る', () => {
    expect(scaleOf(zoomAt(fit(size), [800, 600], 2, size), size)).toBeCloseTo(2, 6)
  })
})

describe('zoomByStep', () => {
  it('3回押しても上限で止まる', () => {
    let vb = fit(size)
    for (let i = 0; i < 10; i++) vb = zoomByStep(vb, 1.6, size)
    expect(scaleOf(vb, size)).toBeLessThanOrEqual(MAX_ZOOM + 1e-9)
    expect(vb.w / vb.h).toBeCloseTo(aspect, 9)
  })
})

describe('zoomToPolygon', () => {
  const neck: Polygon = [
    [300, 260],
    [620, 260],
    [620, 430],
    [300, 430],
  ]
  it('その領域が viewBox の中に完全に入る', () => {
    const vb = zoomToPolygon(neck, size)
    expect(vb.x).toBeLessThanOrEqual(300)
    expect(vb.y).toBeLessThanOrEqual(260)
    expect(vb.x + vb.w).toBeGreaterThanOrEqual(620)
    expect(vb.y + vb.h).toBeGreaterThanOrEqual(430)
  })
  it('アスペクトは画像のまま', () => {
    const vb = zoomToPolygon(neck, size)
    expect(vb.w / vb.h).toBeCloseTo(aspect, 9)
  })
})

describe('pan', () => {
  it('指の動きと逆向きに viewBox が動く（絵は指についてくる）', () => {
    const vb = pan({ x: 400, y: 300, w: 800, h: 600 }, 100, 0, size)
    expect(vb.x).toBe(300)
  })
  it('全体表示では動かせん', () => {
    expect(pan(fit(size), 100, 100, size)).toEqual(fit(size))
  })
})

describe('pinch', () => {
  it('比が 0 以下や NaN でも壊れん', () => {
    const vb = { x: 0, y: 0, w: 800, h: 600 }
    expect(pinch(vb, [400, 300], 0, size)).toEqual(vb)
    expect(pinch(vb, [400, 300], Number.NaN, size)).toEqual(vb)
  })
  it('広げたら寄る', () => {
    expect(scaleOf(pinch(fit(size), [800, 600], 2, size), size)).toBeCloseTo(2, 6)
  })
})

describe('zoomToPolygons', () => {
  const boxAt = (x: number, y: number, w: number, h: number): Polygon => [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ]

  it('複数の部位をまとめて収める', () => {
    const vb = zoomToPolygons([boxAt(500, 400, 100, 100), boxAt(700, 600, 100, 100)], size)
    expect(vb.x).toBeLessThanOrEqual(500)
    expect(vb.y).toBeLessThanOrEqual(400)
    expect(vb.x + vb.w).toBeGreaterThanOrEqual(800)
    expect(vb.y + vb.h).toBeGreaterThanOrEqual(700)
  })

  it('縦長の場所でも、部位の範囲が狭ければちゃんと寄る（輪郭に寄せると寄れんかった問題）', () => {
    // 前肢の輪郭は縦 985px あって画像全体に戻ってしまうが、筋は 440px に収まる
    const legOutline = boxAt(480, 175, 290, 985)
    expect(scaleOf(zoomToPolygon(legOutline, size), size)).toBeCloseTo(1, 3)
    const muscles = [boxAt(450, 360, 200, 200), boxAt(590, 600, 170, 200)]
    expect(scaleOf(zoomToPolygons(muscles, size), size)).toBeGreaterThan(1.8)
  })

  it('空なら全体表示', () => {
    expect(zoomToPolygons([], size)).toEqual(fit(size))
  })

  it('アスペクトは画像のまま', () => {
    const vb = zoomToPolygons([boxAt(500, 400, 100, 100)], size)
    expect(vb.w / vb.h).toBeCloseTo(aspect, 9)
  })
})
