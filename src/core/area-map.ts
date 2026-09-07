import type { Structure } from './types'

/**
 * 解説データの region（10種）を、図の上の「大まかな場所」（6つ）へ寄せる。
 *
 * region は解剖学の区分で、場所は図の上でどこを触るかの区分。粒度が違うので橋渡しが要る。
 * ここが無いと「頸部へ寄ったのに腹の部位まで出る」ことになる。
 */
const REGION_TO_AREA: Readonly<Record<string, string>> = {
  頭部: 'head',
  頸部: 'neck',
  前躯: 'fore',
  前肢: 'fore',
  体幹: 'trunk',
  胸腔: 'trunk',
  腹腔: 'trunk',
  後躯: 'hind',
  後肢: 'hind',
  尾: 'tail',
}

export function areaOfRegion(region: string): string | null {
  return REGION_TO_AREA[region] ?? null
}

export function areaOfStructure(s: Structure): string | null {
  return areaOfRegion(s.region)
}

/** 対応表に載ってへん region を見つける。データが増えた時に黙って落ちるのを防ぐ。 */
export function unmappedRegions(structures: readonly Structure[]): readonly string[] {
  return [...new Set(structures.map((s) => s.region).filter((r) => REGION_TO_AREA[r] === undefined))]
}
