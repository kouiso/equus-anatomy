import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/** 警告は stderr に出す（CLI として正しい）ので、テストでは両方を見る。 */
const run = (input: string, out: string) => {
  const r = spawnSync('pnpm', ['tsx', 'scripts/import-annotations.ts', input, 'left', out], { encoding: 'utf8' })
  return `${r.stdout}${r.stderr}`
}

describe('アノテーション取り込み', () => {
  it('VIA の polygon を id で解決して部位に落とす', () => {
    const dir = mkdtempSync(join(tmpdir(), 'equus-'))
    const input = join(dir, 'via.json')
    const out = join(dir, 'left.json')
    writeFileSync(
      input,
      JSON.stringify({
        'muscle_left.jpg1234': {
          regions: [
            {
              shape_attributes: { name: 'polygon', all_points_x: [800, 900, 900, 800], all_points_y: [500, 500, 600, 600] },
              region_attributes: { label: 'muscle-latissimus' },
            },
            {
              shape_attributes: { name: 'polygon', all_points_x: [300, 620, 620, 300], all_points_y: [260, 260, 430, 430] },
              region_attributes: { label: '頸部' },
            },
          ],
        },
      }),
    )
    const log = run(input, out)
    expect(log).toContain('部位 1 件 / 大まかな場所 1 件')
    const result = JSON.parse(readFileSync(out, 'utf8')) as {
      parts: { id: string; layer: string; points: number[][]; labelAt: number[] }[]
      areas: { id: string; nameJa: string }[]
    }
    expect(result.parts[0]!.id).toBe('muscle-latissimus')
    expect(result.parts[0]!.layer).toBe('muscle')
    expect(result.parts[0]!.points).toEqual([
      [800, 500],
      [900, 500],
      [900, 600],
      [800, 600],
    ])
    expect(result.parts[0]!.labelAt).toEqual([850, 550])
    expect(result.areas[0]).toEqual({ id: 'neck', nameJa: '頸部', points: expect.anything() })
  })

  it('COCO の segmentation も読める。日本語名でも引ける', () => {
    const dir = mkdtempSync(join(tmpdir(), 'equus-'))
    const input = join(dir, 'coco.json')
    const out = join(dir, 'left.json')
    writeFileSync(
      input,
      JSON.stringify({
        categories: [{ id: 7, name: '中臀筋' }],
        annotations: [{ category_id: 7, segmentation: [[1080, 360, 1160, 360, 1160, 440, 1080, 440]] }],
      }),
    )
    const log = run(input, out)
    expect(log).toContain('COCO として読み込み')
    const result = JSON.parse(readFileSync(out, 'utf8')) as { parts: { id: string }[] }
    expect(result.parts[0]!.id).toBe('muscle-gluteus')
  })

  it('知らんラベルは黙って捨てず警告する', () => {
    const dir = mkdtempSync(join(tmpdir(), 'equus-'))
    const input = join(dir, 'via.json')
    writeFileSync(
      input,
      JSON.stringify({
        a: {
          regions: [
            {
              shape_attributes: { name: 'polygon', all_points_x: [1, 2, 3], all_points_y: [1, 2, 3] },
              region_attributes: { label: 'そんな筋肉はない' },
            },
          ],
        },
      }),
    )
    expect(run(input, join(dir, 'left.json'))).toContain('そんな筋肉はない')
  })
})
