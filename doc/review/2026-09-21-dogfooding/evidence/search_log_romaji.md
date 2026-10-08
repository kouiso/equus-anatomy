# EQUUS #122 検索正規化 (半角カナ + ローマ字) — エミュレータ検証ログ [実機目視=エミュレータ]

- 日時: 2026-10-08 00:08–00:09 UTC
- ブランチ: `devin/1791399060-search-normalize-romaji` @ b2813ea (`refactor(search): derive kana aliases from region/layer instead of per-id table`, 上位 4eca795 `fix(search): normalize half-width kana and index romaji readings`)
- 環境: Android Emulator `devin_ps2` (Pixel 6 Pro, Android 14), `wm size 720x1560` + `wm density 280`, Expo Go 57.0.9 + Metro (`pnpm start` on :8081, `adb reverse tcp:8081`)
- 日本語入力: ADBKeyBoard (senzhk/ADBKeyBoard v2) — `adb install ADBKeyboard.apk` → `ime enable/set com.android.adbkeyboard/.AdbIME` → `am broadcast -a ADB_INPUT_TEXT --es msg '<text>'`

## 手順 (各シナリオ共通)

1. 図鑑タブ (120,1470) を開く
2. 検索ボックス (360,330) をタップしてフォーカス
3. `am broadcast -a ADB_INPUT_TEXT --es msg '<入力>'`
4. screencap を pull して件数表示 + 行を確認
5. 「消去」ボタン (647,332) でクリアして次へ

## 結果

| # | 入力 | 期待 | 観測 | 判定 | スクショ |
|---|---|---|---|---|---|
| a | `ｶﾝｿﾞｳ` (半角カタカナ) | `1 部位` + 肝臓行 | `1 部位`, 肝臓/Hepar (内臓・腹腔) 1行 | **PASS** | 22_search_kanzou_halfwidth.png |
| b | `hone` | `14 部位` | `14 部位`, 骨格行 (頭蓋/頸椎/肩甲骨/上腕骨/肋骨/腰椎…) | **PASS** | 23_search_hone.png |
| c | `kubi` | `4 部位` | `4 部位`, 頸/Collum・腕頭筋・頸椎・板状筋 (全て頸部) | **PASS** | 24_search_kubi.png |

- 件数表示の数字は Cormorant オールドスタイル数字 (「1」が "I"、「14」が "I4" に見える) — 仕様上の見え方でバグではない (SKILL.md 既知事項)。
- logcat: ReactNativeJS:E / FATAL なし。00:07:21 に一過性の `Cannot connect to Expo CLI` 警告のみ (Metro 再起動直後の瞬間、旧プロセスが出力; 以後バンドル成功・動作正常)。

## 総合: 全 3 シナリオ PASS
