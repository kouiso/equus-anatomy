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
- R2-01(パン消失): 場所選択後に + を 12 回→右パン×4(`input swipe 500 600 100 600 300`)→下パン×3 で真っ黒再現。**ピンチだけでも再現する**(xdotool Ctrl+drag を連続で → キャンバス全面黒)。メカニズム: pan/pinch/zoomAt は全て `clamp()` で画像**矩形**内に収まるため viewBox は脱走しないが、解剖 JPEG(透過なし・四隅 rgb~20,20,20 の黒背景焼き付き) の黒背景領域に高倍率 viewBox が乗ると全面黒に見える。NaN ではない — −ボタン連打で図が復帰、黒状態でも部位一覧モーダルは開き部位選択も可能。logcat に JS 出力は出ない
- `adb shell monkey -p host.exp.exponent --pct-syskeys 0 2000` は ~42 秒で完走。`Got IOException performing flip ... /dev/input/event0 EACCES` はエミュレータ側の回転イベント注入不可で無害。判定は logcat の ReactNativeJS:E / FATAL / AndroidRuntime:E / ANR で行う

## ピンチと日本語入力の検証方法(実測)
- **ピンチは xdotool Ctrl+ドラッグで可能**(QEMU の pinch ショートカット): `xdotool keydown ctrl` → `mousedown 1` → `mousemove` を段階的に → `mouseup 1` → `keyup ctrl`。**computer ツールの drag に key:"ctrl" を付けても修飾は保持されず効かない** — xdotool の keydown/keyup で明示的に保持すること。動作モデル: 押下点が二本指の中点(アンカー)になり、ドラッグ距離=指の間隔。どちら方向に動かしても間隔が増える=ピンチアウト(拡大)。ピンチインはジェスチャ中に押下点へ戻す動きで発生
- 実座標例 (display 1600x1200、窓 geometry は `wmctrl -lG` で取得): 窓 (340,30,411x891) のとき canvas 中央 (device 360,600) ≈ 実座標 (543,396)
- 塞がった経路(二度試さない): `sendevent /dev/input/event2` は SELinux で Permission denied(production build、`adb root` 不可); エミュレータコンソール (`nc localhost 5554` + `~/.emulator_console_auth_token`) の `event send` は OK を返すが virtio 構成ではどの evdev デバイスにも届かない; `monkey --pct-pinchzoom 100` はランチャー/HomeActivity に向かい `--throttle`+refocus でも scale ジェスチャとして成立しない
- **日本語入力は ADBKeyBoard で可能**: `https://github.com/senzhk/ADBKeyBoard/raw/master/ADBKeyboard.apk` を `adb install` → `ime enable com.android.adbkeyboard/.AdbIME` + `ime set` → フォーカス後 `am broadcast -a ADB_INPUT_TEXT --es msg 'かんぞう'`。ひらがな/漢字/全角カナ/絵文字/半角カナすべて注入できた。実測: かんぞう・肝臓・カンゾウ→各1件ヒット、半角カナ「ｶﾝｿﾞｳ」→0件(normalizeQuery は全角カタカナ→ひらがなのみ)、絵文字→0件で空状態正常
- 検索ボックスの件数表示は絞り込み後件数。「1 部位」の「1」が Cormorant フォントで "I" 風に見えるのはバグではない(オールドスタイル数字)

## release ビルド(ローカル assembleRelease)
- `CI=1 npx expo prebuild --platform android --clean` → `android/local.properties` に `sdk.dir=$HOME/android-sdk` → `cd android && ./gradlew assembleRelease --no-daemon`(~7分、app-release.apk ~115MB、debug 署名で install 可、パッケージ `jp.co.ritmo.equusanatomy`)
- **この VM の egress IP は Maven Central (repo.maven.apache.org) が 429 で死ぬ**。対策は ~/.gradle/init.d/maven-mirror.gradle で GCS ミラー `https://maven-central.storage-download.googleapis.com/maven2/` を注入。さらに settings プラグインの classpath 解決には `beforeSettings { settings.pluginManagement { repositories { maven{url MIRROR} } } }` が要る(settingsEvaluated では plugins{} 解決に間に合わない) + `node_modules/@react-native/gradle-plugin` と `node_modules/expo-modules-autolinking/android/expo-gradle-plugin` 配下の `mavenCentral()` をミラーに sed 置換(pluginManagement 内の central が 429 で全体を殺す)
- release 実測: cold start TotalTime 385-422ms、TOTAL PSS ~146MB(Expo Go dev bundle は 537-674ms / 634MB)。F1(SafeArea 埋没)は release では再現せず
