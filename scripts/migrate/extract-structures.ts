/**
 * 配信中の grok 版バンドルから解説文52件だけを取り出す。
 * 座標（x,y）は意図的に捨てる。測られてへん値やから、持ってきたら同じズレを持ち込むことになる。
 * 一度きりの移行スクリプト。実行結果の src/core/data/structures.ts が正本になる。
 */
import { readFileSync, writeFileSync } from 'node:fs'

const src = readFileSync('scripts/migrate/legacy-anatomy-data.js', 'utf8')

const FIELDS = ['id', 'layer', 'nameJa', 'nameLa', 'nameEn', 'region', 'summary', 'body', 'function', 'note', 'depth'] as const
type Field = (typeof FIELDS)[number]

// バックティック文字列 or 数値 or 配列 を1オブジェクト分だけ拾う
const objectRe = /\{id:`([a-z0-9-]+)`,layer:`(skin|muscle|skeleton|organs)`,(.*?)views:\[([^\]]*)\]\}/g

type Row = Partial<Record<Field, string>> & { id: string; layer: string; views: string[] }
const rows: Row[] = []

for (const m of src.matchAll(objectRe)) {
  const [, id, layer, middle, viewsRaw] = m
  const row: Row = { id: id!, layer: layer!, views: [...viewsRaw!.matchAll(/`([a-z]+)`/g)].map((v) => v[1]!) }
  for (const f of FIELDS) {
    if (f === 'id' || f === 'layer') continue
    const fm = new RegExp(`(?:^|,)${f}:\`((?:[^\`\\\\]|\\\\.)*)\``).exec(middle!)
    if (fm) row[f] = fm[1]!.replace(/\\`/g, '`')
  }
  rows.push(row)
}

if (rows.length === 0) throw new Error('1件も抽出できてへん。バンドルの形が変わった可能性')

const seen = new Set<string>()
for (const r of rows) {
  if (seen.has(r.id)) throw new Error(`id 重複: ${r.id}`)
  seen.add(r.id)
  for (const req of ['nameJa', 'nameLa', 'nameEn', 'region', 'summary', 'body', 'function'] as const) {
    if (!r[req]) throw new Error(`${r.id}: ${req} が取れてへん`)
  }
  if (r.views.length === 0) throw new Error(`${r.id}: views が空`)
}

const q = (s: string) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
const body = rows
  .map((r) => {
    const lines = [`    id: ${q(r.id)},`, `    layer: ${q(r.layer)},`]
    if (r.depth) lines.push(`    depth: ${q(r.depth)},`)
    for (const f of ['nameJa', 'nameLa', 'nameEn', 'region', 'summary', 'body', 'function'] as const) {
      lines.push(`    ${f === 'function' ? 'function' : f}: ${q(r[f]!)},`)
    }
    if (r.note) lines.push(`    note: ${q(r.note)},`)
    lines.push(`    views: [${r.views.map(q).join(', ')}],`)
    return `  {\n${lines.join('\n')}\n  },`
  })
  .join('\n')

const out = `// 自動生成: pnpm tsx scripts/migrate/extract-structures.ts
// grok 版から解説文だけを移植したもの。座標は含まん（座標は src/core/data/regions/ にある実測値が正本）。
import type { Structure } from '../types'

export const STRUCTURES: readonly Structure[] = [
${body}
]

export const STRUCTURE_BY_ID: ReadonlyMap<string, Structure> = new Map(STRUCTURES.map((s) => [s.id, s]))
`

writeFileSync('src/core/data/structures.ts', out)
const byLayer = rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.layer]: (a[r.layer] ?? 0) + 1 }), {})
console.log(`${rows.length} 件 → src/core/data/structures.ts`, byLayer)
