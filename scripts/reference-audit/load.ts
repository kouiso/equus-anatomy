import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { GEOMETRY, STRUCTURES } from '../../src/core/data'
import { plateIdOf } from '../../src/core/types'
import { auditCoverage } from './audit'
import type { EquusSnapshot, ReviewTracker, SourceCatalog, SourceSummary } from './types'

export const DATA_ROOT = fileURLToPath(new URL('../../doc/reference-audit/2026-10-22/', import.meta.url))
const loadJson = (file: string): unknown => JSON.parse(readFileSync(`${DATA_ROOT}${file}`, 'utf8'))

export function currentSnapshot(): EquusSnapshot[] {
  return STRUCTURES.map((structure) => ({
    id: structure.id, layer: structure.layer, nameEn: structure.nameEn, nameJa: structure.nameJa, nameLa: structure.nameLa,
    regions: (['left', 'front', 'rear'] as const).flatMap((view) => {
      const part = GEOMETRY[view].parts.find((candidate) => candidate.id === structure.id)
      return part ? [{ view, source: part.source, plate_exists: GEOMETRY[view].images[plateIdOf(part.layer, part.depth ?? 'superficial')] !== undefined }] : []
    }),
    right_view: GEOMETRY.left.parts.some((part) => part.id === structure.id) ? 'left_mirror_not_independent_anatomical_evidence' : 'not_mapped',
  }))
}

export function geometryFingerprint() {
  return Object.fromEntries((['left', 'right', 'front', 'rear'] as const).map((view) => {
    const { size, images, parts } = GEOMETRY[view]
    return [view, createHash('sha256').update(JSON.stringify({ size, images, parts })).digest('hex')]
  }))
}

export function loadCoverage() {
  const manifest = loadJson('source-manifest.json') as { files: Record<string, { bytes: number; sha256: string }> }
  const expectedFiles = ['Horse-Anatomy-Catalog-692.json', 'Equus-Current-Catalog.json', 'catalog-summary.json']
  if (!isDeepStrictEqual(Object.keys(manifest.files).sort(), expectedFiles.sort())) throw new Error('原台帳の3ファイルが揃っていない')
  for (const [name, expected] of Object.entries(manifest.files)) {
    if (!['Horse-Anatomy-Catalog-692.json', 'Equus-Current-Catalog.json', 'catalog-summary.json'].includes(name)) throw new Error(`原台帳のファイル名が不正: ${name}`)
    const bytes = readFileSync(`${DATA_ROOT}source/${name}`)
    if (bytes.length !== expected.bytes || createHash('sha256').update(bytes).digest('hex') !== expected.sha256) throw new Error(`原台帳のサイズ・ハッシュが不一致: ${name}`)
  }
  // JSONは上で原本のバイト一致を確認し、auditCoverageでID・関係・集計を検査する。
  const catalog = loadJson('source/Horse-Anatomy-Catalog-692.json') as SourceCatalog
  const snapshot = loadJson('source/Equus-Current-Catalog.json') as EquusSnapshot[]
  const sourceSummary = loadJson('source/catalog-summary.json') as SourceSummary
  const tracker = loadJson('reviews.json') as ReviewTracker
  return { catalog, snapshot, sourceSummary, tracker }
}

export function runAudit() {
  const inputs = loadCoverage()
  const report = auditCoverage(inputs.catalog, inputs.snapshot, inputs.tracker, currentSnapshot())
  if (!isDeepStrictEqual(inputs.sourceSummary, inputs.catalog.summary)) report.errors.push('同梱集計と原台帳のsummaryが一致しない')
  if (!isDeepStrictEqual(loadJson('geometry-baseline.json'), geometryFingerprint())) report.errors.push('座標・深さ・図版情報が監査開始時から変更されている。位置レビューの適用範囲を再確認すること')
  return report
}
