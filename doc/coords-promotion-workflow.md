# 座標の昇格ワークフロー（draft → measured）

draft 座標を確認済み座標へ昇格させる手順の文書化 (#51)。

## 状態モデル

- `source: 'draft'`: 座標ゲートは通るが、境界が解剖学的に正しいかは未確認（配置は AI 由来が多いが、skin-hoof のように人手修正済みでも確認が完結していなければ draft のまま）。
- `source: 'measured'`: このワークフローの計測 + 相互確認を通った確定座標。実線で描画。

## 手順（左側望 skin 層の例）

1. **計測・修正**: 担当が解剖図と照らして `scripts/reviewed-coords-left.ts` の `REVIEWED_SKIN_PARTS_LEFT` に部位エントリを置く。形式は2種: 輪郭ごと固定する `points` 型、輪郭はマスクから取りラベル位置だけ固定する `roi` 型。各エントリは `labelAt`・`source`・`why`（根拠と日付）を持つ。**生成物（`left.json` 等）の直編集は禁止** — 次の再生成で巻き戻る。修正は必ず reviewed-coords-left.ts か derive スクリプト側へ。
2. **相互確認**: 計測者と別の確認者が境界を実画像で目視確認し、結果を `doc/review/` に記録する（skin-hoof の座標修正・相互確認の参考例: `doc/review/2026-09-17-skin-hoof/`、現行座標の根拠: `doc/review/2026-10-04-skin-hoof-rereview/`）。相互確認の記録が揃って初めて `source: 'measured'` に上げる。
3. **再生成と検証**: `pnpm derive:left` で左側望 JSON を再生成し、対象座標が保持されること・再実行で差分が増えないことを確認。`pnpm validate:coords` が緑のままであることを確認する。
4. **テスト同期**: `scripts/reviewed-coords-left.test.ts`（skin-hoof の `source` 固定）と `src/core/data/coverage.test.ts`（左側望の measured ID 一覧 + draft 件数の固定）をレビュー結果に合わせて更新し、関連テストを実行して緑を確認。

前面・後面には package script の derive コマンドが無い（2026-10-11 時点）。昇格時は該当の derive スクリプトを直接 `tsx` で実行し、必要なら npm script を追加する。

## レビュー会で決めること（人の決め）

- 昇格は全件一括 vs 優先部位のみ。未配置 5 件（左側望）は図が無い深層筋 4 件と図で識別できない膀胱で、確認だけでは昇格不可 — 図調達が別工程（#50/#70）。
- 確認者の割り当てと確認記録の粒度（部位単位 vs 回単位）

## 現状 (2026-10-11 時点)

`pnpm validate:coords`（left/front/rear の parts 合計。areas・右反転表示は含まず）: measured 11 / draft 67・全件ゲート通過（馬体の上に乗っている）。ゲートは位置の大まかな妥当性を見るもので、配置済み draft の境界の解剖学的正しさは保証しない — 残りは境界の人目確認。
