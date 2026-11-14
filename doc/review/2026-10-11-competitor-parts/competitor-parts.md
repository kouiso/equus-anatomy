# 競合部位網羅比較と欠落部位候補（lane-equus-parts / Step1）

日付: 2026-10-11
対象: `src/core/data/structures.ts` の現行カタログ 61 構造（skin 11 / muscle 17 / skeleton 23 / organs 10）

## 比較対象

同ジャンルの解剖学習コンテンツ・馬解剖の標準参照を取り、EQUUS の部位網羅と比較した。

- JRA サラブレッド講座「馬体の名称」51 部位（https://www.jra.go.jp/kouza/thoroughbred/mechanism/body/）
  - 日本語の馬体外貌名の正本。競馬・馬術で日常使う部位語が揃う
- Horseman's Handbook「Points of the Horse」26 拠点 + 外部解剖 44 部位（https://horsemanshandbook.com/reference/anatomy/external/）
  - 英語圏の外貌ランドマーク標準。アプリ型のインタラクティブ図版として EQUUS に近い形式
- IMAIOS vet-Anatomy 馬モジュール（https://www.imaios.com/en/vet-anatomy/horse/horse-osteology ほか）
  - 骨格 141 図・筋 344 図のラベル付き獣医解剖アトラス。内部構造の網羅基準
- 教科書水準の参照元として Nomina Anatomica Veterinaria（NAV）体系（vet-Anatomy のラベル規準）と Sisson の馬解剖を想定

## 現行カタログの穴

### 体表（skin, 現行 11）
「頭・耳・頸・鬐甲・背・尻・尾・胸前・管・蹄・飛節」の荒い区分だけで、
JRA 馬体名称や HB Points が必ず挙げる外貌ランドマークの大半が無い。
学習用途（馬体審査・部位当て）ではこの粒度が競合との最大の差。

### 筋（muscle, 表層 13 + 深層 4）
表層筋図では分離できる筋膜境界が未投入:
- 半腱様筋（大腿後縁の帯、半膜様筋と並ぶ hamstring）
- 大腿筋膜張筋（大腿前縁、TFL）
- 胸骨下顎筋（頸腹側の帯、頸静脈溝の縁）
- 指屈筋群（前腕後面、屈腱スキャンの対象）

### 骨格（skeleton, 23）
四肢の末端は揃うが、関節・単骨の抜けがある:
- 尺骨（肘頭。肘の突起そのもので、skeleton_left.jpg で上腕骨後ろに描出）
- 第2・第4中手骨（ボタン骨。中手骨の掌側、跛行で定番）
- 環椎・軸椎（第1・第2頸椎。頭を振る・回す関節、項直下）
- ※ 蹄骨・種子骨・中趾骨は既存の指節骨・種子骨・中趾骨がカバー
- ※ 中手骨内部の小骨（手根骨は骨塊として既収録）

### 内臓（organs, 10）
気管・食道は organs_left.jpg 上で心臓前方に見えるが、同図版は AI 生成で
配備の解剖学的怪しさが repo 内で明記済み（derive-parts-organs-left.ts 冒頭）。
「座標より先に絵を疑う」ルールにより今回は投入しない（詳細は後述）。

## 欠落部位候補リスト

各候補は（ID案 / 和名 / 層 / 配置 view / 解剖学的裏付け / 参照元 / ROI を置ける根拠）の形式。
「置ける根拠」は muscle_left.jpg のシルエット断面プローブ（isOnHorse 実測）で確認済み。

### 体表（skin）19 件 — 左側望に投入。うち6件は正面にも

| ID案 | 和名 | view | 裏付け・参照元 | ROI の根拠 |
|---|---|---|---|---|
| skin-muzzle | 鼻端 | l,r,front | JRA 馬体名称 鼻孔・唇 / HB Muzzle | 頭部前端下部、mask x60-200 y240-390 が馬体 |
| skin-eye | 眼 | l,r,front | JRA 眼 / HB 外部解剖 | 顔面 x195-260 y160-215 |
| skin-forehead | 額 | l,r | JRA 額 / HB Forehead | 眼と耳の間 x230-300 y105-175 |
| skin-poll | 項 | l,r | HB Poll・JRA「おとがい」相当 | 耳根後方 x300-375 y65-155 |
| skin-throatlatch | 喉頭部 | l,r | HB Throat Latch | 下顎裏の頭頸境界 x285-415 y335-455 |
| skin-jugular | 頸溝 | l,r | JRA 頸溝（採血点） | 頸腹側の溝 x385-545 y410-570 |
| skin-shoulder | 肩 | l,r | JRA 肩 / HB Shoulder | 肩甲棘の上 x585-745 y330-540 |
| skin-elbow | 肘 | l,r | JRA 肘 / HB Elbow | 肘頭点 x545-615 y575-675 |
| skin-forearm | 前腕 | l,r | JRA 前腕 / HB Forearm | 上膊の柱 x560-705 y640-795 |
| skin-knee | 腕節 | l,r,front | JRA 腕節 / HB Knee | 腕節の膨らみ x550-655 y775-860 |
| skin-fetlock | 球節 | l,r,front | JRA 球節 / HB Fetlock | 管直下の膨らみ x540-650 y1010-1065 |
| skin-pastern | 繋 | l,r,front | JRA 繋 / HB Pastern | 蹄直上の斜め柱 x520-620 y1055-1105 |
| skin-coronet | 蹄冠 | l,r,front | JRA 蹄冠 / HB Coronet | 蹄の生え際帯 x530-610 y1050-1075 |
| skin-loin | 腰 | l,r | JRA 腰 / HB Loin | 背と尻の間 x1040-1170 y265-420 |
| skin-flank | 膁 | l,r | JRA 膁 / HB Flank | 後肢前の窪み x1115-1230 y435-575 |
| skin-abdomen | 腹 | l,r | JRA 腹 / HB Barrel | 腹側の帯 x690-1120 y500-680 |
| skin-thigh | 大腿 | l,r | JRA 大腿 | 後肢上部の筋肉面 x1085-1360 y395-690 |
| skin-stifle | 膝蓋 | l,r | JRA 膝蓋 / HB Stifle | 後肢前面の関節 x1095-1200 y600-700 |
| skin-gaskin | 下腿 | l,r | JRA 下腿 / HB Gaskin | 膝蓋と飛節の間 x1145-1275 y695-780 |

### 筋（muscle, superficial）4 件

| ID案 | 和名 | view | 裏付け・参照元 | ROI の根拠 |
|---|---|---|---|---|
| muscle-semitendinosus | 半腱様筋 | l,r | vet-Anatomy myology。大腿後縁の筋膜境界が muscle_left.jpg に描出 | 大腿後縁 x1290-1385 y400-690。biceps-femoris ROI を前側に詰めて帯を出す |
| muscle-tfl | 大腿筋膜張筋 | l,r | 同上。大腿前縁 | x1070-1160 y455-680 |
| muscle-sternocephalicus | 胸骨下顎筋 | l,r | 同上。頸腹側 | 頸腹側の薄帯 x450-555 y462-548。腕頭筋・胸筋との 20% 重なり制約に合うよう下端を詰めて投入済み |
| muscle-flexor | 指屈筋群 | l,r | 同上。前腕後面 | 橈側手根伸筋の後ろ x660-710 y615-805 |

### 骨格（skeleton）3 件

| ID案 | 和名 | view | 裏付け・参照元 | ROI の根拠 |
|---|---|---|---|---|
| bone-ulna | 尺骨 | l,r | vet-Anatomy osteology。肘頭が skeleton_left.jpg で確認 | 肘の後方突起 x545-595 y555-665。上腕骨・橈骨の重心を内包しない形で切る |
| bone-splint | ボタン骨 | l,r | 同上。第2・4中手骨 | 中手骨の掌側（管の後縁）x628-655 y855-1015 の薄帯 |
| bone-atlas-axis | 環椎・軸椎 | l,r | 同上。第1・第2頸椎 | 頭蓋と頸椎の間 x330-440 y100-220 |

## 投入見送り候補（理由つき）

- organ-trachea 気管 / organ-esophagus 食道: 図はあるが organs_left.jpg が AI 生成で
  心臓・肺の配置自体に疑義が出とる（derive-parts-organs-left.ts 冒頭注記）。
  怪しい絵に座標を足すと後で全巻き戻しになるので、正しい図版が入るまで待つ。
- 夜目（chestrut）・距毛（ergot）・蹄球・肩端・臀端・尾根: 点状の標識で、
  タップ領域として切ると隣接部位と不可分になる。面積ゲート（BLOCK²=64px²）も厳しい。
- 腋窩・帯径・前胸（=胸前で既出）: 既存部位との重複または線状計測帯。
- 後肢側の球節・繋・蹄冠: 同名部位として前肢側の図形で代表。
  view ごとの部位は1多角形なので、左右前肢は同一部位として扱う既存の決まりに従う。
- 蹄骨（bone-phalanx が繋骨・冠骨・蹄骨の3節として収録済み）、
  手根小骨個別（bone-carpus が骨塊として収録済み）、後肢ボタン骨（bone-metatarsus 本文が言及）。
- 深層筋（腸腰筋・棘上筋・棘下筋・鎖骨下��）・膀胱: 絵が無い既存見送り（現行どおり）。

## 投入結果（2026-10-11 実測）

見込みどおり着地。26 部位全部が checkPolygon・重なり・マスク整合のゲートを通過。

- STRUCTURES: 61 + 26 = 87
- 左側望配置: 55 + 26 = 81 / 期待 59→85（未配置は既存の5件のまま）
- 正面配置: 22 + 6 = 28 / 期待 23→29（muscle-subclavius は従来どおり見送り）
- 後面: 10 のまま（今回は追加部位なし）
- 反復した箇所: 頸溝の点はマスク統合面の外に出たため (470,470) へ修正、
  胸骨下顎筋は胸筋との重なり 79%→23%→20%以下になるまで下端を2回詰めた。
- e2e の2件は固定値ピンだったため導出型へ修正（後肢の部位数は
  `areaOfStructure`+STRUCTURES から算出、頸部の顔ぶれ表に胸骨下顎筋を追加）。
  verify（type-check/lint/test 387件/e2e 112件/coords）全緑。
