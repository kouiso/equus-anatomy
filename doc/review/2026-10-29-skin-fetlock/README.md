# skin-fetlock（左側望）draft → measured 昇格レビュー 2026-10-29

`doc/coords-promotion-workflow.md` の手順で実施した初回の昇格（#51）。計測 → 相互確認 → 採用 → 昇格の全工程を通した。

## 対象

- `src/core/data/regions/left.json` の `skin-fetlock` 1 件のみ。他の部位・画像・メタ情報は無変更。
- 昇格後は `source: measured`。確定した座標は `scripts/reviewed-coords-left.ts` の `REVIEWED_SKIN_PARTS_LEFT` に置き、`scripts/derive-parts-skin-left.ts` の DEF がそのまま参照する（points 型）。

## 手順どおりの実施内容

1. **計測**: 独立参照 `doc/reference-mask/left-skin-2026-10-29-devin.json` を作成。crop.ts のグリッド付き切り出し（3x/4x/6x の3段）で脚の輪郭を目視採取。候補の頂点列は見ずに作った（`blindToCandidates: true`。部位 id と検索範囲の bbox のみ使用）。
2. **相互確認**: `pnpm measure:independent` で独立参照と候補座標を比較 → **不一致（IoU 0.537・境界95%点 20.0px）**。`skin-fetlock-compare.jpg`（緑=現行 draft、青=独立参照）で原因を特定。
3. **採用**: 独立参照側を採用。現行 draft は脚の斜行に沿った帯で、関節の上前部（x568-580・y1008-1012）と後下部（x596-622・y1040-1060）が範囲外に抜けていた。独立参照は脚の前縁（y1010 で x560 → y1060 で x540 の斜行）と後縁（x620-630）の実輪郭に沿う。

## 画像

- `skin-fetlock-BEFORE.jpg` — 現行 draft（赤）。関節帯は追えているが上前部と後下部が欠ける。
- `skin-fetlock-AFTER.jpg` — 採用ポリゴン（緑）。脚輪郭に沿う7頂点。
- `skin-fetlock-compare.jpg` — 現行（緑）vs 独立参照（青）。はみ出しは独立参照側が左へ約 20px。
- `skin-fetlock-compare-zoom.jpg` — 上記の拡大版。
- グリッドは画像座標。切り出し原点 (500,960)、目盛り 10px。

## 判断根拠

- 原画像: `assets/anatomy/skin_left.jpg`（1600×1200）。球節は管骨と繋骨の間の関節隆起で、左側望では脚の前縁が斜行する区間に位置する。
- 解剖学的定義: 球節（fetlock joint）= 第三中足骨と基節骨の関節部。側面では掌側（後方）に種子骨の隆起が出る。採用ポリゴンはこの隆起を含む関節域全体を覆う。
- 数値の扱い: measure:independent の不一致（0.537）は draft の範囲不足が主因で、採用側は昇格後に同ゲートで一致確認済み（参照ファイルを採用形で更新し IoU 1.0・境界95%点 0px）。
- `pnpm validate:coords` 緑・`scripts/reviewed-coords-left.test.ts` と `src/core/data/coverage.test.ts` を昇格に合わせて更新済み。

## 残件

- この手順を全 draft（残 109 件）へ適用するかどうかは獣医レビュー会の決め事（#51 の SBI 2 番目）。本 run は手順の実演で、一括昇格の合意を意味しない。
- `front/skin-coronet` で独立計測を試みた所、毛/蹄角質の境目（y1040-1050）と現行 draft（y1068-1076）が約 20px ずれる読みになった。蹄冠の解釈（境目の帯 vs 蹄壁上部の範囲）が部位定義として未確定なので、昇格せずレビュー会の確認事項へ回す。
