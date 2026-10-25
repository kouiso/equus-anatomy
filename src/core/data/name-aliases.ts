/**
 * #220の名称整合で維持する検索入力。表示名や別構造の定義には使わない。
 * 「中趾骨」は誤記の旧入力互換であり、正式名・有効同義語として認定しない。
 * Carpus/Tarsus/Metatarsusも旧入力の保持であり、骨群と領域全体を同一視しない。
 * 「管骨」「後肢の管骨」は旧要約からの検索導線を保持する入力で、骨群の正式同義語ではない。
 * 胸骨頭筋/sternomandibularisはウマの胸骨下顎筋と結ぶ原典根拠を検収記録に置く。
 */
export const NAME_ALIASES: Readonly<Record<string, readonly string[]>> = {
  'bone-carpus': ['Carpus (knee)'],
  'bone-metatarsus': ['中趾骨', 'Metatarsus', '管骨', '後肢の管骨'],
  'bone-tarsus': ['跗骨', 'Tarsus (hock)'],
  'muscle-sternocephalicus': ['胸骨頭筋', 'Sternomandibularis', 'M. sternomandibularis'],
}
