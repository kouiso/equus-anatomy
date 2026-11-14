# 下書き配置の二者照合スイープ（2026-11-14）

## 目的

#313 で、左側の `bone-ulna`（尺骨）が上腕骨の上に置かれていたことが分かった。
同じ種類の誤りが他にないかを確かめるため、配置した部品を全部、二人の確認者が別々に見た。

確認したのは「その図形が、名前の付いた構造の上にあるか」だけ。境界の正確さ（#2）は見ていない。

## 方法

- 対象は 119 部品。内訳は left 81、front 28、rear 10。
- right 視点は数えずに飛ばした。right は left の鏡像で、`GEOMETRY.right` は `mirror(LEFT)` として作られる（`src/core/data/index.ts:105`）。反転は `x' = 1600 − x`（`src/core/geometry.ts:67-73` の `flipX`、幅 1600）。
- 確認者 A と B は、互いの結果を読まずに別々に判定した。判定は yes / no / cannot tell の三つ。この根拠は、各確認者への指示であり、二つの結果ファイルには書かれていない。
- 判定は目視。図形を図版に重ねて見た（`data/A-summary.md`、`data/B-summary.md`）。
- 比べたのは `origin/develop`（57cb049）時点の部品。
- 元データは次のファイル。ハッシュは元ファイルと一致している。
  - [`data/A-results.json`](data/A-results.json)（sha256 `b310d02f…`）
  - [`data/A-summary.md`](data/A-summary.md)（sha256 `ddedbc87…`）
  - [`data/B-results.json`](data/B-results.json)（sha256 `d834eacf…`）
  - [`data/B-summary.md`](data/B-summary.md)（sha256 `82ea710f…`）

## 件数

| 視点 | 部品数 | A yes | A no | A cannot tell | B yes | B no | B cannot tell |
|---|---|---|---|---|---|---|---|
| left | 81 | 72 | 6 | 3 | 70 | 6 | 5 |
| front | 28 | 23 | 3 | 2 | 21 | 4 | 3 |
| rear | 10 | 10 | 0 | 0 | 9 | 0 | 1 |
| 合計 | 119 | 105 | 9 | 5 | 100 | 10 | 9 |

## 両者が no と判定した 7 部品（修正する）

両方が「名前の付いた構造の上にない」と判定した部品。修正する。
表の数値は、各確認者が書いた「正しい位置」の画像上の範囲（px）。

| 視点 | id | A の正しい位置 | B の正しい位置 |
|---|---|---|---|
| left | `bone-ulna`（尺骨、#313） | 肘頭 (585-625, 615-665)。尺骨の骨幹は (600-635, 640-720) まで橈骨の後ろを下る | 肘頭 (590-660, 595-650)。上腕骨の顆と橈骨頭の後ろ |
| left | `bone-humerus`（上腕骨） | 肩関節 (520,520) から肘 (600,645) へ斜めに下る。x 505-625、y 505-650 | 肩関節 (530-575, 495-545) から肘顆 (590-640, 600-645) へ斜めに下る。bbox (525,495)-(630,645) |
| left | `skin-forehead`（額） | (200-265, 120-175)。耳の付け根と目の間 | (205-270, 115-170)。目の上と目の間 |
| left | `skin-pastern`（繋） | (555-615, 1020-1058)。球節と蹄冠の間 | (575-630, 1010-1050)。蹄冠の上 |
| left | `skin-fetlock`（球節） | (565-625, 975-1020)。球節の膨らみ。A は種子骨の位置（y 988-1028）でも確かめた | (585-645, 975-1010)。球節の膨らみ |
| front | `skin-coronet`（蹄冠） | 蹄冠の淡い帯。おおよそ y 1040-1050、x 305-370（見る側の右の脚） | (322-372, 1046-1056)。右脚の蹄の上端 |
| front | `bone-mandible`（下顎骨） | 下顎の歯列。おおよそ (215-300, 365-420) | 下の門歯と顎先。(225-295, 362-400) |

修正は二回に分ける。

1. `fix/draft-placement-sweep-1`: 皮膚の部品（forehead・pastern・fetlock・coronet）と、front の mandible。
2. 二つ目の PR: humerus と ulna。#312 の後に出す。
   - #312（"feat(data): draft three forelimb joints on the skeleton plate (#5)"、open）は `scripts/derive-parts-skeleton-left.ts` と `src/core/data/regions/left.json` を編集している。humerus と ulna も同じ左側の骨の部品なので、先に #312 を入れて衝突を避ける。

## 食い違い（一方が no、もう一方が yes か cannot tell）

修正はしない。#13（獣医師の監修）に回す。

| 視点 | id | A | B | 両者の記録 |
|---|---|---|---|---|
| left | `skin-throatlatch`（喉頭部） | yes | no | B は、sits_on を「喉の位置より下の首の下側。半分が背景の上」と書いた。correct は「throatlatch ~(320-375, 255-305)、顎と首の付け根」。A は記録に位置を書いていない |
| left | `muscle-flexor`（指屈筋群） | no | cannot tell | A は、図形が遠い側（反対側）の前肢の前腕にあると書いた。A の正しい位置は近い側の後ろの前腕 (625-665, 620-790)。A の note は「x668-700 は遠い肢の上にある。近い肢の橈側手根伸筋（ecr）は x596-660」。B は sits_on を「far-limb forearm (visible behind near leg)」、note を「Plausible but on far limb.」と書いた。B の correct は「near-limb caudal forearm is hidden」 |
| front | `muscle-masseter`（咬筋） | cannot tell | no | A は「正面からは皮膚に覆われ、咬筋はほとんど見えない」と書いた。B は、sits_on を「lateral face / nasal region (facial muscles)」、note を「Structure not visible from front; shape is on facial muscles beside nose.」と書いた。B の correct は「masseter is on the jaw angle, not visible from front; at most at silhouette edge ~(185-200, 230-300)」 |
| front | `bone-scapula`（肩甲骨） | yes | no | B は、note を「Shape only grazes edge of blade.」と書いた。B の sits_on は「shoulder-joint knobs / ribs lateral to scapula blade」。B の correct は「scapula blade ~(160-215, 345-490)」 |
| front | `bone-sternum`（胸骨） | no | cannot tell | A は、縦の帯（x 236-284, y 444-636）が椎体のように見え、両側に肋骨が付いていると書いた。A の sits_on は「胸郭越しに見える胸椎の柱」。A はこの判定を中程度の確信とした。A の correct は「胸骨は、肋骨が下端で集まる正中の小さな部分 (225-285, 600-650)」。B は「Cannot distinguish.」と書いた |

## 両者が cannot tell と判定した部品（#13 へ）

- front `skin-pastern`（繋）。A も B も判定できなかった。

## 参考: yes と cannot tell の食い違い（上の定義に入らない 9 部品）

一方が no と言わず、yes と cannot tell に割れた部品。上の定義には入らないが、判定が一致していない。修正はしていない。#13 に回すかどうかは、判断が要る。

| 視点 | id | A | B |
|---|---|---|---|
| left | `skin-elbow`（肘） | cannot tell。A の note は「肘の膨らみの 10-50px 前方に隣接しており、no 寄り」 | yes |
| left | `muscle-deltoid`（三角筋） | yes | cannot tell |
| left | `muscle-ecr`（橈側手根伸筋） | yes | cannot tell。B の sits_on は「probably common digital extensor (2nd belly)」、note は「Shape centred on 2nd muscle from cranial edge.」 |
| left | `muscle-sternocephalicus`（胸骨下顎筋） | cannot tell | yes |
| left | `bone-sesamoid`（近位種子骨） | yes | cannot tell。B の note は「Shape mostly on P1, overlaps knob in upper-right corner.」 |
| left | `bone-teeth`（歯） | yes | cannot tell。A の note は「Slightly above teeth row; boundary issue.」。B の note は「Offset ~25px upward.」 |
| left | `organ-colon`（大結腸） | cannot tell。A は、曲がった腸の輪を小腸と区別できないと書いた | yes |
| front | `muscle-deltoid`（三角筋） | yes | cannot tell |
| rear | `bone-sacrum`（仙骨） | yes | cannot tell。B の note は「Shape starts ~50px high.」 |

## 注意点

- すべて目視の判定。境界の精度は見ていない（#2 の範囲）。
- 確かさが低い判定。
  - A の front `bone-sternum` は中程度の確信（`data/A-summary.md`）。
  - A の left `skin-fetlock` も中程度の確信（`data/A-summary.md`）。
  - A の left `skin-elbow` は no 寄りとして書いたが、結論は cannot tell。
  - B の summary は、小さい部品や対比の低い部品への yes は確かさが低いと書いている（`data/B-summary.md`）。
- measured の皮膚の部品は、B の summary によれば overview でだけ確かめた（`data/B-summary.md`）。直すと決めた 4 つの皮膚の部品（forehead・pastern・fetlock・coronet）は draft なので、この注意には当たらない。
- 左の `muscle-*` について。`src/core/data/structures.ts` には、左の muscle 17 部品すべてに id の項目があることを確かめた（origin/develop 57cb049 時点）。ただし A の summary は、muscle の id には名前が付いておらず id で判定したと書いている（`data/A-summary.md`）。
- 二人が同じ誤りをしている可能性は消えない。両者が揃って no と言った 7 部品は、誤りの可能性が低いと見てよい。ただし確かめたわけではない。

## 関連

- #313（bone-ulna が上腕骨の上にあった）
- #312（左の骨の部品を編集する open の PR。humerus・ulna の修正は、これを入れた後に出す）
- #2（境界の精度。今回は見ていない）
- #13（獣医師の監修。食い違いと cannot tell を回す先）
