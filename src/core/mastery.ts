/**
 * 覚えた／まだの記録と判定。DOM と保存先（AsyncStorage/localStorage）と関係ないので core に置く。
 * correct/wrong/streak は削除済みテスト機能の既存記録を読み続けるために型へ残す。
 */
export type MasteryRecord = {
  readonly correct: number
  readonly wrong: number
  /** 直近の連続正解数。間違うと0に戻る */
  readonly streak: number
  /** 最後に触った時刻（epoch ms）。0 = まだ一度も触ってない */
  readonly lastAt: number
  /** ユーザーが手で付けた「覚えた」 */
  readonly marked: boolean
}

export type MasteryMap = Readonly<Record<string, MasteryRecord>>

const EMPTY: MasteryRecord = { correct: 0, wrong: 0, streak: 0, lastAt: 0, marked: false }

/** 記録が無い部位は「まだ一度も触ってない」。初期値はここに一本化する */
export function recordOf(map: MasteryMap, id: string): MasteryRecord {
  return map[id] ?? EMPTY
}

/** 覚えたの判定。手動マークか、過去のテスト記録の2連続正解のどちらかが立てば「覚えた」 */
export const LEARNED_STREAK = 2
export function isLearned(rec: MasteryRecord): boolean {
  return rec.marked || rec.streak >= LEARNED_STREAK
}

export function applyMark(rec: MasteryRecord, marked: boolean, now: number): MasteryRecord {
  // 「まだ」に戻す時は連続正解も切る。残すと2連続正解で覚えた部位を一生「まだ」に戻せん
  return marked ? { ...rec, marked, lastAt: now } : { ...rec, marked, streak: 0, lastAt: now }
}
