import { readFileSync, writeFileSync } from 'node:fs'

/**
 * left.json 系の parts を層ごとに書き戻す。
 * 末尾へ付け替えると、単一層スクリプトだけ回した時にコミット済みの並びと
 * ずれて余計な差分が出る。既存の並びの同じ位置へ差し戻すことで、
 * どの層スクリプトを回してもファイルの構造が変わらん（#97）。
 */
export function mergeLayerParts(
  existing: Record<string, unknown>[],
  layer: string,
  generated: Record<string, unknown>[],
): Record<string, unknown>[] {
  const insertAt = existing.findIndex((p) => p.layer === layer)
  const rest = existing.filter((p) => p.layer !== layer)
  rest.splice(insertAt === -1 ? rest.length : insertAt, 0, ...generated)
  return rest
}

export function rewriteRegionParts(
  path: string,
  layer: string,
  generated: Record<string, unknown>[],
): void {
  const file = JSON.parse(readFileSync(path, 'utf8')) as { parts?: Record<string, unknown>[] }
  const merged = mergeLayerParts(file.parts ?? [], layer, generated)
  writeFileSync(path, `${JSON.stringify({ ...file, parts: merged }, null, 2)}\n`)
}
