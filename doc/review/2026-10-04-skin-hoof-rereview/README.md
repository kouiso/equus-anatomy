# skin-hoof（左側望）再レビュー反映 2026-10-04

## 対象

- `src/core/data/regions/left.json` の `skin-hoof` 1件のみ（`left.json.diff` が全差分）。他の部位・画像・メタ情報は無変更。
- 生成側 `scripts/derive-parts-skin-left.ts` の `skin-hoof` 定義。`source: draft` は維持。

## なぜ生成側も直したか

`pnpm derive:left`（`derive-parts-skin-left.ts`）は `skin-hoof` を `muscle_left.jpg` のマスクと広い ROI
（x520–612, y1044–1120）から毎回取り直しとった。JSON だけ直しても再生成で被毛込み・蹄尖欠けの形へ戻る。
そこで目視レビュー済みの頂点を `scripts/reviewed-coords-left.ts` に置き、生成スクリプトはそれをそのまま使う。

## 採用座標（2026-10-03 再レビュー）

| 項目 | 修正前 | 採用後 |
|---|---|---|
| 頂点数 | 9 | 12 |
| x 範囲 | 529–605 | 528–603 |
| y 範囲 | 1058–1098 | 1057–1099 |
| labelAt | (568, 1078) | (568, 1078) |
| source | draft | draft |

頂点: (551,1057) (566,1062) (583,1069) (603,1079) (600,1087) (595,1093) (585,1097) (565,1099) (544,1099) (532,1097) (528,1093) (532,1085)

## 画像

- `skin-hoof-BEFORE.jpg` — 修正前（赤）。蹄冠より上の被毛を踵側で含み、蹄尖を欠く。
- `skin-hoof-AFTER.jpg` — 採用後（緑）。蹄冠〜蹄壁〜接地縁。
- `skin-hoof-compare.jpg` — 重ね合わせ＋回帰点（水色=内側、黄=外側）。グリッドは画像座標、4倍拡大。

## 検証

`scripts/reviewed-coords-left.test.ts` で固定:

- `left.json` と生成側定義が採用座標・labelAt・source に一致
- 自己交差なし
- 内側: (568,1078) ラベル / (531,1093) 蹄尖 / (599,1081) 踵側
- 外側: (580,1060) 蹄冠上の被毛 / (550,1103) 地面 / (665,1060) 奥の蹄 / (588,1058) 旧ポリゴンが含んでいた被毛
- `checkPolygon`（measuredOn マスク）と `checkAnchor` が問題0件

再生成確認: `pnpm tsx scripts/derive-parts-skin-left.ts` 実行後も `skin-hoof` は12頂点のまま。

原画像 `assets/anatomy/skin_left.jpg` の SHA-256 は `4ef4b8cafad90c077792a7a50177626bf9cd91b7ebda516aa905e34c57f52294`（無変更）。

## 既知の別件（このPRでは触らん）

再生成すると `skin-tail` の labelAt と parts の並び順が現行 JSON とずれる。蹄とは無関係の既存差分なので別 issue で扱う。

## レビュー体制の記録

指定モデル（Claude Opus 5.5 / GPT Sol 6.1 / Gemini 3.8）別の独立レビューは未実施。Devin の内部多面レビューで代用した（依頼者合意済み）。
