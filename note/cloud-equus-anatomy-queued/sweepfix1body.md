## 概要

下書きの総点検（`docs/draft-placement-sweep-20261114`）で、2 人とも「名前の構造に乗っていない」と言った 7 件のうち、左の骨格のファイル（#312 が触る）以外の 5 件を、正しい構造の上へ動かした。`source: draft` のまま。head は d24d204、元にした develop は 57cb049（#311 を取り込んだ 23ed8cc とも衝突なし）。

判断役の決定（2026-11-14 13:47Z）により、下書きのデータだけの PR は Android の画像なしで develop へ取り込む。実機の確かめは #314 にまとめ、main の前に閉じる。

## 変更内容

| 部位 | 前（画像の px の箱） | 後 | 前に乗っていた所 |
|---|---|---|---|
| 左 `skin-forehead`（額） | 244,180–300,212 | 220,124–268,164 | 目の後ろの頬 |
| 左 `skin-pastern`（繋） | 532,1060–556,1092 | 564,1020–628,1052 | 蹄の壁 |
| 左 `skin-fetlock`（球節） | 548,1012–628,1060 | 580,980–636,1012 | 繋 |
| 正面 `skin-coronet`（蹄冠） | 316,1068–380,1076 | 316,1044–372,1052 | 蹄の壁の下の縁 |
| 正面 `bone-mandible`（下顎骨） | 220,292–292,364 | 236,372–292,404 | 鼻の穴・上顎 |

- `scripts/derive-parts-skin-left.ts`・`scripts/derive-front.ts` を直し、derive で `left.json`・`front.json` を作り直した（手では直していない。derive を回し直すとバイト単位で同じ）。
- 正面 `skin-pastern` は図形を変えず、`labelAt` (344,1034) を足した。動かした蹄冠が繋の中に入り、繋の点が蹄冠の中に落ちて overlap.test が落ちたため（試験は弱めていない）。
- `doc/review/2026-10-25-pbi-220-names/baseline.json`: front.json と left.json の `geometrySha256` だけを直した。
- 画像: `doc/evidence/draft-placement-sweep-1/` に部位ごとの before・after（赤が図形、水色が 2 人の箱を合わせた範囲）。例: [額 before](https://github.com/kouiso/equus-anatomy/blob/d24d204858e459cee1b760e067e1d6a372cf8d76/doc/evidence/draft-placement-sweep-1/before-skin-forehead.png)・[額 after](https://github.com/kouiso/equus-anatomy/blob/d24d204858e459cee1b760e067e1d6a372cf8d76/doc/evidence/draft-placement-sweep-1/after-skin-forehead.png)・[下顎骨 before](https://github.com/kouiso/equus-anatomy/blob/d24d204858e459cee1b760e067e1d6a372cf8d76/doc/evidence/draft-placement-sweep-1/before-bone-mandible.png)・[下顎骨 after](https://github.com/kouiso/equus-anatomy/blob/d24d204858e459cee1b760e067e1d6a372cf8d76/doc/evidence/draft-placement-sweep-1/after-bone-mandible.png)

### 2 人の一致（新しい位置）

| 部位 | 識別者 1（レビュー） | 識別者 2 |
|---|---|---|
| 額 | 乗っている | 乗っている |
| 繋（左） | 乗っている（細い帯） | 乗っている |
| 球節（左） | 乗っている | 乗っている |
| 蹄冠（正面） | 乗っている | 乗っている |
| 下顎骨（正面） | 乗っている（上の切歯も含む） | 乗っている（先の部分だけ） |

境界の細かさ（繋が細い・下顎骨が先だけ）は #2 の範囲で、この PR では見ていない。

### 確かめた事

| | 結果 |
|---|---|
| レビュー | d24d204 で PASS（must 0） |
| 検査一式 | マージの前に d24d204 で取り直し、このPRにコメントで書く |

## 関連Issue

Refs #313 #314 #2
No-Close: 上腕骨・尺骨（#313）は #312 の後の別の PR

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Cv4a6DggpGHJAmmfXW7wbW
