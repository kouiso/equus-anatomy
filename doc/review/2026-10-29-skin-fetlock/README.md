# skin-fetlock（左側望）独立計測レビュー 2026-10-29（昇格は保留）

`doc/coords-promotion-workflow.md` の手順で実施した初回 run（#51）。計測 → 機械比較 → 採用候補の提示までを通した。**`measured` への昇格は未実施 — ワークフローが要求する人同士の相互確認（獣医レビュー会）をまだ通っていないため、`source` は `draft` のまま据え置く**（監査指摘 2026-10-30: 計測者 1 名 + 機械比較だけでは相互確認にならず、measured の意味を緩める）。

## 対象

- `src/core/data/regions/left.json` の `skin-fetlock` 1 件。**現行の `draft` 座標・`source` ともに無変更**。baseline（pbi-220-names の sha256）も不変。
- 採用候補の座標はこの review 記録と参照マスク `doc/reference-mask/left-skin-2026-10-29-devin.json` に残し、人の相互確認が通った時点で `scripts/reviewed-coords-left.ts` へ `source: measured` として登録する昇格 PR を別途出す。

## 手順どおりの実施内容

1. **計測**: 独立参照 `doc/reference-mask/left-skin-2026-10-29-devin.json` を作成。crop.ts のグリッド付き切り出し（3x/4x/6x の3段）で脚の輪郭を目視採取。候補の頂点列は見ずに作った（`blindToCandidates: true`。部位 id と検索範囲の bbox のみ使用）。
2. **機械比較**: `pnpm measure:independent` で独立参照と候補座標を比較 → **不一致（IoU 0.537・境界95%点 20.0px）**。`skin-fetlock-compare.jpg`（緑=現行 draft、青=独立参照）で原因を特定。
3. **採用候補**: 独立参照側を推奨。現行 draft は脚の斜行に沿った帯で、関節の上前部（x568-580・y1008-1012）と後下部（x596-622・y1040-1060）が範囲外に抜けていた。独立参照は脚の前縁（y1010 で x560 → y1060 で x540 の斜行）と後縁（x620-630）の実輪郭に沿う。**最終採否は人の相互確認待ち。**

## 画像

- `skin-fetlock-BEFORE.jpg` — 現行 draft（赤）。関節帯は追えているが上前部と後下部が欠ける。
- `skin-fetlock-AFTER.jpg` — 採用ポリゴン（緑）。脚輪郭に沿う7頂点。
- `skin-fetlock-compare.jpg` — 現行（緑）vs 独立参照（青）。はみ出しは独立参照側が左へ約 20px。
- `skin-fetlock-compare-zoom.jpg` — 上記の拡大版。
- グリッドは画像座標。切り出し原点 (500,960)、目盛り 10px。

## 判断根拠

- 原画像: `assets/anatomy/skin_left.jpg`（1600×1200）。球節は管骨と繋骨の間の関節隆起で、左側望では脚の前縁が斜行する区間に位置する。
- 解剖学的定義: 球節（fetlock joint）= 第三中足骨と基節骨の関節部。側面では掌側（後方）に種子骨の隆起が出る。採用ポリゴンはこの隆起を含む関節域全体を覆う。
- 数値の扱い: measure:independent の不一致（0.537）は draft の範囲不足が主因。参照ファイルを採用候補形で更新後の機械一致は IoU 1.0・境界95%点 0px だが、**これは同一計測者の値とその参照の一致であって、人同士の相互確認ではない**。measured 昇格の判定材料としては使わない。

## 残件

- この手順を全 draft（残 109 件）へ適用するかどうかは獣医レビュー会の決め事（#51 の SBI 2 番目）。本 run は手順の実演で、一括昇格の合意を意味しない。
- `front/skin-coronet` で独立計測を試みた所、毛/蹄角質の境目（y1040-1050）と現行 draft（y1068-1076）が約 20px ずれる読みになった。蹄冠の解釈（境目の帯 vs 蹄壁上部の範囲）が部位定義として未確定なので、昇格せずレビュー会の確認事項へ回す。
