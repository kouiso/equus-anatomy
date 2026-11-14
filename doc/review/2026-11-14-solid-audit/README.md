# SOLID 監査報告（#254 SBI-1）

- 対象: kouiso/equus-anatomy `develop`（5a191ea）
- 日付: 2026-11-14
- 種別: 監査の報告のみ。コードも解剖データ（座標・部位名・出典・確信度）も変えていない
- 根拠の取り方: すべて上記コミットのファイルを読んで確かめた。行番号は同コミットのもの。確認していない推測には「（未確認）」を付けた

## 0. 結論

- 違反候補は 12 件。優先度は 高 1 / 中 8 / 低 3。
- 最大の問題は「画面ファイルの中に、状態・寸法の計測・文言・端末分岐・部品の組み立てが同居していること」と、「層・深さ・向きの条件（とくに `layer === 'muscle'` の特別扱い）が画面ごとに書き直されていること」の2つ。挙動が割れている証拠までは見つからなかった。唯一、実際に不整合へ着地する経路があるのは、直 URL で深層筋を開く場合（F12）。
- `src/core/` は純関数が中心で、SOLID の観点では直すものがほぼ無い。保存（storage）の差し替え口も既に切れている。ここは現状維持が妥当（第4章）。
- 一括の書き換えは勧めない。第5章の小さな提案（R1〜R5）を、先に特性化テストを置いてから1つずつ進める。

## 1. 監査対象の一覧

`git ls-files` 相当で数えたファイル数。テスト・データ JSON を含む。

| 対象 | ファイル数 | 内訳 |
|---|---|---|
| `src/core/`（直下） | 41 | 実装 21（`types.ts` を含む）+ 単体テスト 20。下位フォルダを含めた `*.test.ts` は `src/core` 全体で 28 |
| `src/core/data/` | 15 | `structures.ts`（1077行・解剖データ）、`areas.ts`、`index.ts`、`kana.ts`、`name-aliases.ts`、`summary-en.ts`、`supervision.ts`、`silhouettes.json`、テスト 8 |
| `src/core/data/regions/` | 3 | `left.json`（3742行）・`front.json`（1294行）・`rear.json`（727行）。座標の正本。**監査はするが触らない** |
| `src/core/i18n/` | 5 | `messages.ts`（454行）・`translate.ts`・`content.ts`・`index.ts`・テスト |
| `src/ui/` | 52 | 画面部品 tsx 13、状態・保存・補助 ts 31、テスト 8 |
| `src/app/` | 11 | `_layout.tsx`、`+html.tsx`、`+not-found.tsx`、`about.tsx`、`overlay.tsx`、`(tabs)/` 配下 6（`_layout`、`index`、`saved`、`catalog/_layout`、`catalog/index`、`catalog/[id]`） |
| `scripts/` | 47 | 直下 44（テスト 13、sh/mjs 2、残りは座標の生成・検査・測定の ts）+ `migrate/` 3 |
| `.github/ci/` | 4 | `run.mjs`、`run.test.mjs`、`scan.sh`、`README.md` |
| `e2e/`（既定の実行対象） | 28 | spec 27 + 補助 `canvas-layout.ts` 1（15 ファイルが参照） |
| `e2e/tools/`（既定の実行から外れる） | 11 | spec 9 + 補助 `catalog-filter.ts`・`text-scale.ts`。`playwright.config.ts:16` の `testIgnore: ['**/tools/**']` |

この調査で「コード」と見なして読んだのは上表の ts/tsx/mjs/sh。`.github/workflows/`・`.maestro/`・`doc/` は対象外とした。`.maestro/` は実機・エミュレータの試験の流れ定義（`r2`・`smoke`）で、SOLID の責務分割を問う対象ではないと判断したため（読んでいない）。

### 大きい画面ファイルの実測

行数は `wc -l`。`t(` の回数は `grep -o "\bt(" <file> | wc -l`（呼び出しの数。行数ではない）。「混在」は中身を読んだ結果。

| ファイル | 行数 | 構成（行） | 混在している責務 |
|---|---|---|---|
| `src/app/(tabs)/index.tsx` | 414 | 画面本体 29-249（221行）、`AnatomyPanel` 257-312、`IconButton` 314-326、styles 328-414（87行） | 状態の購読（32）・ローカル state 3（39, 79, 100）・モジュール変数 `lastLayout`（23）、文言 `t(` 39 回、端末分岐（73 `Platform.OS`）、寸法の定数と計測（24-27, 267-290）、チップ組み立て（118-136）、ズーム操作、遷移（48-52） |
| `src/app/(tabs)/catalog/index.tsx` | 380 | `chips` 21-28、画面本体 30-228、`Row` 230-301、`LearnedBadge` 303-309、styles 311- | 絞り込み state 5 つと module 共有 state への書き込み（32-74）、文言 `t(` 34 回、検索・絞り込みの呼び出し（89-92）、スクロール位置の保存と復元（214-222）、一覧の行の描画（230-301） |
| `src/app/(tabs)/catalog/[id].tsx` | 254 | 画面本体 23-185、styles 194- | ルート引数の解釈（24-29）、hydration 後の幅判定（39-41）、戻る遷移（43-56）、保存・覚えたの操作（123-149）、本文の描画（151-172）。`t(` 17 回で、4 画面の中では最も少ない |
| `src/app/overlay.tsx` | 262 | 画面本体 27-236、styles 237- | ルート引数の解釈（29-36, 46-48, 59-60）、hydration の待ち（52-56）、セーフエリア（42-45）、条件選択 UI（92-139）、場所・部位の一覧（141-189）、詳細の入れ物（191-204）、バージョン・about 導線（205-215）。`t(` 27 回 |
| `src/ui/anatomy-state.ts` | 187 | 定数 12-16、`State` 18-36、module 変数 38-39、操作 41-187 | 画面の状態 1 つに対し、購読 hook・条件変更・ズーム・選択・場所選択のズーム先の決定（131-152）・pick-guard の時刻（99-102, 144）が同居。`useSyncExternalStore` の外部ストアが module 変数（38-39） |

参考: git の履歴上の変更回数（`git log --follow` の件数）は `index.tsx` 23、`anatomy-state.ts` 13、`catalog/index.tsx` 12、`catalog/[id].tsx` 11、`overlay.tsx` 11。変更が多い順に、直したときの効果も大きい。

## 2. 既に対応済みのもの（重複として報告しない）

| 対応 | 場所 | 状態 |
|---|---|---|
| 「今この図に出る部位」の条件を 1 か所へ（#277） | `src/core/visible-parts.ts` の `isStructureVisible` / `visibleStructures`。呼び出しは `index.tsx:58, 64`、`overlay.tsx:68`、`anatomy-state.ts:135` | 済み。単体テスト `visible-parts.test.ts` あり。本報告の候補に含めない |
| 図鑑・保存の行を縦積みにする判定 | `src/core/compact-row.ts` の `isCompactRow`、hook は `src/ui/compact-row.ts` | 済み。`catalog/index.tsx:31` と `saved.tsx:17` が同じ hook を使う。重複ではない |
| 場所選択直後の迷いタップの猶予 | `src/core/pick-guard.ts`（時刻は引数で受ける純関数） | 済み |
| 1 つ戻る段の判定 | `src/core/back-step.ts` の `nextBackStep` / `backStepPatch` | 済み。`index.tsx:87` と `anatomy-state.ts` が共有 |
| 保存先の差し替え口 | `src/ui/persistence-controller.ts` と `*-storage.ts` / `*-storage.web.ts` 3 組 | 済み（第4章） |

## 3. 違反候補

優先度の付け方: 高 = 変更頻度が高く、次の機能追加を邪魔する。中 = 直すと保守が楽になる、または限られた経路で不整合に着地する（挙動が割れる証拠までは無い）。低 = 実害が見つかっていない。

### 高

#### F1 解剖画面 `index.tsx` が 1 関数に 5 種類の責務を持つ（S）

- ファイル: `src/app/(tabs)/index.tsx`（414行）
- 責務: 画面本体の 1 関数 `AnatomyScreen`（29-249）が、(a) 状態の購読と派生値（32-64）、(b) 図の上に重ねる部品の寸法計算（`overlayHeight` `topUsed` 94-97、`selectorMaxW` `bottomMaxW` 89-99）、(c) 文言と端末分岐（66-73, 107）、(d) チップ・候補・見出し・本文の部品組み立て（109-154）、(e) ズーム・遷移などの操作（41-52, 190-207）を持つ。別に `AnatomyPanel`（257-312）が高さ計測の算術（267-290）を持つ。
- 具体例: パネル高の決め方が `index.tsx:267-287` の算術にあり、純関数ではないので単体テストが無い。確かめられるのは e2e（`e2e/short-flow-scroll.spec.ts`・`text-scale.spec.ts`・`ipad-landscape.spec.ts` など）だけ。`canvasOverlayRects` 等は既に `core/canvas-overlay.ts` へ出ており、同じ型の切り出しが `AnatomyPanel` の算術には未実施。
- リスク: 変更の多い画面（履歴 23 件）に、寸法の算術・文言・端末分岐が絡む。1 か所を直すと別の寸法条件（短い画面・横長・文字拡大）が崩れやすい。
- 優先度: 高
- 対応する: する（ただし小さく）。(1) パネル高の算術を `core/` の純関数へ出す、(2) チップ組み立て（118-136）を部品へ出す、の順。スタイルや JSX の見た目は動かさない。画面全体を hooks とコンポーネントに割る一括の書き換えはしない。理由: 責務の混在は実在するが、JSX と styles は宣言的 UI で、割っても依存は減らない。算術だけが純関数にできて、テストで守れる。

### 中

#### F2 層・深さの条件の規則が画面ごとに書き直されている（DRY / O）

- ファイル: `src/app/(tabs)/index.tsx`、`src/app/overlay.tsx`、`src/core/plate-availability.ts`
- 責務: 「筋層だけが深さを持つ」「層・向きを替えたら、図のある深さへ寄せる」という規則。
- 具体例:
  - `layer === 'muscle'` の直書きが src に 10 か所（`index.tsx:112, 113, 114, 126`、151（`layer==='muscle'` と空白なしの書き方）、`overlay.tsx:65, 118`、`core/plate-availability.ts:21`、`core/types.ts:123`、`core/location-map.ts:85`）。新しい層や深さの扱いが増えると全部を探して直すことになる。
  - 同じチップ 3 組（層・向き・深さ）の組み立てが `index.tsx:118-135` と `overlay.tsx:92-138` に 2 通りある。深さの寄せ方の書き方も違う。`index.tsx:113-114` は層・向きを替えた時点で `fallbackDepth` を掛けて渡す。`overlay.tsx:116` の `setLayer` は層だけ替え、寄せは表示用の `effectiveDepth`（65）で行う。
- 取り下げた疑い（初版の誤り）: 初版は「`overlay.tsx` の適用が生の `depth` を渡すので、コメント（62-64）と食い違う」と書いた。これは誤り。条件画面（`kind=conditions`）の「適用」ボタンは `overlay.tsx:225-226` で `changeConditions(view, layer, effectiveDepth)` を呼び、コメントのとおり寄せた深さで適用している。生の `depth` を渡す 152 と 171-174 は `kind=parts`（場所・部位の一覧）の経路で、そこには条件チップが無く、`index.tsx:51` が現在の状態をそのまま渡すので、深さは変わらない。2 画面の適用結果が割れている証拠は、読んだ範囲では無い。
- リスク: 規則が 2 画面で別々に進化すると、将来どちらかだけが直される恐れ。今の挙動が割れているわけではない。
- 優先度: 中（初版は高。上の誤りを取り下げたため下げた）
- 対応する: する。ただし挙動を変えない整理として。`layerHasDepth(layer)` と「条件変更の正規化」を `core/plate-availability.ts` に置き、両画面が使う。チップ JSX の共通化は最後。理由: 規則の複製は変更理由が同じ（DRY の対象）。ただし割れた挙動の修正ではないので緊急ではない。

#### F3 `overlay.tsx` が責務を多く持ち、画面の状態ストアを直接書き換える（S / D）

- ファイル: `src/app/overlay.tsx`（262行）、`src/app/(tabs)/index.tsx:47`
- 具体例: 部位を選ぶ操作が `overlay.tsx:170-178` で `updateAnatomy({ view, layer, depth, areaId, selectedPartId, ...(view !== current.view ? { zoom: null } : {}) })` を組み立てる。同じ種類の組み立てが `anatomy-state.ts` の `focusAnatomyPart`（154-175）と `changeConditions`（61-69）にもあり、「向きが変わったら zoom を外す」は `anatomy-state.ts:67` と `overlay.tsx:177` の 2 か所にある。`index.tsx:47` の `setSelectedPartId` も `updateAnatomy` を直接呼ぶ。
- リスク: ストアの不変条件（向き変更で zoom を外す、など）が呼び出し側に散る。#67 の pick-guard は「不変条件を呼び出し側へ分散させない」と `anatomy-state.ts:105-107` に書いた方針で、同じ方針が `updateAnatomy` の直接呼びでは崩れている。
- 優先度: 中
- 対応する: する。`anatomy-state.ts` に `selectPartFromList(...)` のような意図を表す操作を足し、`overlay` と `index` から `updateAnatomy` の直接呼びを無くす。画面の分割は別件。理由: 呼び出し側の直接書き込みは実在する依存で、操作名にすれば特性化テストで挙動を守れる。

#### F4 `anatomy-state.ts` に領域ロジックと定数置き場が同居する（S / DRY）

- ファイル: `src/ui/anatomy-state.ts`（187行）、`src/app/(tabs)/catalog/index.tsx:18-19`
- 具体例: (a) `pickAnatomyArea`（131-152）が「寄せ先の部位を選ぶ」条件（`part.layer === state.layer && (part.depth ?? state.depth) === state.depth`、139-141）を持つ。純関数にできる部分が store の中にある。`visibleStructures` に layer/depth を渡す形（`overlay.tsx:68` が実際にそうしている）とも重なる。(b) `VIEWS` / `LAYERS` / `DEPTHS`（12-16）を UI ストアが公開し、`catalog/index.tsx:18-19` が `LAYER_IDS` / `VIEW_IDS` を別に宣言している。同じ集合が 2 つの場所にある。（`types.ts:2,4,7` の型が元。）
- リスク: 層や向きを増やすとき、直す場所が 3 つ以上（型・`LAYERS`・`LAYER_IDS`・`layer.*` の文言キー）。ただし追加は解剖データの拡充側の作業で頻度は低い（未確認）。
- 優先度: 中
- 対応する: する（小さく）。ズーム先の選定を `core/zoom.ts` か新しい `core/area-focus.ts` の純関数へ出す。定数は `core/types.ts` から導く形に寄せ、再宣言を減らす。理由: 純粋にできる計算が store に混ざっているのは SRP の実例。定数は別の変更理由を持たないので 1 か所にまとめてよい。

#### F5 `catalog/index.tsx` の絞り込み setter が同じ 4 行を 5 回繰り返す（DRY / S）

- ファイル: `src/app/(tabs)/catalog/index.tsx:45-74`
- 具体例: `setQ` `setFilter` `setArea` `setView` `setNotLearned` が、module 共有 state への書き込み・`scrollOffset = 0`・React state の更新・`scrollToOffset` の 4 手を同じ形で持つ。状態は `catalogUiState`（`ui/catalog-state.ts:6`）という module 変数でもある。
- リスク: 6 つ目の絞り込みを足すときの写し間違い。画面の挙動が割れる証拠は無い。
- 優先度: 中
- 対応する: する。ただし小さく。1 つの `updateFilter(patch)` にまとめるだけ。`catalogUiState` を hook に替える作業はしない。理由: 4 手は同じ変更理由で動く（絞り込みが変わったら先頭へ戻す）ので DRY が合う。module 共有 state は意図的（`catalog-state.ts:5` のコメント: スタックが作り直されても残すため）で、直すと仕様が変わる。

#### F6 保存・覚えたの操作が `catalog/[id].tsx` と `ui/part-sheet.tsx` に二重にある（DRY）

- ファイル: `src/app/(tabs)/catalog/[id].tsx:123-149`、`src/ui/part-sheet.tsx:38-60`
- 具体例: どちらも `useSaved` / `useMastery` を使い、`testID="save-toggle"` と `testID="mastery-toggle"` のボタンを持ち、`detailBlocks` で本文を描く。import の並びもほぼ同じ（`[id].tsx:6-15` と `part-sheet.tsx:3-11`）。
- リスク: ラベルや状態（`persistence.dirty` の「保存待ち」表示など）の直しが片方に漏れる。testID が同じなので e2e がどちらの画面かを区別しにくい（未確認）。
- 優先度: 中
- 対応する: する。操作ボタンの対（保存・覚えた）だけを共有部品に出す。本文全体の共通化はしない。理由: 画面の構成（全面のページとシート）は変更理由が違い、共通化すると片方の都合が入る。ボタンの状態と文言は同じ変更理由なので共有してよい。

#### F7 hydration を待つ書き方が 4 か所・2 種類ある（DRY / 一貫性）

- ファイル: `src/ui/compact-row.ts:7-24`、`src/app/(tabs)/catalog/[id].tsx:39`、`src/app/overlay.tsx:52-56`、`src/app/+not-found.tsx:11`
- 具体例: `compact-row.ts` と `[id].tsx` は `useSyncExternalStore(noop, () => true, () => false)`。`overlay.tsx` は `useState(Platform.OS !== 'web')` + `requestAnimationFrame`。`+not-found.tsx:11-15` も `overlay.tsx:52-56` と同じ `useState(Platform.OS !== 'web')` + `requestAnimationFrame`。つまり 4 か所は 2 種類（`useSyncExternalStore` 方式が 2、rAF 方式が 2）。理由は同じ（静的書き出しの HTML と食い違うと React #418 が出る）。
- リスク: 書き方ごとに挙動が違う（rAF を挟む/挟まない）。新しい画面で書き忘れると #418 が出る。
- 優先度: 中
- 対応する: する、ただし慎重に。`useHydrated()` を1つ用意し、`compact-row.ts` と `[id].tsx` の 2 つから載せ替える。`overlay` と `+not-found` は rAF 待ちが意図（本文を後から描く）なので、同じ hook にできるかは特性化テストで確かめてから。理由: 同じ変更理由だが、書き方の違いが意図か偶然かが（未確認）。

#### F8 座標の再生成が CI で検査されるのは `left.json` だけ（検証境界）

- ファイル: `.github/ci/run.mjs:10-11`、`scripts/derive-all-left.ts`、`scripts/derive-front.ts`・`derive-rear.ts`
- 具体例: CI の `checks` は `pnpm derive:left` の後に `git diff --exit-code src/core/data/regions/left.json` を実行する。`derive:left` は `derive-all-left.ts` で、実行する 5 つは `derive-areas`、`derive-parts-skin-left`、`derive-parts-left`、`derive-parts-skeleton-left`、`derive-parts-organs-left`。`derive-front.ts`（164-165）と `derive-rear.ts`（122-123）は `front.json` / `rear.json` を書き換えるが、CI の再生成差分の検査には載っていない。`pnpm validate:coords` は別に走る。
- リスク: スクリプトとデータがずれても CI が気づかない恐れ。ただし front/rear の生成スクリプトが今も正本なのか、手で直した結果が正本なのかは（未確認）。コード側は読めても、運用の意図は読めない。
- 優先度: 中
- 対応する: 確認が先。意図を聞いてから、検査に加える/外すを決める。座標データには触らない。理由: 「左は再生成が正本」という契約が front/rear にも及ぶのか不明。推測で検査を増やすと CI が落ち続ける。

#### F12 直 URL で深層筋を開くと、図の無い深さに着地する（検証境界）

- ファイル: `src/ui/anatomy-state.ts:154-175`（`focusAnatomyPart`）、`src/app/(tabs)/index.tsx:41, 53-54, 112`、`src/core/map-entry.ts:20-30`、`src/core/data/structures.ts:272, 285, 298, 311`
- 事実（コードから）:
  - `depth: 'deep'` の部位は 4 件（`muscle-supraspinatus`・`muscle-infraspinatus`・`muscle-iliopsoas`・`muscle-subclavius`。`structures.ts:270, 283, 296, 309`）。`regions/left.json`・`front.json`・`rear.json` には `muscle-deep` のプレートも、この 4 件の図形も無い（`grep` で 0 件）。
  - `focusAnatomyPart` は、`mappableViews(structure)[0]`（空）→ 図形のある向き（無し）→ `structure.views[0]` の順で向きを選び（160-164）、`depth: structure.depth ?? 'superficial'` つまり `'deep'` をそのまま状態に入れる（170）。`fallbackDepth` は通らない。`fallbackDepth` を使うのは `index.tsx:112-114` と `overlay.tsx:65` だけ。
  - 着地後の `index.tsx` は、`plate = plateIdOf(layer, depth)`（53）に生の `depth` を使うので `image` が `undefined` になる（54）。`effectiveDepth`（112）は条件チップの選択表示（128）にだけ使われ、図には効かない。画面の文言は `anatomy.noPlate`（68）と、選択部位が図に無い旨の注記（150）が出る。
  - 入口は `canOpenOnMap`（`map-entry.ts:37`）で止めており、図鑑（`catalog/index.tsx:278`）・詳細（`[id].tsx:64`）・保存（`saved.tsx`）から正規の操作で開くことはできない。残るのは `/?part=<深層筋の id>` の直 URL（`index.tsx:41` が `params.part` を受ける）。直前の `focusAnatomyPart` のコメント（158-159）も「直URLなどへの保険」と認めている。
- 判定: 実在する（コードの経路は上のとおり追えた）。実際の見た目（空の図か）は画面で確かめていないので（未確認）。条件チップは「表層」が選択表示で、図は深層を探して空、という食い違った表示になるはず（未確認）。さらに `index.tsx:151` の状態行は `t(`depth.${depth}`)` と生の `depth` を出すので、状態行は「深層」、チップは「表層」と、同じ画面に 2 つ目の食い違いが出る（コードから。見た目は未確認）。
- リスク: 学習者が共有された URL を開くと、空の図に着地する。出典付きの解剖データには触れないが、見え方に関わる。
- 優先度: 中（入口は塞がれていて、経路は直 URL だけ。ただし深層筋 4 件の図を調達する #50 が進むと、条件が変わる）
- 対応する: する。R1（第5章）。方針は 2 案で、どちらにするかは人が決める（表示の仕様）。(a) `focusAnatomyPart` で筋層なら `fallbackDepth(geometry, depth)` を通す。図のある表層筋に着地するが、選んだ深層筋は図に出ない。(b) 図に出せない部位は層・深さを変えず、選択だけにして注記を出す。いずれも座標・部位名・出典は変えない。理由: 入口の判定と着地の判定が `map-entry.ts` の同じ基準（`partDrawableIn`）に揃っているのに、深さの寄せだけが揃っていない。

### 低

#### F9 `derive-front.ts` と `derive-rear.ts` の補助関数の複製（DRY）

- ファイル: `scripts/derive-front.ts:27-35`、`scripts/derive-rear.ts:25-33`
- 具体例: `box` と `pt` は同一で、差は `OFF_X`・`OFF_Y`（596/8 と 584/4）だけ。左側の生成は `scripts/region-json.ts` を共有している。
- リスク: 小さい。生成ツールで、変更頻度も低い（未確認）。
- 優先度: 低
- 対応する: しない（今は）。理由: 座標を生む道具に触る変更は、出力が 1 桁でも変われば解剖データを動かす。F8 の判断が先。共通化しても読みやすさはほとんど上がらない。

#### F10 `run.mjs` が `playwright.config.ts` の sha256 を固定している

- ファイル: `.github/ci/run.mjs:17-25`
- 具体例: CI の入口が、実行の順序の組み立てと、`playwright.config.ts` の指紋照合（22 行目の固定ハッシュ）を同居させる。設定を 1 文字直すと指紋が合わず、無条件で全検査へ戻る（fail-safe）。
- リスク: 設定を直した人がハッシュの更新を忘れると、E2E のビルド省略が静かに効かなくなるだけで、壊れはしない。
- 優先度: 低
- 対応する: しない。理由: 安全側（合わなければ全検査）に倒れていて、CI の分割は `run.test.mjs`（145行）で守られている。直すなら「なぜ」のコメント（17行目）の通り設計を見直す話で、SOLID の問題ではなく CI の最適化。SBI-4 の議題。

#### F11 `catalogUiState` が module 変数（D）

- ファイル: `src/ui/catalog-state.ts:6-22`
- 具体例: 検索・絞り込み・スクロール位置を module のオブジェクトで持ち、画面が直接書く（`catalog/index.tsx:46, 52, 58, 64, 70, 215`）。テストでは差し替え口が無い。
- リスク: 小さい。保存データではなく、スタックの作り直しを生き延びるための意図的な作り（`catalog-state.ts:5`）。
- 優先度: 低
- 対応する: しない。理由: 差し替えたい外部 I/O ではなく、純粋なメモリ上の画面状態。D を適用する対象に当たらない。F5 の整理だけで十分。

## 4. 現状維持が妥当な箇所

| 場所 | 理由（コード根拠） |
|---|---|
| `src/core/` の純関数群（`geometry.ts`、`zoom.ts`、`hit-test.ts`、`mask.ts`、`label-layout.ts`、`search.ts`、`back-step.ts` など） | 画面に依存せず、`*.test.ts` が 28 本ある。クラスやインターフェースを足しても依存は減らない。issue の「純粋関数に不自然なクラスを強制しない」に当たる |
| `src/core/pick-guard.ts` | 時刻を引数で受ける純関数（`pickGuardActive(transitionAt, now)`）。`Date.now()` は呼び出し側 `anatomy-state.ts:102, 144` だけで、テストは fake timer で固定できている（`anatomy-state.test.ts:48, 101, 109, 116`）。D の面で足りている |
| 保存の 3 組（`saved-` / `mastery-` / `locale-`） | `PersistenceStorage` 型（`persistence-controller.ts:11-16`）が差し替え口で、native は AsyncStorage、Web は localStorage を `.web.ts` で出し分ける。`persistence-controller.test.ts`（154行）、`locale-controller.test.ts` あり。D の理想形に近い。SRP の面でも、キー定義（`*-key.ts`）・保存（`*-storage*.ts`）・状態（`*-store.ts`）に分かれている |
| `src/core/data/structures.ts`（87 部位）と `regions/*.json` | データ駆動。部位を足すのはデータの追加で、分岐の修正は要らない。継承構造に替えるのは過剰。内容は解剖データなので触らない |
| `src/core/i18n/` | `translate.ts` が 61 行で、言語は `CATALOGS` の表から引く。言語を足すのは表の追加。O を満たす |
| `src/core/visible-parts.ts`、`src/core/compact-row.ts` | 第2章。済み |
| `catalog/index.tsx` の `Row`（230-301）と `saved.tsx` の `Row`（90-124） | 見た目は似ているが、中身（層・場所の表示、学習済みの札、削除ボタン）が違い、変更理由も別。共通化すると片方に不要な props が増える（I の逆効果） |
| JSX と `StyleSheet`（各画面の styles） | 宣言的 UI。行数は多いが、割っても責務は減らない |
| `ui/error-boundary.tsx:47-48, 85` と `ui/speech.ts:15-18, 33` の端末分岐 | 端末依存の処理が 1 ファイルの中の小さな分岐に閉じている。`speech.ts` は `speech.test.ts`（147行）で守られ、`core/speech.ts` が純粋部分を持つ |
| `e2e/` の補助 3 つ（`canvas-layout.ts`、`tools/catalog-filter.ts`、`tools/text-scale.ts`） | 33 / 10 / 42 行で単機能。巨大な共通基盤にはなっていない |

## 5. 提案するリファクタリング（R1〜R5）

issue #254 の SBI-1〜SBI-4 と区別するため、この報告の提案は R1〜R5 と呼ぶ。小さく・単独でマージできる順。並べ方はリスクの低さと効果の大きさ。各 R の前に、先に置く特性化テスト（issue の SBI-2 にあたる作業）を書く。画面の見た目を直す R では、AGENTS.md の決まりに従い、前後を同じ条件で撮って PR に貼る。

| # | 提案 | 先に置く特性化テスト | 受け入れテスト（1 行） | 対応 |
|---|---|---|---|---|
| R1 | 直 URL で深層筋を開いた時の着地を決め、`focusAnatomyPart` を直す（表示の仕様は人が選ぶ。F12 の 2 案） | `anatomy-state.test.ts` に「`depth: 'deep'` の部位を `focusAnatomyPart` した後の `view`/`layer`/`depth`/`zoom`」を現状のまま記録し、`map-entry.test.ts` の `canOpenOnMap` の表と並べる | 4 件の深層筋を `focusAnatomyPart` した後、`geometry.images[plateIdOf(layer, depth)]` が定義済み（案 a）、または選択のみで層・深さが変わらない（案 b） | F12 |
| R2 | `layerHasDepth` と条件の正規化を `core/plate-availability.ts` に置き、`'muscle'` 直書きを 2 画面から無くす（151 の空白なしの形も含む）。挙動は変えない | `plate-availability.test.ts` に層ごとの深さの寄せ先の表。既存の `anatomy-condition-chips.spec.ts`・`conditions.spec.ts` が現状を固定している | `grep -nE "layer ?=== ?'muscle'" src/app` が 0 件（`layer==='muscle'` のような空白なしも拾う）、上の 2 本の e2e が緑 | F2 |
| R3 | 部位選択の操作を `anatomy-state.ts` へ寄せ、`overlay` / `index` から `updateAnatomy` の直接呼びを無くす | `anatomy-state.test.ts` に「向き変更で zoom が外れる」「一覧から選ぶと area も決まる」を追加 | `grep updateAnatomy src/app` が 0 件で、`part-selector.spec.ts` と `back-deselect.spec.ts` が緑 | F3 |
| R4 | `AnatomyPanel` のパネル高の算術を `core/` の純関数へ出す | 現在の `index.tsx:267-290` を入出力の表にした単体テスト（短い画面・横長・文字拡大・計測前の 4 系統） | 純関数の単体テストが緑で、`short-flow-scroll.spec.ts`・`text-scale.spec.ts`・`ipad-landscape.spec.ts` が緑、前後のスクリーンショットが同じ | F1 |
| R5 | 保存・覚えたの操作ボタン対を共有部品にする | `catalog-detail-map.spec.ts` 等の既存 e2e に加え、`persistence.spec.ts` で「保存待ち」の表示を固定 | `[id].tsx` と `part-sheet.tsx` に `save-toggle` の定義が 1 か所だけで、`persistence.spec.ts` が緑 | F6 |

R1 を先頭にした理由: 実際に不整合へ着地する経路があるのは F12 だけで、変更も `focusAnatomyPart` 1 関数に収まる。R2 は挙動を変えない整理で、R1 の `fallbackDepth` の使い方が決まってから進めると二度手間にならない。

次点（上の 5 件の後）: F5 の `updateFilter` への集約、F4 のズーム先選定の純関数化、F7 の `useHydrated`（慎重に）、F8 は意図の確認が先。F9・F10・F11 は R にしない。

## 6. 受け入れ条件との対応

- 監査対象を漏れなく列挙: 第1章。
- 改善対象と現状維持の理由: 第3章（12 件）と第4章。
- 小さく実行可能な提案への対応付け: 第5章（R1〜R5）。未対応（F9, F10, F11）は第3章に理由と優先度を記録。
- 重複の回避: 第2章（実装済み）と第7章（issue・PR との照合）。`visible-parts.ts` と `compact-row.ts` は候補に入れていない。

### 対象外と限界

- `.github/workflows/`、`.maestro/`、`doc/` は読んでいない（`.maestro/` の理由は第1章）。
- 実機・ブラウザでの再現はしていない（Playwright・ビルド・サーブは行わない決まり）。F12 は経路をコードで追っただけで、見た目は（未確認）。
- 変更頻度は git の件数であり、不具合の頻度ではない。

## 7. 過去の issue・PR との重複照合

2026-11-14 に `gh api` で取得した、open の issue 33 件（PR を除く）と、closed の PR 50 件のうちマージ済み分で照合した。照合は題名による。本文までは読んでいないので、「重複なし」は題名の範囲での判断。

| 所見 | 重なる issue・PR | 関係 |
|---|---|---|
| 実装済み（第2章） | PR #283「fix(anatomy): share one visible-part condition across canvas, list and area zoom」 | 表示条件の共通化。済みで、候補に入れていない（依頼文は #277 と呼ぶ。題名では #283 を確認した） |
| 実装済み（第2章） | PR #284・#285（図鑑の行の判定）、`compact-row.ts` | 縦積みの判定は済み |
| F1・F2・F3 | #255「解剖画面で、層・向き・深さをその場で切り替えられる」、PR #288（チップの追加）、#263（実機確認） | チップ UI を作った PBI。F2 のチップ重複はその産物で、機能の追加ではない整理。#255 の仕様は変えない |
| F4 | なし | |
| F5 | PR #285・#286（絞り込みの追加）、#257・#267 | 絞り込みを足した PBI の産物。仕様は変えない |
| F6 | PR #291（詳細の小図）、#258・#275 | 詳細画面の変更が続いている。R5 は #258 の機能に触れない整理 |
| F7 | PR #284「decide row layout after mount ...」 | hydration の扱いを直した PR。F7 はその書き方の不統一で、直す対象は別 |
| F8 | #51「draft 座標の昇格ワークフローを回す」、#2「下書き66件の境界を確定する」 | 座標データの運用 issue。F8 は CI の検査範囲の話で、データは動かさない。ただし意図の確認先になる |
| F9・F10・F11 | なし | |
| F12 | #50「深層筋4件の図を調達する」 | 同じ 4 件の部位。#50 で図が入れば、この着地の問題は解けるか形が変わる（未確認）。R1 は図の調達を待たず、図が無い間の着地だけを決める |
| 解剖データ拡充（#210〜#217、#4、#5） | 本監査に重なる所見は なし | データの追加は対象外。構造の面では、データ駆動で足せる作りが保たれているため（第4章） |
| CI・配布（#250、#253、#240） | 重なる所見は なし | F10 は CI の最適化の話で、#250 の入力検証・#253 の逆解析耐性とは別 |
| 他の SOLID 監査・リファクタ issue | #254 自身のみ | 他に無し |
