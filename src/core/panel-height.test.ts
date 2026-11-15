import { describe, expect, it } from 'vitest'
import { PANEL_BODY_MIN, PANEL_SCROLL_MIN, SHORT_ROOT_HEIGHT, panelLayout, statusPlacement, type PanelLayout, type PanelRoom } from './panel-height'

type Row = {
  name: string
  wide: boolean
  rootHeight: number
  hasHeading: boolean
  actionsAbsent: boolean
  room: PanelRoom
  want: PanelLayout
}

/**
 * 解剖画面（index.tsx）の AnatomyPanel にあった高さの算術を、そのまま入出力の表にしたもの（特性化テスト）。
 * 期待値は切り出し前の算術を原本から取り出して実行した値。挙動を変える時は、この表を意図して書き換える。
 * 4 系統: 短い画面 / 横長 / 文字拡大 / 計測前。
 */
const rows: Row[] = [
  { name: "390x844 portrait, 1x text, measured", wide: false, rootHeight: 744, hasHeading: true, actionsAbsent: false, room: { actions: 96, content: 120, heading: 34 }, want: { height: 200, tiny: false, crowded: false, short: false } },
  { name: "short 360x400 landscape-ish phone", wide: false, rootHeight: 380, hasHeading: true, actionsAbsent: false, room: { actions: 96, content: 120, heading: 34 }, want: { height: 181, tiny: false, crowded: true, short: true } },
  { name: "short just under boundary 419", wide: false, rootHeight: 419, hasHeading: true, actionsAbsent: false, room: { actions: 60, content: 300, heading: 34 }, want: { height: 146.64999999999998, tiny: false, crowded: false, short: true } },
  { name: "not short at boundary 420", wide: false, rootHeight: 420, hasHeading: true, actionsAbsent: false, room: { actions: 60, content: 300, heading: 34 }, want: { height: 147, tiny: false, crowded: false, short: false } },
  { name: "ipad landscape 1024x768 wide", wide: true, rootHeight: 768, hasHeading: false, actionsAbsent: false, room: { actions: 60, content: 200, heading: 0 }, want: { height: 200, tiny: false, crowded: false, short: false } },
  { name: "wide 300 high, fixed parts still fit", wide: true, rootHeight: 300, hasHeading: true, actionsAbsent: false, room: { actions: 90, content: 200, heading: 40 }, want: { height: 158, tiny: false, crowded: false, short: false } },
  { name: "wide 150 high, fixed parts do not fit (tiny)", wide: true, rootHeight: 150, hasHeading: true, actionsAbsent: false, room: { actions: 90, content: 200, heading: 40 }, want: { height: 158, tiny: true, crowded: false, short: false } },
  { name: "text 200% portrait", wide: false, rootHeight: 700, hasHeading: true, actionsAbsent: false, room: { actions: 190, content: 400, heading: 60 }, want: { height: 299, tiny: false, crowded: true, short: false } },
  { name: "text 200% short", wide: false, rootHeight: 380, hasHeading: true, actionsAbsent: false, room: { actions: 190, content: 400, heading: 60 }, want: { height: 301, tiny: false, crowded: true, short: true } },
  { name: "text 130% portrait", wide: false, rootHeight: 700, hasHeading: true, actionsAbsent: false, room: { actions: 110, content: 260, heading: 44 }, want: { height: 200, tiny: false, crowded: false, short: false } },
  { name: "before measurement portrait", wide: false, rootHeight: 700, hasHeading: true, actionsAbsent: false, room: { actions: 0, content: 0, heading: 0 }, want: { height: 252, tiny: false, crowded: false, short: false } },
  { name: "before measurement short", wide: false, rootHeight: 380, hasHeading: true, actionsAbsent: false, room: { actions: 0, content: 0, heading: 0 }, want: { height: 252, tiny: false, crowded: false, short: true } },
  { name: "before measurement wide", wide: true, rootHeight: 768, hasHeading: false, actionsAbsent: false, room: { actions: 0, content: 0, heading: 0 }, want: { height: 252, tiny: false, crowded: false, short: false } },
  { name: "before measurement rootHeight 0", wide: false, rootHeight: 0, hasHeading: true, actionsAbsent: false, room: { actions: 0, content: 0, heading: 0 }, want: { height: 234, tiny: false, crowded: false, short: false } },
  { name: "actions absent, heading measured", wide: false, rootHeight: 700, hasHeading: true, actionsAbsent: true, room: { actions: 0, content: 150, heading: 34 }, want: { height: 200, tiny: false, crowded: false, short: false } },
  { name: "actions absent, heading not yet", wide: false, rootHeight: 700, hasHeading: true, actionsAbsent: true, room: { actions: 0, content: 0, heading: 0 }, want: { height: 252, tiny: false, crowded: false, short: false } },
  { name: "no heading, actions measured", wide: false, rootHeight: 700, hasHeading: false, actionsAbsent: false, room: { actions: 80, content: 150, heading: 0 }, want: { height: 200, tiny: false, crowded: false, short: false } },
  { name: "crowded 600 high", wide: false, rootHeight: 600, hasHeading: true, actionsAbsent: false, room: { actions: 150, content: 200, heading: 34 }, want: { height: 235, tiny: false, crowded: true, short: false } },
  { name: "60% cap decides height, cap 179 < required 185", wide: false, rootHeight: 450, hasHeading: true, actionsAbsent: false, room: { actions: 100, content: 300, heading: 34 }, want: { height: 179, tiny: false, crowded: true, short: false } },
  { name: "60% cap decides height, cap 199 < required 205", wide: false, rootHeight: 500, hasHeading: true, actionsAbsent: false, room: { actions: 120, content: 300, heading: 34 }, want: { height: 199, tiny: false, crowded: true, short: false } },
  { name: "crowded at exact equality actions+72 == base 200 (not crowded)", wide: false, rootHeight: 600, hasHeading: true, actionsAbsent: false, room: { actions: 128, content: 200, heading: 34 }, want: { height: 204, tiny: false, crowded: false, short: false } },
  { name: "crowded one over actions+72 == base+1", wide: false, rootHeight: 600, hasHeading: true, actionsAbsent: false, room: { actions: 129, content: 200, heading: 34 }, want: { height: 214, tiny: false, crowded: true, short: false } },
  { name: "tiny at exact equality fixed+42 == root 172 (not tiny)", wide: true, rootHeight: 172, hasHeading: true, actionsAbsent: false, room: { actions: 90, content: 200, heading: 40 }, want: { height: 158, tiny: false, crowded: false, short: false } },
  { name: "tiny one over fixed+42 == root+1", wide: true, rootHeight: 171, hasHeading: true, actionsAbsent: false, room: { actions: 90, content: 200, heading: 40 }, want: { height: 158, tiny: true, crowded: false, short: false } },
  { name: "content under one line 0 < 20 < 42 lowers required height", wide: false, rootHeight: 300, hasHeading: true, actionsAbsent: false, room: { actions: 60, content: 20, heading: 34 }, want: { height: 123, tiny: false, crowded: true, short: true } },
  { name: "stale actions measure ignored when actionsAbsent", wide: false, rootHeight: 300, hasHeading: true, actionsAbsent: true, room: { actions: 80, content: 150, heading: 34 }, want: { height: 105, tiny: false, crowded: false, short: true } },
  { name: "hasHeading false: heading height is not added to the fixed height (short path only; textScale still reads it)", wide: false, rootHeight: 300, hasHeading: false, actionsAbsent: false, room: { actions: 80, content: 150, heading: 50 }, want: { height: 131, tiny: false, crowded: true, short: true } },
  { name: "wide with rootHeight 0 is never tiny", wide: true, rootHeight: 0, hasHeading: true, actionsAbsent: false, room: { actions: 90, content: 200, heading: 40 }, want: { height: 158, tiny: false, crowded: false, short: false } },
]

describe('panelLayout（切り出し前の算術と同じ値を返す）', () => {
  it.each(rows)('$name', ({ name: _name, want, ...input }) => {
    const got = panelLayout(input)
    expect(got.height).toBeCloseTo(want.height, 10)
    expect(got.tiny).toBe(want.tiny)
    expect(got.crowded).toBe(want.crowded)
    expect(got.short).toBe(want.short)
  })

  it('境目の定数は切り出し前と同じ', () => {
    expect(PANEL_SCROLL_MIN).toBe(72)
    expect(PANEL_BODY_MIN).toBe(42)
    expect(SHORT_ROOT_HEIGHT).toBe(420)
  })
})

describe('panelLayout（見出しに状態の1行が入った時の文字倍率）', () => {
  const input = { wide: false, rootHeight: 437, hasHeading: true, actionsAbsent: false }
  it('名前の行が測れていれば、見出し全体（名前＋状態の1行）ではなく名前の行から倍率を推す', () => {
    // 見出し 50 = 余白 8 + 名前 26 + 状態 16。文字は等倍なので本文1行の床は 8+16=24
    expect(panelLayout({ ...input, room: { actions: 106, content: 200, heading: 50, title: 26 } }).height).toBe(189)
  })
  it('名前の行が未計測なら、今まで通り見出しの高さから推す', () => {
    expect(panelLayout({ ...input, room: { actions: 106, content: 200, heading: 50 } }).height).toBe(199)
    expect(panelLayout({ ...input, room: { actions: 106, content: 200, heading: 50, title: 0 } }).height).toBe(199)
  })
})

describe('statusPlacement（状態の1行の置き場）', () => {
  it.each([
    { name: '未計測は本文', fit: { row: 0, title: 72, status: 130 }, want: 'body' },
    { name: '名前＋間隔＋状態が行に入れば名前の右', fit: { row: 358, title: 72, status: 130 }, want: 'beside' },
    { name: '丁度の幅（名前が縮んだ値）は右に置かん', fit: { row: 358, title: 219, status: 130 }, want: 'below' },
    { name: '右に入らんが1行に収まれば名前の下', fit: { row: 288, title: 180, status: 254 }, want: 'below' },
    { name: '状態の1行が行幅いっぱい（折り返し）なら本文', fit: { row: 358, title: 150, status: 358 }, want: 'body' },
  ])('$name', ({ fit, want }) => {
    expect(statusPlacement(fit)).toBe(want)
  })
})
