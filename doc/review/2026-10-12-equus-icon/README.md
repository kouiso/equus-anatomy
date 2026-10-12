# 2026-10-12 FAD/アプリアイコンを正規 EQUUS ロゴへ差し替え

## 変更内容

- `assets/brand/icon.png`: 写実的な馬（黒背景）→ 正規 EQUUS ロゴ（濃緑の馬＋EQUUS 文字、クリーム背景 #F5F1E9）1024x1024
- `assets/brand/adaptive-icon.png`: 同ロゴを 66% 縮小で配置（adaptive icon の safe zone 内に馬＋文字が全て収まる）
- `assets/brand/favicon.png`: 同ロゴ 192x192
- `app.json`: `android.adaptiveIcon.backgroundColor` を `#0b0c0e` → `#F5F1E9`（ロゴ背景色と一致させ、マスク角で継ぎ目が出ないように）

## 生成方法

添付の正規ロゴ PNG（1254x1254）をソースに Pillow で縮小・合成。

- `icon.png` / `favicon.png`: ロゴを全面リサイズ（iOS は squircle マスクで四隅のみ落ちる。ロゴ内容は safe 領域内）
- `adaptive-icon.png`: ロゴ内容バウンディングボックス（x 27.6-77.7%, y 14.5-85.5%）が adaptive icon の safe circle（直径 66dp/108dp = 61%）へ収まるよう、ロゴ全体を 66% に縮小し内容重心をキャンバス中心へ配置。背景はロゴ同色で塗りつぶし（継ぎ目不可視）

## 対象外（意図的に未変更）

- `assets/brand/splash.png`: スプラッシュ画面はアイコンではないため本変更の対象外（別ロゴ刷り直しが必要なら別 PR）
- `app.json` の `backgroundColor` / `splash.backgroundColor`: スプラッシュ・システム背景色。アイコンではないため据え置き

## FAD 配布経路との関係

`.github/workflows/fad.yml` は Android/iOS とも `expo prebuild` でネイティブプロジェクトを生成してからビルドする。AppIcon 一式（iOS）・mipmap adaptive icon（Android）は prebuild 時に `assets/brand/` と `app.json` から自動生成されるため、ベースアセットの差し替えで FAD 配布バイナリのアイコンにも反映される。fastlane 側はアイコンを触らない（Fastfile = 署名とビルドのみ）。

## 証跡

- `evidence/icon-before-after.png`: 変更前後比較（旧: 黒背景の写実馬 / 新: 正規ロゴ）
- `evidence/icon-evidence.png`: 生成ファイルの目視確認シート（実サイズ・48px 縮小・adaptive circle マスク合成）
