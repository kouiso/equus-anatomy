/** 大まかな場所の一覧。輪郭（座標）は人が実測して regions/*.json に入れる。ここには名前だけ。 */
export const AREA_PRESETS = [
  { id: 'head', nameJa: '頭部' },
  { id: 'neck', nameJa: '頸部' },
  { id: 'trunk', nameJa: '体幹' },
  { id: 'fore', nameJa: '前肢' },
  { id: 'hind', nameJa: '後肢' },
  { id: 'tail', nameJa: '尾' },
] as const
