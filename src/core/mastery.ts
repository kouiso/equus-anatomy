/**
 * 覚えた／まだの記録と判定。DOM と保存先（AsyncStorage/localStorage）と関係ないので core に置く。
 * クイズ（#6）の解答もここへ記録するので、判定ルールはここに一本化する。
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

/** 覚えたの判定。手動マークか、テストの2連続正解のどちらかが立てば「覚えた」 */
export const LEARNED_STREAK = 2
export function isLearned(rec: MasteryRecord): boolean {
  return rec.marked || rec.streak >= LEARNED_STREAK
}

/** 解答を1件記録する。間違うと連続は切れるが正解数は残す（苦手の指標に使う） */
export function applyAnswer(rec: MasteryRecord, ok: boolean, now: number): MasteryRecord {
  return {
    ...rec,
    correct: rec.correct + (ok ? 1 : 0),
    wrong: rec.wrong + (ok ? 0 : 1),
    streak: ok ? rec.streak + 1 : 0,
    lastAt: now,
  }
}

export function applyMark(rec: MasteryRecord, marked: boolean, now: number): MasteryRecord {
  // 「まだ」に戻す時は連続正解も切る。残すと2連続正解で覚えた部位を一生「まだ」に戻せん
  return marked ? { ...rec, marked, lastAt: now } : { ...rec, marked, streak: 0, lastAt: now }
}

/**
 * 次に触るべき部位の順。まだの部位を先に、覚えた部位は後ろへ。
 * まだの中では「触ったこと無い」を先に（出会ってないものを出す）、
 * 次に間違いが多い順、同数なら触ったのが古い順。
 */
export function nextToReview(map: MasteryMap, ids: readonly string[]): readonly string[] {
  const score = (id: string) => {
    const r = recordOf(map, id)
    return { learned: isLearned(r), untouched: r.lastAt === 0, wrong: r.wrong, lastAt: r.lastAt }
  }
  return [...ids].sort((a, b) => {
    const x = score(a)
    const y = score(b)
    if (x.learned !== y.learned) return x.learned ? 1 : -1
    if (x.untouched !== y.untouched) return x.untouched ? -1 : 1
    if (x.wrong !== y.wrong) return y.wrong - x.wrong
    return x.lastAt - y.lastAt
  })
}
