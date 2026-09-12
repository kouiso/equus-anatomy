import { areaOfStructure } from './area-map'
import { STRUCTURE_BY_ID } from './data'
import { visibleParts } from './hit-test'
import type { Depth, Layer, Part, Structure, View, ViewGeometry } from './types'

/**
 * クイズの出題・採点の計算。当たり判定は hit-test.ts をそのまま使う
 * （画面のタップ→部位の解決は AnatomyCanvas が既に持っとる）。
 * ここにあるのは「何を出すか」「選択肢をどう作るか」だけ。
 */
export type QuizDirection = 'figToName' | 'nameToFig'

export type QuizScope = {
  readonly view: View
  readonly layer: Layer
  readonly depth: Depth
  /** 大まかな場所の id。絞らん時は 'all' */
  readonly area: string | 'all'
}

/**
 * 出題母数。座標が置いてある部位だけ出す（置いてへん部位は押せんので出題できん）。
 * 下書きの部位も含める。外すと実測12件（ほぼ皮膚）だけになって成立せん。
 * 境界が甘いのは「見えとる点を優先する」既存の判定で吸収する。
 */
export function questionPool(
  geometry: ViewGeometry,
  scope: { layer: Layer; depth: Depth; area: string | 'all' },
): readonly Part[] {
  const byLayer = visibleParts(geometry.parts, { layer: scope.layer, depth: scope.depth })
  if (scope.area === 'all') return byLayer
  return byLayer.filter((p) => {
    const s = STRUCTURE_BY_ID.get(p.id)
    return s !== undefined && areaOfStructure(s) === scope.area
  })
}

export function pickQuestion(pool: readonly Part[], rng: () => number): Part | null {
  if (pool.length === 0) return null
  return pool[Math.floor(rng() * pool.length)] ?? null
}

function shuffle<T>(list: readonly T[], rng: () => number): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const t = a[i]!
    a[i] = a[j]!
    a[j] = t
  }
  return a
}

/**
 * 4択を作る。正解を含めて4件、重複なし。
 * ダミーは「同じ層・同じ場所」（見分けが付きにくいもの）を優先して、
 * 足りなければ同じ層、それでも足りなければ全体から埋める。
 */
export function makeChoices(
  answer: Structure,
  structures: readonly Structure[],
  rng: () => number,
): readonly Structure[] {
  const others = structures.filter((s) => s.id !== answer.id)
  const sameArea = others.filter((s) => s.layer === answer.layer && areaOfStructure(s) === areaOfStructure(answer))
  const sameLayer = others.filter((s) => s.layer === answer.layer && !sameArea.includes(s))
  const rest = others.filter((s) => s.layer !== answer.layer)
  const dummies = [...shuffle(sameArea, rng), ...shuffle(sameLayer, rng), ...shuffle(rest, rng)].slice(0, 3)
  return shuffle([answer, ...dummies], rng)
}
