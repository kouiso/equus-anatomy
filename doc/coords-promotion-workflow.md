# 座標の昇格ワークフロー（draft → measured）

skin-hoof(左側望) で回した手順の手順化 (#51)。

## 状態モデル

- `source: 'draft'`: AI が座標ゲートを通る位置に置いた下書き。画面では破線で描画。
- `source: 'measured'`: 計測 + 相互確認を通った確定座標。実線で描画。

## 手順

1. **計測**: 担当が解剖図と照らして `scripts/derive-parts-skin-left.ts`（向きごとの derive スクリプト）の部位エントリに明示座標を入れ、`source` を `'measured'` に変える。座標の直書き先は必ずスクリプト（生成物の `left.json` を直編集すると次の再生成で巻き戻る）。
2. **相互確認**: 計測者と別の確認者（獣医監修または Fable 相互確認 — skin-hoof の実績は `doc/review/2026-09-17-skin-hoof/`）が境界を実画像で目視確認し、結果を `doc/review/` に記録する。
3. **昇格**: `pnpm derive:left`（該当向きの derive コマンド）で JSON を再生成し、`pnpm validate:coords` が緑のまま、`src/core/data/coverage.test.ts` の measured/draft 件数を更新する。PR で merge して初めて昇格確定。

## レビュー会で決めること（人の決め）

- 昇格は全件一括 vs 優先部位のみ（未配置 5 件や骨の密集領域から先行が現実的）
- 確認者の割り当てと確認記録の粒度（部位単位 vs 回単位）

## 現状 (2026-10-11 時点)

`pnpm validate:coords`: measured 11 / draft 67、全件ゲート通過（馬体の上に乗っている）。残りは境界の人目確認のみ。
