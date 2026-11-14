この PR のレビューと関門の記録（1 つにまとめた）。

<details><summary>REVIEW | reviewer: general-purpose, opus 5.5 medium | authored no commit on this PR | head bc4226ed5330b8437d9df8a787fe9ebecafdbd62 | axes: pass line, design, scope, tests, a11y, evidence | verdict FA</summary>

REVIEW | reviewer: general-purpose, opus 5.5 medium | authored no commit on this PR | head bc4226ed5330b8437d9df8a787fe9ebecafdbd62 | axes: pass line, design, scope, tests, a11y, evidence | verdict FAIL | must 1 want 2 nit 2

対象: fix/255-inline-chip-labels（d7eeccc, bc4226e）。base は origin/develop e7c380f。merge-base も e7c380f で、develop の先頭に乗っている。

## pass line
0件。
- 使い捨ての detached worktree に `pnpm install --frozen-lockfile --offline` を入れた（成功）。type-check 0 / lint 0 / test 0（51 ファイル・1414 件 passed）/ validate:coords 0（「座標ゲート OK」）。worktree は終了後に削除した。
- `git merge-tree --write-tree origin/develop bc4226e` は終了コード 0、tree 2c56d11 で衝突なし。
- e2e は指示どおり走らせていない。「full e2e 275 passed」と「develop で新テストが落ちる（268 > 200）」は（未確認）。before-390x844-none.png で深さの行が欄の下で切れているので、後者とは辻褄が合う。

## design
0件。
- doc/design/project/review-2026-11-anatomy.dc.html:31-32 `.srow{display:flex;align-items:center;gap:8px}` / `.k{width:28px;flex:none}`。実装の src/app/(tabs)/index.tsx:387-392（`chipGroupRow` row + center + gap 8、ラベルは `minWidth:28` + `flexShrink:0`）と合っている。幅を固定せず下限にした理由（文字拡大・英語）はコメントにある。
- 1440 の案（同ファイル 169-）は見出しがチップの上（`p.sec` の下に `seg`）。`wide` の時の `chipGroupRowStacked`（column）で縦積みに戻している。
- 状態の1行を隠す判断: 案 390px・何も選んでいない時（同ファイル 83-109）には `nt2`「左側望 · 筋肉 · 表層筋」が無く、案 390px・部位を選んでいる時（同 112-）には残っている。index.tsx:160 `wide||selected` は案とそのまま一致する。1440 の案にもこの行は無いが、wide では残している。これは控えめな側に倒した判断で、既存の e2e（conditions.spec.ts:44,86 など）が 1280/1440 でこの行を引いているので妥当。

## scope
0件。変更は index.tsx の1ファイル、spec 1件の追加、e2e/tools の道具1本、証跡 PNG 10枚だけ。「表示条件」ボタンが 390 の未選択時にも残っている点（案には無い）は既存の挙動で、この PR では触っていない。それで正しい。

## tests
- **must** .maestro/smoke/view-toggle.yaml:31,44 と .maestro/device/263-anatomy-conditions.yaml:76-79,90-93,111-114,135-138,155-158,178-181,194-197（.maestro/device/common/reveal-status.yaml 経由）が、縦向きの電話で何も選んでいない時に状態の1行（「左側望 · 内臓」「左側望 · 筋肉 · 表層筋」など）を `assertVisible` で確かめている。index.tsx:160 で、この条件では行が出なくなる（場所「頭部」だけを選んだ 155-158 も `selected===null` なので同じ）。smoke は .github/workflows/maestro-smoke.yml の日次 schedule（Android）で走るので、マージ後に CI で落ちる。263 のフローは #263 の実機受け入れの正本で、これも壊れる。Web の e2e が通るのは、既定の viewport（Desktop Chrome 1280x720）が wide だから。直し方: 状態の確認を、チップの選択状態（例: `assertVisible: {id: chip-muscle, checked: true}`）に置き換える。reveal-status.yaml と doc/handoff.md:209 の記述も合わせて直す。
- **want** 1440 で「ラベルがチップの上に残る」ことを確かめる assertion が無い。e2e/anatomy-condition-chips.spec.ts:185-207 はチップの位置と見えるかしか見ておらず、`chipGroupRowStacked` を消しても通る。390 側の 87-91 と対になる形で、1440 では `label.y + label.height <= first.y + 1` と `label.x ≈ first.x` を足してほしい。
- 新しい assertion が空振りでないかの確認: e2e/anatomy-condition-chips.spec.ts:77-78 は `anatomy-panel-scroll` の `scrollHeight <= clientHeight` を見ている。RN-web の ScrollView は testID を持つ要素そのものがスクロール枠で、同じ spec の 263-268 も同じ要素で「溢れる」側を確かめている。欄の高さは src/core の panelLayout が `Math.min(200, rootHeight*0.35)` に抑え、中身の高さは `Math.min(room.content, PANEL_BODY_MIN)` で頭打ちになる。中身に合わせて欄が伸びることはないので、溢れを本当に測っている。93-94 の各行が欄の内側にあるかの座標チェックも、二重の網として効いている。ここは空振りではない。

## a11y
0件。
- 状態の1行は index.tsx:160 で、縦長かつ未選択の時だけ消える。それでも状態は src/ui/chip-row.tsx の `accessibilityRole="radiogroup"` + `accessibilityLabel`（層 / 向き / 深さ）と、各チップの `accessibilityRole="radio"` + `aria-checked` で読み上げられ、届く（native では state.checked）。同じ情報を2回読ませなくなるので、むしろ改善。部位を選んでいる時はチップが消えるが、その時は行が残る（index.tsx:160 の `selected`）。wide では両方残る。
- ラベルの Text は `minWidth:28` + `flexShrink:0` で、after-320x568-text200-depth.png でも「深さ」が割れていない。

## evidence
- **want** 1440（wide）の after 画像が無い。wide 側もマークアップを組み替えている（各行を `chipGroupRow` + `chipGroupRowStacked` で包んだ）。AGENTS.md「UI を直したら、直した画面の前後を同じ条件で撮って PR に貼る」と依頼の「1440 では上のまま」を示す証跡として、e2e/tools/anatomy-inline-labels-evidence.spec.ts に 1440x900 の1枚を足してほしい。
- 目で見て確かめたもの（Read）: after-390x844-none.png はラベルが3行とも各行の左にあり、深さの行まで欄に収まっていて、状態の1行は無い。before と並べると、before は深さの行が切れている。after-390x844-selected.png は上腕頭筋の選択中で、チップは無く名前と操作が出ている。after-320x568-text200-depth.png は「深さ」がチップの左にあり、チップは折り返している。主張どおり。
- 道具が既定の実行から外れているか: playwright.config.ts の `testIgnore: ['**/tools/**']` で外れている。拾うのは playwright.shots.config.ts（`pnpm shots`）だけ。書き出し先の既定は doc/evidence/255-inline-labels で、既定の e2e は doc/ を書き換えない。
- **nit** before/after-390x844-selected.png と before/after-320x568-text200.png は、バイト単位で同じファイル（cmp で一致）。「変わらないこと」の証拠としては正しいが、PR 本文で「同一であることが意図」と一言書いておくと、撮り忘れと間違われない。

## その他
- **nit** src/app/(tabs)/index.tsx:391 `chipGroupChips: { flex: 1, minWidth: 0 }` は、wide の column 方向（390 `chipGroupRowStacked`）でも効いたままになる。Web では問題が出ない（1440 の e2e が通っている前提）。ただ native（Yoga）で、高さの決まらない親の中に flexBasis 0 の子を置くことになる。意図は「横並びの時だけ残り幅を取る」なので、stacked 側で `flex: 0`（または `flexGrow: 0`）に戻しておくと誤解がない。タブレット横向きの native では（未確認）。

見たもの: `git diff origin/develop...bc4226e`、index.tsx の AnatomyPanel と panelLayout、chip-row.tsx、e2e/anatomy-condition-chips.spec.ts / conditions.spec.ts / ipad-landscape.spec.ts、playwright.config.ts / playwright.shots.config.ts、.maestro/smoke/view-toggle.yaml、.maestro/device/263-anatomy-conditions.yaml と common/reveal-status.yaml、.github/workflows/maestro-smoke.yml、デザイン review-2026-11-anatomy.dc.html、after/before の PNG 5組。


</details>

REVIEW | reviewer: general-purpose, opus 5.5 medium | authored no commit on this PR | head 5e8b686f9572b394545ec6cbe71674f3a4122850 | axes: previous findings, design, scope, tests, a11y, evidence | verdict PASS | must 0 want 0 nit 3

対象: fix/255-inline-chip-labels（e03b062 がコード、5e8b686 は撮り直した画像だけ）。前回のヘッドは bc4226e。base は origin/develop 57cb049（#310 を含む）。merge-base は e7c380f。
2026-11-14 時点で、origin/fix/255-inline-chip-labels は e03b062 を指している。5e8b686 はローカルのブランチ（/home/user/wt-255fix）にしか無い（evidence の nit 1 を参照）。

実行したこと: 使い捨ての detached worktree（5e8b686）に `pnpm install --frozen-lockfile --offline` を入れた（成功）。
- `node scripts/check-agent-entrypoints.mjs`: 終了コード 0（「共通 Skill 2 件、入口にずれなし」）
- `node --test .github/ci/run.test.mjs`: 10 件中 10 件 pass
- `node .github/ci/run.mjs checks`: 終了コード 0。type-check / lint / vitest（51 ファイル・1414 件 passed）/ validate:coords（「座標ゲート OK（配置済み 119 件は全て馬体の上）」）/ derive:left・front・rear のどれも通った。derive の後も `git status --porcelain` は空
- `git merge-tree --write-tree origin/develop 5e8b686`: 終了コード 0、tree 7e4d138 で衝突なし。#310 が触ったのは src/app/(tabs)/catalog/[id].tsx・src/ui/icons.tsx・e2e/catalog-detail-map.spec.ts・e2e/tools/button-row-evidence.spec.ts・doc/evidence/258-button-row/ だけ。この PR の変更（index.tsx・anatomy-condition-chips.spec.ts・e2e/tools/anatomy-inline-labels-evidence.spec.ts・doc/evidence/255-inline-labels/）とは、ファイルが1つも重ならない
- worktree は終わった後に `git worktree remove --force` で消し、prune した
- e2e と Playwright は、指示どおり走らせていない。作者の報告（「full e2e 276 passed」「develop で溢れのテストが落ちる（268 > 200）」「`chipGroupRowStacked` を消すと 1440 のテストが落ちる」）は（未確認）。下の tests 節で、コードを読んで辻褄が合うかを確かめた

## previous findings
0件。前回の must 1・want 2・nit 2 は、すべて解消済みか対応済み。
- **must（状態の1行）→ 解消**。src/app/(tabs)/index.tsx:159 で、状態の1行が条件なしの描画に戻った。`git diff origin/develop 5e8b686 -- 'src/app/(tabs)/index.tsx'` でも、この行に差分は出ない。develop の index.tsx:147 と同じく無条件。`.maestro/` の差分も無い（`git diff --stat origin/develop...5e8b686 -- .maestro` は空）。`.maestro/` で状態の1行を見ている assertion を全部 grep して、1つずつ確かめた:
  - .maestro/smoke/view-toggle.yaml:31「左側望 · 内臓」と :44「右側望 · 内臓」はスクロールしない。内臓の層には深さの行が無く、本文は 4+20+8+92+8+16+4 = 152px で 200 に収まる。だから見える範囲に出る
  - .maestro/device/263-anatomy-conditions.yaml:76-79, 90-93, 111-114, 135-138, 155-158, 178-181, 194-197 は、どれも common/reveal-status.yaml（欄の中だけを `notVisible` の間、最大2回スワイプする）を通してから `assertVisible` する。行は全部の状態で描かれ、出し方も develop と同じなので、develop で通っていた状態はそのまま通る（実機では未確認）。場所「頭部」だけを選んだ状態（155-158）も、`selected===null` で行が出る
  - .maestro/device/275-detail-location-map.yaml:21,72 の「·」は図鑑の詳細のリンクの文字で、この行とは別物
- **want 1（1440 で見出しが上に残ることを確かめる）→ 対応済み**。e2e/anatomy-condition-chips.spec.ts:210-219。
- **want 2（1440 の after 画像）→ 対応済み**。e2e/tools/anatomy-inline-labels-evidence.spec.ts:52-59 と、doc/evidence/255-inline-labels/after-1440x900-none.png。
- **nit（stacked の時の `flex:1`）→ 対応済み**。src/app/(tabs)/index.tsx:394 `chipGroupChipsStacked: { flexGrow: 0, flexShrink: 1, flexBasis: 'auto' }` を、3行とも `wide` の時だけ重ねている（118, 125, 133 付近）。column 方向で flexBasis 0 の子を置かなくなった。幅は親の `alignItems: 'stretch'` で決まるので、チップの折り返しは変わらない。
- **nit（同一バイトの画像）**: evidence の nit 2 に残す。

## design
- **nit** 収まり方の余白は 0px。390x844 で何も選んでいない時、本文は 4（上の余白）+20（hint）+8+140（チップ 44×3 + 間 4×2）+8+16（状態の1行）+4（下の余白）= 200 で、欄の高さ `Math.min(200, 844*0.35)` = 200 とちょうど同じになる（src/core/panel-height.ts の panelLayout、src/app/(tabs)/index.tsx:292, 379）。脆いかの判断:
  - フォントの代替: hint（lineHeight 20）と note（lineHeight 16）は行の高さを固定している。チップは `minHeight: 44` で、13px のラベルは 8+行高+8 が 44 を超えない限り高さが変わらない（src/ui/chip-row.tsx:72,74）。だから、代替フォントで高さが変わることはまず無い。
  - 文字の拡大（native の fontScale 1.1〜1.15 や、英語の長いラベルで行が折り返す時）: hint と note は数 px 伸び、状態の1行が欄の下に少しかかる。それでも欄は ScrollView なので、内容は失われずスクロールで届く。develop では同じ条件で 68px 溢れていたので、この PR で悪くなる状態は無い。1x・日本語の 390 は、spec の 77-78 と 93-94 が回帰を止める。
  - 結論: want にはしない。ただ、後でこの欄に1行でも足すと、390 の溢れのテストがすぐ落ちる。src/app/(tabs)/index.tsx:378 のコメントに「余白 0・合計 200 ちょうど」と内訳を書いておくと、次に触る人が理由を辿れる。
- `snug` の範囲: src/app/(tabs)/index.tsx:224 `snug={!wide && showChips}`（`showChips = wide || selected === null`、113 行）なので、実際の条件は「縦長で何も選んでいない時」だけ。wide では false になり、効かない。短い画面（`short`）では、後ろの `contentShort` が `paddingVertical:4, gap:4` で上書きするので、二重に詰まることもない（292 行のスタイルの並び順）。部位を選んでいる時は今までどおり 8 のまま。after-390x844-selected.png が before と同じバイトなのも、これと合う。
- `contentSnug` は上下の余白だけを詰めていて、チップが押せる高さ 44 には手を付けていない（379 行のコメントどおり）。

## scope
0件。コードの差分は index.tsx の1ファイルだけ（snug・状態の1行を戻す・stacked の flex）。あとは spec に1件足しただけ、証跡の道具に1枚足しただけ、PNG を撮り直しただけ。`.maestro/` には手を付けていない。リードの決定（状態の1行は常に出す、Maestro は直さない、8px は欄の余白から取る）と一致している。

## tests
0件。
- 1440 のテスト（e2e/anatomy-condition-chips.spec.ts:210-219）が落ちうるか: 見出しの下端 ≤ 先頭チップの上端 +1 と、左端の差 ≤ 20 を見ている。`chipGroupRowStacked` を消すと、行は `flexDirection: 'row'` + `alignItems: 'center'` になる。見出しはチップの左で縦の中心に来るので、見出しの下端 > チップの上端 となって、1つ目の expect で落ちる。develop の構造（見出しの Text がチップ行の上の別の要素）なら通る。作者の「消すと落ち、古いコードでは通る」は、コードからは辻褄が合う（実行は未確認）。
- 390 の溢れのテスト（77-78）: `anatomy-panel-scroll` の scrollHeight ≤ clientHeight を見ている。前回確かめたとおり、この要素そのものがスクロール枠で、欄の高さは中身に合わせて伸びない。develop の 268px なら落ちる。

## a11y
0件。状態の1行は、どの状態でも develop と同じく出る。チップ（radiogroup / radio + aria-checked）と合わせて二重になるのも develop と同じ。行の見え方とタップできる高さは変わらない。320x568・文字 200% では欄がスクロールに回り、「深さ」の見出しも割れていない（画像を参照）。

## evidence
- 目で見て確かめたもの（Read）:
  - after-390x844-none.png: 層・向き・深さのラベルが各行の左にある。その下に「左側望 · 筋肉 · 表層筋」が欄の下端のすぐ上に見えていて、切れていない。主張どおり。
  - after-1440x900-none.png: 右の欄で「層」「向き」「深さ」が、それぞれのチップの上で左端を揃えて縦に積まれている。境目の線の下に hint と状態の1行がある。デザインの 1440 案（見出しがチップの上）と合う。
  - after-320x568-text200-depth.png: 「深さ」が「表層筋」の左にあり、「深層筋（図なし）」が折り返している。その下に状態の1行がある。欄はスクロールしている状態。主張どおり。
- **nit 1** 2026-11-14 時点で、origin のブランチは e03b062 で、5e8b686（撮り直した画像と 1440 の2枚）はまだ push されていない。PR に貼る画像はこのコミットにしかないので、push してから PR 本文を更新すること（ローカルの /home/user/wt-255fix の fix/255-inline-chip-labels は 5e8b686）。
- **nit 2** before-1440x900-none.png と after-1440x900-none.png はバイト単位で同じ（cmp で一致）。before/after-390x844-selected.png も同じ。「wide を column で組み直しても、見た目は 1px も変わらない」ことの証拠としては正しい。ただ、before を develop で撮ったのか同じビルドで撮ったのかが画像からは分からないので、PR 本文に「同じなのは意図どおり。before は develop（e7c380f）で撮った」と書いておくこと。


LOCAL-CHECK | head 38a0e0f795b01178aecfa6616b47c0f405f1a05b | node scripts/check-agent-entrypoints.mjs && node --test .github/ci/run.test.mjs && node .github/ci/run.mjs checks && pnpm build && node .github/ci/run.mjs e2e | pass: entrypoints OK・run.test 10/0・unit 1428・build OK・e2e 282 / fail 0・作業ツリー変更 0 | 2026-11-14T14:08Z

ローカルで通れば通ったと見なす（所有者の決定）。hosted CI が緑とは書かない。

GATE | head 38a0e0f795b01178aecfa6616b47c0f405f1a05b | review このコメントの中の REVIEW: 5e8b686（PASS、must 0） | evidence https://github.com/kouiso/equus-anatomy/blob/7793fef63c27908204e131878ec6e25592916128/evidence/317-38a0e0f.png | checks local（上の LOCAL-CHECK、develop を取り込んだ head で） | deploy no production deploy（develop へ） | repo rule met（未解決のレビューのスレッド 0） | changed after pass: develop（#311 を含む 23ed8cc）の取り込みだけ。#311 と同じ index.tsx を触るので、取り込んだ head で一式を取り直した

---
_Generated by [Claude Code](https://claude.ai/code)_
