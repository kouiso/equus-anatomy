import type { Layer, Structure } from '../types'

/**
 * 部位の読み仮名。nameJa は漢字が難しい（鬐甲・繋・膁 など）ので、
 * 読みでも引けるようにするための対応表。
 * structures.ts は生成物なので、読みはここに別持ちする。
 */
export const KANA: Readonly<Record<string, string>> = {
  'skin-head': 'とうぶ',
  'skin-ear': 'じかい',
  'skin-neck': 'くび',
  'skin-withers': 'きこう',
  'skin-back': 'せ',
  'skin-croup': 'しり',
  'skin-tail': 'お',
  'skin-chest': 'きょうぜん',
  'skin-cannon': 'かん',
  'skin-hoof': 'ひづめ',
  'skin-hock': 'ひせつ',
  'muscle-masseter': 'こうきん',
  'muscle-brachiocephalicus': 'わんとうきん',
  'muscle-trapezius': 'そうぼうきん',
  'muscle-triceps': 'じょうわんさんとうきん',
  'muscle-latissimus': 'こうはいきん',
  'muscle-oblique': 'がいふくしゃきん',
  'muscle-gluteus': 'ちゅうでんきん',
  'muscle-biceps-femoris': 'だいたいにとうきん',
  'muscle-gastrocnemius': 'ひふくきん',
  'muscle-ecr': 'とうそくしゅこんしんきん',
  'muscle-supraspinatus': 'きょくじょうきん',
  'muscle-infraspinatus': 'きょくかきん',
  'muscle-iliopsoas': 'ちょうようきん',
  'muscle-subclavius': 'さこつかきん',
  'muscle-pectoral': 'きょうきん',
  'muscle-splenius': 'ひじょうきん',
  'muscle-deltoid': 'さんかくきん',
  'bone-skull': 'とうがい',
  'bone-cervical': 'けいつい',
  'bone-scapula': 'けんこうこつ',
  'bone-humerus': 'じょうわんこつ',
  'bone-ribs': 'ろっこつ',
  'bone-lumbar': 'ようつい',
  'bone-pelvis': 'こつばん',
  'bone-femur': 'だいたいこつ',
  'bone-tibia': 'けいこつ',
  'bone-cannon': 'ちゅうしゅこつ',
  'bone-mandible': 'かがくこつ',
  'bone-radius': 'とうこつ',
  'bone-sacrum': 'せんこつ',
  'bone-sternum': 'きょうこつ',
  'organ-heart': 'しんぞう',
  'organ-lung': 'はい',
  'organ-stomach': 'い',
  'organ-liver': 'かんぞう',
  'organ-spleen': 'ひぞう',
  'organ-intestine': 'しょうちょう',
  'organ-colon': 'だいけっちょう',
  'organ-cecum': 'もうちょう',
  'organ-kidney': 'じんぞう',
  'organ-bladder': 'ぼうこう',
}

export function kanaOf(id: string): string | undefined {
  return KANA[id]
}

/**
 * 総称・通称の読み。部位固有の読みではないが、
 * 「hone」「ashi」みたいな大まかな呼び方でも引けるようにするための別名（#71）。
 *
 * id ごとの手書き対応表は元データ（region/layer）とずれるので、
 * 別名は region と layer から機械的に導出する。ずれたらテストが落ちる。
 */
const REGION_ALIAS: Readonly<Record<string, string>> = {
  頭部: 'あたま',
  頸部: 'くび',
  前肢: 'あし',
  後肢: 'あし',
}

/** 骨は region をまたいで散るので、部位ではなく層へ張る */
const LAYER_ALIAS: Readonly<Partial<Record<Layer, string>>> = {
  skeleton: 'ほね',
}

export function kanaAliasOf(s: Structure): readonly string[] {
  return [REGION_ALIAS[s.region], LAYER_ALIAS[s.layer]].filter(
    (a): a is string => a !== undefined,
  )
}
