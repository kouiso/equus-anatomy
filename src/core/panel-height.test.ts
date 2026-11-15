import { describe, expect, it } from 'vitest'
import { PANEL_BODY_MIN, PANEL_SCROLL_MIN, SHORT_ROOT_HEIGHT, EMPTY_STATUS_FIT, measureStatusFit, panelLayout, statusPlacement, type PanelLayout, type PanelRoom } from './panel-height'

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
  const base = { row: 358, title: 72 }
  it.each([
    { name: '見出しが未計測なら本文', fit: { ...base, row: 0, at: 'below', box: 358, status: 130 }, want: 'body' },
    { name: '置き場の組が揃うまではその置き場のまま', fit: { ...base, at: 'below', box: 0, status: 130 }, want: 'below' },
    { name: '名前＋間隔＋状態が行に入れば名前の右', fit: { ...base, at: 'body', box: 343, status: 130 }, want: 'beside' },
    { name: '丁度の幅（名前が縮んだ値）は右に置かん', fit: { ...base, title: 219, at: 'beside', box: Infinity, status: 130 }, want: 'below' },
    { name: '右に入らんが1行に収まれば名前の下', fit: { row: 288, title: 180, at: 'body', box: 273, status: 254 }, want: 'below' },
    { name: '名前の下で器いっぱい（折り返し）なら本文', fit: { ...base, at: 'below', box: 358, status: 358 }, want: 'body' },
    { name: '本文で器いっぱい（折り返し）なら本文に留まる', fit: { ...base, at: 'body', box: 343, status: 343 }, want: 'body' },
  ] as const)('$name', ({ fit, want }) => {
    expect(statusPlacement(fit)).toBe(want)
  })
})

describe('measureStatusFit（置き場の違う幅を組にしない）', () => {
  it('置き場が変わったら、前の置き場の器と幅は捨てる', () => {
    const inBody = { row: 358, title: 150, at: 'body' as const, box: 343, status: 200 }
    expect(measureStatusFit(inBody, 'status', 200, 'below')).toEqual({ row: 358, title: 150, at: 'below', box: 0, status: 200 })
    expect(measureStatusFit(inBody, 'box', 358, 'below')).toEqual({ row: 358, title: 150, at: 'below', box: 358, status: 0 })
    expect(measureStatusFit(inBody, 'status', 200, 'beside')).toEqual({ row: 358, title: 150, at: 'beside', box: Infinity, status: 200 })
  })
  it('0 は捨て、行と名前の幅は置き場に関わらず取り込む', () => {
    const fit = { row: 358, title: 150, at: 'body' as const, box: 343, status: 200 }
    expect(measureStatusFit(fit, 'status', 0, 'body')).toBe(fit)
    expect(measureStatusFit(fit, 'row', 300, 'beside')).toEqual({ ...fit, row: 300 })
  })
})

/**
 * 画面の代わりに、置き場ごとの器の幅で状態の1行を測り直す動きをまねる。
 * 名前の右は縮めずに並べ、名前の下は見出しの行の幅、本文は見出しの行からスクロールバーのぶん狭い器。
 */
function settle(input: { row: number; title: number; natural: number; scrollbar: number; boxFirst: boolean }) {
  const { row, title, natural, scrollbar, boxFirst } = input
  let fit = measureStatusFit(measureStatusFit(EMPTY_STATUS_FIT, 'row', row, 'body'), 'title', title, 'body')
  const places: string[] = []
  for (let i = 0; i < 12; i++) {
    const place = statusPlacement(fit)
    places.push(place)
    const box = place === 'beside' ? Infinity : place === 'below' ? row : row - scrollbar
    const width = Math.min(natural, box)
    fit = boxFirst
      ? measureStatusFit(measureStatusFit(fit, 'box', box, place), 'status', width, place)
      : measureStatusFit(measureStatusFit(fit, 'status', width, place), 'box', box, place)
  }
  return places
}

describe('状態の1行は、本文がスクロールバーのぶん狭くても置き場を往復しない（PR #324 の指摘）', () => {
  const cases = [
    { name: '390px・英語・文字200%（行 358、名前 150、本文 343）', row: 358, title: 150 },
    { name: '250px・英語・等倍（行 218、名前 75、本文 203）', row: 218, title: 75 },
  ]
  for (const c of cases) {
    it(c.name, () => {
      for (let natural = 40; natural <= c.row + 80; natural += 0.5) {
        for (const boxFirst of [true, false]) {
          const places = settle({ row: c.row, title: c.title, natural, scrollbar: 15, boxFirst })
          const last = places.slice(-6)
          expect(new Set(last).size, `幅 ${natural} で置き場が往復: ${places.join(' → ')}`).toBe(1)
          // 一度落ち着いたら、同じ置き場で測り直しても動かん
          expect(places.slice(4).every((p) => p === last[0]), `幅 ${natural}: ${places.join(' → ')}`).toBe(true)
        }
      }
    })
  }

  it('本文で折り返した行（本当の幅が本文の器と行の幅の間）は本文に留まる', () => {
    expect(settle({ row: 358, title: 150, natural: 350, scrollbar: 15, boxFirst: true }).every((p) => p === 'body')).toBe(true)
  })

  it('本文で収まった行は見出しに上がり、そこで落ち着く', () => {
    expect(settle({ row: 288, title: 180, natural: 254, scrollbar: 15, boxFirst: true }).slice(-3)).toEqual(['below', 'below', 'below'])
    expect(settle({ row: 358, title: 72, natural: 130, scrollbar: 15, boxFirst: false }).slice(-3)).toEqual(['beside', 'beside', 'beside'])
  })
})
