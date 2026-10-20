/**
 * 独立した原画参照マスクと、アプリの当たり領域（regions/*.json の parts）を比べる (#175)。
 *
 *   pnpm measure:independent [--ref <参照の置き場>] [--json <出力先>] [--strict]
 *
 * 参照は「候補座標を見ずに原画だけから作った領域」でなければ意味が無い。
 * 当たり領域から作った参照と比べても、自分と自分を比べるだけになる。
 * そのため参照は regions/*.json とは別の置き場（既定 doc/reference-mask/）に、
 * 画像 SHA・向き・層を固定した形で置く。形式は ReferenceFile を見よ。
 *
 * 守ること:
 * - 参照が無い部位は unmeasured のまま。数字を作らん
 * - 画像 SHA が食い違う参照は stale。測った扱いにせん
 * - 作者が候補座標を見て作った参照（blindToCandidates が true でない）は数字だけ出し、合否に数えん
 * - regions/*.json の source（measured / draft）は読むだけで書き換えん
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Point, Polygon, Size } from '../src/core/types'

export const IOU_MIN = 0.95
export const BOUNDARY_P95_MAX_PX = 3

/** 参照ファイル1枚 = 1枚の原画（向き × プレート）。 */
export type ReferenceFile = {
  view: 'left' | 'front' | 'rear'
  /** regions/*.json の images のキー（skin / muscle-superficial / skeleton / organs） */
  plate: string
  /** assets/anatomy/ の下のファイル名 */
  image: string
  /** "sha256:<hex>"。原画が差し替わったら参照は無効 */
  imageSha256: string
  size: Size
  /** 誰が作ったか（人名・役割） */
  annotator: string
  /** 作者が候補座標（regions/*.json）を見ずに作ったか。true の時だけ合否に数える */
  blindToCandidates: boolean
  createdAt: string
  /** どうやって作ったか（手描き・塗り分け画像から変換、等） */
  method: string
  /** 部位ごとの領域。蹄のように離れた塊は複数の多角形で持つ */
  parts: { id: string; polygons: Point[][] }[]
}

export type Target = {
  view: 'left' | 'front' | 'rear'
  id: string
  layer: string
  plate: string
  source: string
  points: Polygon
}

export type Status = 'pass' | 'fail' | 'not-independent' | 'stale' | 'unmeasured'

export type Row = {
  view: string
  id: string
  plate: string
  source: string
  status: Status
  reason: string
  iou: number | null
  boundaryP95Px: number | null
  referencePx: number | null
  candidatePx: number | null
}

/** 画素 (x, y) は [x, x+1) × [y, y+1)。中心が多角形の内側なら塗る（偶奇規則、複数多角形は和集合）。 */
export function rasterize(polygons: readonly Polygon[], size: Size): Uint8Array {
  const out = new Uint8Array(size.w * size.h)
  for (const poly of polygons) {
    if (poly.length < 3) continue
    const ys = poly.map((p) => p[1])
    const y0 = Math.max(0, Math.floor(Math.min(...ys)))
    const y1 = Math.min(size.h - 1, Math.ceil(Math.max(...ys)))
    for (let y = y0; y <= y1; y++) {
      const cy = y + 0.5
      const xs: number[] = []
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const a = poly[i]!
        const b = poly[j]!
        if (a[1] > cy !== b[1] > cy) xs.push(a[0] + ((cy - a[1]) * (b[0] - a[0])) / (b[1] - a[1]))
      }
      xs.sort((p, q) => p - q)
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const from = Math.max(0, Math.ceil(xs[k]! - 0.5))
        const to = Math.min(size.w - 1, Math.ceil(xs[k + 1]! - 0.5) - 1)
        for (let x = from; x <= to; x++) out[y * size.w + x] = 1
      }
    }
  }
  return out
}

/** 内側の画素のうち、4近傍のどれかが外（または画像の縁）のもの。 */
export function boundaryOf(mask: Uint8Array, size: Size): Uint8Array {
  const out = new Uint8Array(mask.length)
  for (let y = 0; y < size.h; y++) {
    for (let x = 0; x < size.w; x++) {
      const k = y * size.w + x
      if (mask[k] !== 1) continue
      const edge =
        x === 0 ||
        y === 0 ||
        x === size.w - 1 ||
        y === size.h - 1 ||
        mask[k - 1] !== 1 ||
        mask[k + 1] !== 1 ||
        mask[k - size.w] !== 1 ||
        mask[k + size.w] !== 1
      if (edge) out[k] = 1
    }
  }
  return out
}

/** 1次元の二乗距離変換（Felzenszwalb & Huttenlocher）。 */
function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array): void {
  let k = 0
  v[0] = 0
  z[0] = -Infinity
  z[1] = Infinity
  for (let q = 1; q < n; q++) {
    if (f[q] === Infinity) continue
    if (f[v[k]!] === Infinity) {
      v[k] = q
      continue
    }
    let s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!)
    while (s <= z[k]!) {
      k--
      s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!)
    }
    k++
    v[k] = q
    z[k] = s
    z[k + 1] = Infinity
  }
  k = 0
  for (let q = 0; q < n; q++) {
    while (z[k + 1]! < q) k++
    const p = v[k]!
    d[q] = f[p] === Infinity ? Infinity : (q - p) * (q - p) + f[p]!
  }
}

/** 各画素から、seeds の一番近い画素までの距離（px、ユークリッド）。 */
export function distanceTo(seeds: Uint8Array, size: Size): Float64Array {
  const { w, h } = size
  const grid = new Float64Array(w * h)
  for (let i = 0; i < grid.length; i++) grid[i] = seeds[i] === 1 ? 0 : Infinity
  const n = Math.max(w, h)
  const f = new Float64Array(n)
  const d = new Float64Array(n)
  const v = new Int32Array(n)
  const z = new Float64Array(n + 1)
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x]!
    edt1d(f, h, d, v, z)
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y]!
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x]!
    edt1d(f, w, d, v, z)
    for (let x = 0; x < w; x++) grid[y * w + x] = Math.sqrt(d[x]!)
  }
  return grid
}

/** 最近順位法の百分位点。補間で無い値を作らん。 */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) throw new Error('percentile: 値が無い')
  const sorted = [...values].sort((a, b) => a - b)
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length))
  return sorted[rank - 1]!
}

export type Comparison = {
  iou: number
  /** 2つの向きの 95% 点の大きい方 */
  boundaryP95Px: number
  /** 参照の境界 → 候補の境界 */
  referenceToCandidateP95Px: number
  /** 候補の境界 → 参照の境界 */
  candidateToReferenceP95Px: number
  referencePx: number
  candidatePx: number
}

/**
 * IoU と境界距離の 95% 点。境界距離は向きごとに 95% 点を取り、大きい方を使う。
 * 片向きだけやと候補のはみ出しを見落とす。両向きを1つに混ぜると、片側だけの大きなずれが
 * もう片側の 0 に薄められる。
 */
export function compareMasks(reference: Uint8Array, candidate: Uint8Array, size: Size): Comparison {
  let inter = 0
  let union = 0
  let referencePx = 0
  let candidatePx = 0
  for (let i = 0; i < reference.length; i++) {
    const r = reference[i] === 1
    const c = candidate[i] === 1
    if (r) referencePx++
    if (c) candidatePx++
    if (r && c) inter++
    if (r || c) union++
  }
  if (referencePx === 0 || candidatePx === 0) throw new Error('compareMasks: 空のマスクは比べられん')
  const refEdge = boundaryOf(reference, size)
  const candEdge = boundaryOf(candidate, size)
  const toRef = distanceTo(refEdge, size)
  const toCand = distanceTo(candEdge, size)
  const refToCand: number[] = []
  const candToRef: number[] = []
  for (let i = 0; i < refEdge.length; i++) {
    if (refEdge[i] === 1) refToCand.push(toCand[i]!)
    if (candEdge[i] === 1) candToRef.push(toRef[i]!)
  }
  const referenceToCandidateP95Px = percentile(refToCand, 95)
  const candidateToReferenceP95Px = percentile(candToRef, 95)
  return {
    iou: inter / union,
    boundaryP95Px: Math.max(referenceToCandidateP95Px, candidateToReferenceP95Px),
    referenceToCandidateP95Px,
    candidateToReferenceP95Px,
    referencePx,
    candidatePx,
  }
}

export function plateOf(layer: string, depth: string | undefined): string {
  return layer === 'muscle' ? `muscle-${depth ?? 'superficial'}` : layer
}

/**
 * 参照と当たり領域を突き合わせて部位ごとの行を作る。
 * currentImageSha は「今ディスクにある原画」の SHA。candidateImageSha は regions/*.json の
 * images[plate].hash で、当たり領域のファイルが指しとる原画の SHA（refresh-view-meta.ts が
 * 多角形を測り直さずに書き換えることもあるので、多角形を測った原画の証明にはならん）。
 * 参照・原画・当たり領域の指す原画が揃った時だけ測る。
 */
export function evaluate(args: {
  targets: readonly Target[]
  references: readonly ReferenceFile[]
  currentImageSha: (view: string, plate: string) => string | null
  candidateImageSha: (view: string, plate: string) => string | null
  imageFileOf: (view: string, plate: string) => string | null
  sizeOf: (view: string) => Size
}): Row[] {
  const rows: Row[] = []
  for (const t of args.targets) {
    const base = { view: t.view, id: t.id, plate: t.plate, source: t.source }
    const empty = { iou: null, boundaryP95Px: null, referencePx: null, candidatePx: null }
    const ref = args.references.find((r) => r.view === t.view && r.plate === t.plate && r.parts.some((p) => p.id === t.id))
    if (ref === undefined) {
      rows.push({ ...base, ...empty, status: 'unmeasured', reason: '独立した参照が無い' })
      continue
    }
    const size = args.sizeOf(t.view)
    const imageFile = args.imageFileOf(t.view, t.plate)
    if (imageFile === null) {
      rows.push({ ...base, ...empty, status: 'stale', reason: `プレート ${t.plate} の原画が無い` })
      continue
    }
    if (ref.image !== imageFile) {
      rows.push({ ...base, ...empty, status: 'stale', reason: `参照の原画 ${ref.image} が当たり領域の原画 ${imageFile} と違う` })
      continue
    }
    const current = args.currentImageSha(t.view, t.plate)
    const candidate = args.candidateImageSha(t.view, t.plate)
    if (current === null || ref.imageSha256 !== current) {
      rows.push({ ...base, ...empty, status: 'stale', reason: `参照の画像SHAが今の原画と違う (${ref.image})` })
      continue
    }
    if (candidate !== current) {
      rows.push({ ...base, ...empty, status: 'stale', reason: '当たり領域のファイルが指す画像SHAが今の原画と違う' })
      continue
    }
    if (ref.size.w !== size.w || ref.size.h !== size.h) {
      rows.push({ ...base, ...empty, status: 'stale', reason: `参照の寸法 ${ref.size.w}x${ref.size.h} が座標系 ${size.w}x${size.h} と違う` })
      continue
    }
    const part = ref.parts.find((p) => p.id === t.id)!
    const refMask = rasterize(part.polygons, size)
    const candMask = rasterize([t.points], size)
    let cmp: Comparison
    try {
      cmp = compareMasks(refMask, candMask, size)
    } catch (e) {
      rows.push({ ...base, ...empty, status: 'stale', reason: `比較できん: ${(e as Error).message}` })
      continue
    }
    const measured = { iou: cmp.iou, boundaryP95Px: cmp.boundaryP95Px, referencePx: cmp.referencePx, candidatePx: cmp.candidatePx }
    if (ref.blindToCandidates !== true) {
      rows.push({ ...base, ...measured, status: 'not-independent', reason: '参照の作者が候補座標を見ている。合否に数えん' })
      continue
    }
    const ok = cmp.iou >= IOU_MIN && cmp.boundaryP95Px <= BOUNDARY_P95_MAX_PX
    rows.push({
      ...base,
      ...measured,
      status: ok ? 'pass' : 'fail',
      reason: ok ? '' : `IoU ${cmp.iou.toFixed(3)} / 境界95%点 ${cmp.boundaryP95Px.toFixed(1)}px`,
    })
  }
  return rows
}

export type Summary = { targets: number; measured: number; pass: number; fail: number; notIndependent: number; stale: number; unmeasured: number; acceptanceMet: boolean }

export function summarize(rows: readonly Row[]): Summary {
  const count = (s: Status) => rows.filter((r) => r.status === s).length
  const pass = count('pass')
  const fail = count('fail')
  return {
    targets: rows.length,
    measured: pass + fail,
    pass,
    fail,
    notIndependent: count('not-independent'),
    stale: count('stale'),
    unmeasured: count('unmeasured'),
    // 全対象が独立参照で合格した時だけ。未測定が1件でもあれば満たさん
    acceptanceMet: rows.length > 0 && pass === rows.length,
  }
}

export function validateReference(raw: unknown, file: string): ReferenceFile {
  const r = raw as Partial<ReferenceFile>
  const need = (cond: boolean, what: string) => {
    if (!cond) throw new Error(`${file}: ${what}`)
  }
  need(r.view === 'left' || r.view === 'front' || r.view === 'rear', 'view は left / front / rear')
  need(typeof r.plate === 'string' && r.plate.length > 0, 'plate が無い')
  need(typeof r.image === 'string' && r.image.length > 0, 'image が無い')
  need(typeof r.imageSha256 === 'string' && /^sha256:[0-9a-f]{64}$/.test(r.imageSha256), 'imageSha256 は sha256:<hex>')
  need(Number.isInteger(r.size?.w) && Number.isInteger(r.size?.h) && r.size!.w > 0 && r.size!.h > 0, 'size は正の整数の w と h')
  need(typeof r.annotator === 'string' && r.annotator.length > 0, 'annotator が無い')
  need(typeof r.blindToCandidates === 'boolean', 'blindToCandidates は true / false')
  need(typeof r.method === 'string' && r.method.length > 0, 'method が無い')
  need(Array.isArray(r.parts), 'parts が無い')
  for (const p of r.parts ?? []) {
    need(typeof p.id === 'string' && Array.isArray(p.polygons) && p.polygons.length > 0, `parts の ${String(p.id)} に polygons が無い`)
    for (const poly of p.polygons) {
      need(Array.isArray(poly) && poly.length >= 3, `${p.id}: 頂点3つ未満の多角形`)
      for (const pt of poly) {
        need(Array.isArray(pt) && pt.length === 2 && pt.every((n) => Number.isFinite(n)), `${p.id}: 頂点は有限の [x, y]`)
      }
    }
  }
  return r as ReferenceFile
}

/**
 * 参照どうしの重なりと、どの対象にも当たらん id を調べる。
 * 同じ部位の参照が2枚あると、どちらで測ったかがファイル名の順で黙って決まってしまう。
 */
export function checkReferenceSet(
  references: readonly ReferenceFile[],
  targets: readonly Target[],
): { duplicates: string[]; orphans: string[] } {
  const seen = new Set<string>()
  const duplicates: string[] = []
  const orphans: string[] = []
  for (const ref of references) {
    for (const p of ref.parts) {
      const key = `${ref.view}/${ref.plate}/${p.id}`
      if (seen.has(key)) duplicates.push(key)
      seen.add(key)
      if (!targets.some((t) => t.view === ref.view && t.plate === ref.plate && t.id === p.id)) orphans.push(key)
    }
  }
  return { duplicates, orphans }
}

type RegionFile = {
  view: 'left' | 'front' | 'rear'
  size: Size
  images: Record<string, { src: string; hash: string }>
  parts: { id: string; layer: string; depth?: string; points: Point[]; source?: string }[]
}

function sha256Of(path: string): string {
  return `sha256:${createHash('sha256').update(readFileSync(path)).digest('hex')}`
}

function table(rows: readonly Row[]): string {
  const fmt = (n: number | null, digits: number) => (n === null ? '—' : n.toFixed(digits))
  const lines = ['| view | part | plate | source | status | IoU | 境界95%点(px) | 理由 |', '|---|---|---|---|---|---|---|---|']
  for (const r of rows) {
    lines.push(
      `| ${r.view} | ${r.id} | ${r.plate} | ${r.source} | ${r.status} | ${fmt(r.iou, 3)} | ${fmt(r.boundaryP95Px, 1)} | ${r.reason} |`,
    )
  }
  return lines.join('\n')
}

function main(argv: readonly string[]): void {
  const arg = (name: string) => {
    const i = argv.indexOf(name)
    return i >= 0 ? argv[i + 1] : undefined
  }
  const refDir = arg('--ref') ?? 'doc/reference-mask'
  const jsonOut = arg('--json')
  const strict = argv.includes('--strict')

  const regions: RegionFile[] = (['left', 'front', 'rear'] as const).map(
    (v) => JSON.parse(readFileSync(`src/core/data/regions/${v}.json`, 'utf8')) as RegionFile,
  )
  const targets: Target[] = regions.flatMap((rf) =>
    rf.parts.map((p) => ({
      view: rf.view,
      id: p.id,
      layer: p.layer,
      plate: plateOf(p.layer, p.depth),
      source: p.source === 'measured' ? 'measured' : 'draft',
      points: p.points,
    })),
  )
  const references = existsSync(refDir)
    ? readdirSync(refDir)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .map((f) => validateReference(JSON.parse(readFileSync(join(refDir, f), 'utf8')), join(refDir, f)))
    : []
  const { duplicates, orphans } = checkReferenceSet(references, targets)
  if (duplicates.length > 0) throw new Error(`同じ部位の参照が複数ある: ${duplicates.join(', ')}`)
  for (const o of orphans) console.warn(`  ! 参照 ${o} に当たる対象が無い（id か plate の書き間違い？）`)
  const regionOf = (view: string) => regions.find((r) => r.view === view)!
  const rows = evaluate({
    targets,
    references,
    currentImageSha: (view, plate) => {
      const img = regionOf(view).images[plate]
      if (img === undefined) return null
      const disk = `assets/anatomy/${img.src.replace('/anatomy/', '')}`
      return existsSync(disk) ? sha256Of(disk) : null
    },
    candidateImageSha: (view, plate) => regionOf(view).images[plate]?.hash ?? null,
    imageFileOf: (view, plate) => regionOf(view).images[plate]?.src.split('/').pop() ?? null,
    sizeOf: (view) => regionOf(view).size,
  })
  const s = summarize(rows)
  console.log(table(rows))
  console.log(
    `\n対象 ${s.targets} 部位（left/front/rear。右側望は左側望の反転なので同じ値）` +
      `\n  独立参照で測定 ${s.measured}/${s.targets}（合格 ${s.pass}、不合格 ${s.fail}）` +
      `\n  参照が独立でない ${s.notIndependent}/${s.targets}、SHA不一致 ${s.stale}/${s.targets}、未測定 ${s.unmeasured}/${s.targets}` +
      `\n  参照ファイル ${references.length} 枚（${refDir}）` +
      `\n  受け入れ（IoU ≥ ${IOU_MIN} かつ 境界95%点 ≤ ${BOUNDARY_P95_MAX_PX}px を全対象で）: ${s.acceptanceMet ? '満たす' : '満たさん'}`,
  )
  if (jsonOut !== undefined) {
    writeFileSync(jsonOut, `${JSON.stringify({ thresholds: { iouMin: IOU_MIN, boundaryP95MaxPx: BOUNDARY_P95_MAX_PX }, summary: s, rows }, null, 2)}\n`)
  }
  if (strict && !s.acceptanceMet) process.exitCode = 1
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2))
}
