# EQUUS #67 ダブルタップ誤選択ガード — エミュレータ再現ログ [実機目視=エミュレータ]

- 日時: 2026-10-08 00:04–00:07 UTC
- ブランチ: `devin/1791403152-doubletap-guard` @ 535bf34 (`fix(canvas): harden pick guard against clock skew and centralize part selection`)
- 環境: Android Emulator `devin_ps2` (Pixel 6 Pro, Android 14 / google_apis_playstore x86_64), SwiftShader GPU, `wm size 720x1560` + `wm density 280`, Expo Go 57.0.9 + Metro (`pnpm start` on :8081, `adb reverse tcp:8081`)

## 座標 (720x1560 スクリーンショットから PIL で計測した実測値)

| マーカー | 座標 |
|---|---|
| 頭部エリア | (124, 471) |
| 前肢エリア | (279, 649) |
| 咬筋パーツ (ズーム後) | (355, 620) |
| (参考: 咬筋パーツの破線ヒット領域) | x≈228–517, y≈488–803 |

## Run A — 前肢マーカーの元座標へのストレイタップ (issue #67 の形)

| 時刻 (UTC) | コマンド |
|---|---|
| 00:04:50.642 | screencap → `10_before_stray.png` (エリア一覧・6マーカー表示) |
| 00:04:51.077 | `adb shell input tap 124 471` (頭部エリアマーカー) |
| 00:04:51.109 | `adb shell input tap 279 649` (前肢マーカーの**ズーム前**座標; 初タップから ~32ms) |
| 00:04:58.597 | screencap → `11_after_stray.png` |

- 観測: 頭部エリアにズーム、咬筋パーツマーカー (355,620) と破線領域が表示。パネルは「点・ラベル・部位一覧から選べます」+「場所を選び直す」。**選択なし・シート非表示**。
- 注意: (279,649) はズーム後ビューでは咬筋の破線領域内に着弾する位置。旧実装ならここで咬筋が誤選択される。

## Run B — 咬筋マーカー直上へのストレイタップ (確実にヒットする位置)

| 時刻 (UTC) | コマンド |
|---|---|
| 00:06:32.691 | `adb shell input tap 124 471` (頭部エリアマーカー) |
| 00:06:32.737 | `adb shell input tap 355 620` (咬筋マーカーのズーム後座標そのもの; ~46ms) |
| 00:06:35.192 | screencap → `15_stray_on_marker.png` |

- 観測: Run A と同じく選択なし。ガードがマーカー直上のタップも遮断することを確認。

## Run A 続き — ガード後 (>500ms) の正規タップ

| 時刻 (UTC) | コマンド |
|---|---|
| 00:05:23.547 | `adb shell input tap 355 620` (咬筋マーカー; 初タップから ~32.5s) |
| 00:05:25.509 | screencap → `12_masseter_selected.png` |

- 観測: 咬筋シートが開く (タイトル「咬筋」/「頬を覆う厚い咀嚼筋。」/「詳しく読む」「選択を解除」ボタン、マーカーが選択状態の二重リング)。

## logcat

`adb logcat -d ReactNativeJS:* '*:S'` — テスト区間 (00:04–00:07) に ReactNativeJS:E / FATAL / AndroidRuntime / ANR 出力なし。

## 環境メモ (検証とは無関係)

- 00:01:29 に host.exp.exponent (pid 5525) が 1 回落ちた (`Process ... has died: fg TOP`, tombstone なし)。テスト区間外の事象で、`am start -d exp://127.0.0.1:8081` で再起動後の Run A/B はクリーン。

## 結果: PASS

| 期待 | 観測 |
|---|---|
| ガード窓内 (~400ms) のストレイタップで部位が誤選択されない | Run A/B ともに選択なし・部位表示継続 ✅ |
| ガード後の正規タップで咬筋シートが開く | 咬筋シート表示 ✅ |
