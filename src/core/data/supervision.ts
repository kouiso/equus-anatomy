import type { SupervisionRecord } from '../supervision'

/**
 * 獣医師による監修の記録（#13 / #56）。
 *
 * 監修はまだ受けていないので空。空のあいだ画面は全部位を「未監修」と出す。
 * 監修を受けたら 1 回ぶんを 1 件として足す。範囲は層単位か部位ID単位で書く。
 * 氏名を画面に出すのは本人の掲載許可（namePublishConsent: true）を取ってから。
 *
 * 例:
 * {
 *   supervisor: { name: '山田 太郎', title: '獣医師', affiliation: '〇〇大学 獣医解剖学研究室', namePublishConsent: true },
 *   reviewedOn: '2026-11-01',
 *   scope: { layers: ['skeleton'], partIds: ['muscle-gluteus'] },
 * }
 */
export const SUPERVISION_RECORDS: readonly SupervisionRecord[] = []
