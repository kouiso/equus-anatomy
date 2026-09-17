# skin-hoof（左側望）座標修正レビュー 2026-09-17

## 対象

- `src/core/data/regions/left.json` の `skin-hoof` 1件のみ。他の部位・画像・メタ情報は無変更（`left.json.diff` が全差分）。
- 変更した座標は **下書き**（`source: draft`）として扱う。

## 結果（2段階レビュー済み）

1. **Fable盲目測定**（候補非提示）: bbox x529–595 y1058–1098。AI第1候補 x520–606 y1052–1098 より縮小。
2. **相互再確認**（同一拡大画像で照合）: AI候補は蹄尖に9px・蹄冠に6px・地面に一部はみ出し。Fable側も踵側を10px切る誤りを認めた。
3. **採用**: Fable修正版9頂点（下表）。蹄カプセルのシルエットに密着。

## 画像

- `skin-hoof-BEFORE.jpg` — 修正前ポリゴン（赤）。蹄冠より上（y1044）まで食い込み、蹄尖と接地縁を欠いていた。
- `skin-hoof-AFTER.jpg` — 採用ポリゴン（緑）。蹄冠〜蹄壁〜接地縁に密着。
- `skin-hoof-compare.jpg` — AI候補（緑）vs Fable提案（青）の拡大比較。青がシルエットに密着していることを双方確認。
- グリッドは画像座標。BEFORE/AFTER は同じ切り抜き。

## 判断根拠

- 原画像: `assets/anatomy/skin_left.jpg`（1600×1200）。蹄は皮膚層で角質化した暗色カプセルとして描かれている。
- 大学公開資料: University of Minnesota, Equine Foot（vanat.ahc.umn.edu/ungDissect/Lab04）—
  「蹄は足のカプセル。立位で見えるのは蹄壁で、上端は蹄冠、下端は接地面」。採用ポリゴンはこの定義と一致。
- 計測: VIA 2.0.12（`tools/via/via.html`）で頂点を実クリック採取 → `scripts/import-annotations.ts` で一時JSONへ変換 →
  `skin-hoof` のみ差し替え。Fable（grok）の独立測定で境界を最終確定。
- 座標ゲート `pnpm validate:coords` 緑。監査78件のうち変更はこの1件のみ。

## 座標差分の要点

| 項目 | 修正前 | 採用後 |
|---|---|---|
| 頂点数 | 6 | 9 |
| x 範囲 | 532–604 | 529–605 |
| y 範囲 | 1044–1092 | 1058–1098 |
| labelAt | (573, 1069) | (568, 1078) |
| source | measured | draft（AI計測のため下書きへ降格） |

主なずれ: 上端が蹄冠より約14px上（繋側）へ食い込み、蹄尖と接地縁が抜けていた。
