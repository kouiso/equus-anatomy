---
name: android-emulator-testing
description: EQUUS馬体解剖など Expo Go アプリを Android エミュレータ上で adb 駆動して dogfood テストする手順・座標・制約
---

# Android エミュレータ上の Expo Go アプリを dogfooding する

## 前提・起動
- adb: `~/android-sdk/platform-tools/adb` (PATH に追加)。エミュレータは `emulator-5554`
- Metro: `pnpm start` → `adb reverse tcp:8081 tcp:8081` → アプリは `exp://127.0.0.1:8081`
- アプリが落ちていたら: `adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8081" host.exp.exponent`

## 駆動
- `source /tmp/t.sh` で `t X Y`(tap) / `s path.png`(screencap+pull) が使える
- `adb shell input tap X Y` / `input swipe x1 y1 x2 y2 ms` / `input keyevent KEYCODE_BACK` / `111`=IME 隠す
- **座標は端末物理ピクセル**。screencap の解像度がそのまま tap 座標になる(1440x3120 時は 1:1)
- 録画向けに端末解像度を半分に落とすとウィンドウが画面に収まる: `wm size 720x1560` + `wm density 280`(dp 等価のため UI 検証上は同じ)。終わったら `wm size reset` / `wm density reset`
- エミュレータ窓の高さはスケール固定で、wmctrl では高さを変えられない。録画前に解像度を落とすのが確実

## このアプリ(EQUUS 馬体解剖)の画面構成と座標の目安(720x1560 時)
- ボトムナブ: 図鑑(~120,1470) / 解剖(~360,1470) / 保存(~600,1470)
- 解剖パネル下部ボタンは選択状態で個数が変わる(選択中は「詳しく読む」が増えて右にずれる)。**スクショで座標確認してから tap すること**
- 表示条件モーダルのチップ: 向き y~337、層 y~519、深さ y~697(正常時)。`useSafeAreaInsets` が効くので inset が失われると全行が上にずれる — 見かけ上チップが押せないときはまずスクショで位置を確認
- ズームツール右上: +(~483,250) −(~575,250) リセット(~660,250)。**Expo dev の歯車(~645,222)がリセットボタンとoverlayの閉じる(637,136)に被さる** — dev 限定の罠

## 入力の制約
- `input text` は ASCII のみ。日本語は `input text "かんぞう"` で NPE。日本語検索は英名("liver"→肝臓)等で代替し、かな/漢字マッチは `core/search.ts` の `normalizeQuery` 経路共通なので単体テストで担保
- ピンチは adb では不可(二本指注入なし)。ズームは +/− ボタンとドラッグで代替
- 機内モード: `am broadcast AIRPLANE_MODE` は権限拒否される。`svc data disable` + `svc wifi disable` で同等の断線状態になる(復帰は enable)

## 状態確認
- 強制終了: `adb shell am force-stop host.exp.exponent`
- 回転ロック確認: `settings put system user_rotation 1` → display orientation=0 のままなら portrait 固定が効いている
- ログ: `adb logcat -d ReactNativeJS:* *:S`(E=JSエラー、FATAL=ネイティブクラッシュ)
- 永続化: AsyncStorage `equus.saved.v1` / `equus.mastery.v1`(Expo Go 配下のため run-as は不可、UI で検証)

## 既知の注意
- font_scale 変更などで in-place リロードが走ると、まれに SafeArea insets.top=0 になり全画面ヘッダーがステータスバーに潜る(F1)。発生したら force-stop→再起動で直る
- dev メニューの歯車は dev 専用。本番ビルドでは出ないので誤解しないよう報告に明記

## 環境の再構築(新規 VM / AVD で Expo Go が無い場合)
- Expo Go APK は GitHub Releases から取得: `curl -s https://api.expo.dev/v2/versions` で対象 SDK の `androidClientUrl` を引く(例: SDK57 → `https://github.com/expo/expo-go-releases/releases/download/Expo-Go-57.0.9/Expo-Go-57.0.9.apk`)→ `adb install`
- AVD 一覧: `emulator -list-avds`。Pixel 6 Pro 相当は `devin_ps2` (1440x3120, density 560)。起動: `emulator -avd devin_ps2 -no-snapshot-save -gpu swiftshader_indirect`、完了は `adb wait-for-device` + `getprop sys.boot_completed`=1
- `am start -a VIEW -d exp://...` で起動するたびに Expo dev のオーバーレイが出ることがある: 「Continue」(~360,1402 @720x1560)かパネル X(~647,706)で閉じる
- エミュレータ窓は `wmctrl -r "Android Emulator" -e 0,X,Y,-1,-1` で移動・`-a` で前面化はできる(高さは固定)
- 証跡マークアップ: ImageMagick は日本語フォント非搭載なので `-font /usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf` + 英語ラベルで枠/矢印を描く

## 再現メモ(検証済みの再現手順)
- R2-03(場所マーカー連続タップ誤選択): 同一座標 2 連タップではズーム後にマーカーが乗らず再現しないことがある。「頭部(124,462) → 100ms → 前肢の元座標(208,635)」で咬筋等の誤選択が確実に再現する(ズームアニメ中〜直後の 2 タップ目が部位マーカーに着弾する)
- R2-01(パン消失): 場所選択後に + を 12 回→右パン×4(`input swipe 500 600 100 600 300`)→下パン×3 で真っ黒再現
- `adb shell monkey -p host.exp.exponent --pct-syskeys 0 2000` は ~42 秒で完走。`Got IOException performing flip ... /dev/input/event0 EACCES` はエミュレータ側の回転イベント注入不可で無害。判定は logcat の ReactNativeJS:E / FATAL / AndroidRuntime:E / ANR で行う
