# 起動画面を正式ロゴにそろえる

アプリアイコンは PR #169 で正式ロゴに替わっていた。起動画面だけ馬の写真のままで、しかも app.json の `splash` は書き出し時に効いておらず、iOS は白、Android は白の既定画面になっていた。

- `expo-splash-screen` の設定を足し、ロゴ（1024x1024、背景はロゴと同じ #F5F2EA）を中央に出す
- アダプティブアイコンの背景色もロゴの背景 #F5F2EA に揃えた
- 各サイズは `expo prebuild` が icon.png / adaptive-icon.png / splash.png から作る（iOS は 1024 の単一アイコン、Android は mdpi〜xxxhdpi の ic_launcher と splashscreen_logo）

## 確認（iOS シミュレータ、iPhone、Release ビルド）

- evidence/icon-ios-sim.png: ホーム画面のアイコン
- evidence/splash-ios-sim.png: 起動直後の画面
- Android は prebuild の出力（mipmap 各密度と splashscreen_background=#F5F2EA）を確認。実機は鳴らさない方針のため入れていない

## 別担当の敵対レビュー（Devin、2026-10-22）

初回は BLOCK。指摘と対応:

- 古い最上位の `splash` が残ると二重設定になる: 消した
- Android 12 以降は円で切り抜かれ imageWidth を無視する: 余白を足した専用画像 `splash-android.png`（ロゴを 60% に縮小）を `android.image` に指定し、幅は 288dp。prebuild で splashscreen_logo.png が 1152px（288dp の 4 倍）になることを確認
- 淡い色の起動画面から暗い画面へ切り替わるときの白っぽい点滅: ロゴの正式な背景色を優先した判断。アイコンも同じ色で、気になる場合は背景を暗くした別ロゴが要る（デザイナー判断）
- 前景に濃い縁が入っていると見える: adaptive-icon.png の四隅と上端は不透明で #F5F1E9（背景 #F5F2EA と 1 違い）。濃い縁は無い。Android 実機の見た目は未確認

再レビュー(Devin)は PASS。ただし依頼文で「淡い起動画面の点滅は承認済みの設計判断」と書いて渡したため、その点は審査されていない。点滅の可否はデザイナー確認が残る。
