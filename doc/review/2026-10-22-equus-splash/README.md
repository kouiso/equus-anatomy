# 起動画面を正式ロゴにそろえる

アプリアイコンは PR #169 で正式ロゴに替わっていた。起動画面だけ馬の写真のままで、しかも app.json の `splash` は書き出し時に効いておらず、iOS は白、Android は白の既定画面になっていた。

- `expo-splash-screen` の設定を足し、ロゴ（1024x1024、背景はロゴと同じ #F5F2EA）を中央に出す
- アダプティブアイコンの背景色もロゴの背景 #F5F2EA に揃えた
- 各サイズは `expo prebuild` が icon.png / adaptive-icon.png / splash.png から作る（iOS は 1024 の単一アイコン、Android は mdpi〜xxxhdpi の ic_launcher と splashscreen_logo）

## 確認（iOS シミュレータ、iPhone、Release ビルド）

- evidence/icon-ios-sim.png: ホーム画面のアイコン
- evidence/splash-ios-sim.png: 起動直後の画面
- Android は prebuild の出力（mipmap 各密度と splashscreen_background=#F5F2EA）を確認。実機は鳴らさない方針のため入れていない
