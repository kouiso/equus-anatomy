# Fable independent review — near fore hoof on skin_left.jpg

Standing: 新規 / Goal: 「手前の前肢の蹄カプセルが画像座標でおおよそどの範囲か」 — 出典: 2026-09-17 user query / Target: assets/anatomy/skin_left.jpg / Means: Read image + crop/grid + pixel scan, no candidate coords / Proportionality: visual judgment only

[確定] 2026-09-17 画像は JPEG 1600x1200 RGB — 根拠: identify + PIL size
[確定] 2026-09-17 座標系は左上原点・x右・y下・px — 根拠: src/core/types.ts Point, src/core/screen-to-image.test.ts
[確定] 2026-09-17 画面左の前肢対のうち、より頭側・より低い接地の蹄が手前（左）前肢 — 根拠: 左側望で管骨〜繋まで全見え、対側前蹄は後方に少し高く覗く
[確定] 2026-09-17 蹄カプセルの色は繋の有毛皮膚より明るい灰褐色で、毛の縦皺が蹄冠の暗い溝で止まる — 根拠: /tmp/fable-hoof/coronet_zoom.png と輝度ジャンプ
[確定] 2026-09-17 蹄冠（毛-角境界）は背側 (549,1058) から踵側 (592,1074) へ斜め下 — 根拠: x=545..593 の lum-rise と coronet_zoom の暗い溝
[確定] 2026-09-17 趾先端は約 (529,1093)、接地最下は約 y=1098、踵壁最後方は約 x=595 — 根拠: lum>40 輪郭スキャン
[死亡] 2026-09-17 lum>40 を蹄冠そのものと読む — 理由: 繋のハイライトも lum>40 で、蹄冠より 8〜12px 上の有毛皮膚を掴む
[未測定] 内側壁・蹄底・蹄叉 — 測り方: 左側望では見えない
[未測定] 蹄球と踵壁の1px境界 — 測り方: この絵では蹄球が暗く蹄壁に重なり、溝幅 3〜6px
