# Round 4 dogfooding 報告 — 未検証項目の潰し (Android エミュレータ)

環境: AVD `devin_ps2` (Pixel 6 Pro, 720x1560@280) / Expo Go 57.0.9 / Metro :8081 + ローカル release APK (`gradlew assembleRelease`)。
証跡: `shots` 相当は `~/round4-evidence/`(`.gitignore` 対象のため未格納、要所は `evidence/` に恒久化)。

## サマリ

| # | 項目 | 結果 |
|---|---|---|
| R4-01 | #65 の原因切り分け | **NaN 説を棄却**。−ボタンで段階復帰・部位一覧から選択で即復帰・logcat 無エラー → transform は有限で、viewBox が描画域(マーカーの無い暗い余白)を向いただけ |
| R4-02 | ピンチズーム | **adb/エミュレータでは検証不可と確定**。`monkey --pct-pinchzoom` は Expo Go HomeActivity または非 scale 系列となり効かない。実機 or 二本指対応ドライバ(Maestro/Appium)が必要 |
| R4-03 | 日本語 IME 検索 | ADBKeyBoard で実測: かな「かんぞう」1件 / 漢字「肝臓」1件 / 全角カナ「カンゾウ」1件 / **半角カナ「ｶﾝｿﾞｳ」0件(新規ギャップ)** / 絵文字 0件・クラッシュなし |
| R4-04 | release ビルド F1 + 性能 | `expo prebuild` + `assembleRelease` で APK 生成成功(114MB)。**F1 は release では非再現**(font_scale 2.0→再起動でもヘッダ埋没せず)。性能: cold start TotalTime 385〜422ms / TOTAL PSS 146MB(dev の 537〜674ms / 634MB から大幅改善) |

## 詳細

### R4-01 — #65 真っ黒キャンバスの原因切り分け

仮説「viewBox の NaN 汚染」を検証した結果、**棄却**:

- 真っ黒状態で − ボタン 1 回で前脚が部分的に復帰、12 回で図+マーカー完全復帰 → viewBox/transform は有限値
- 真っ黒状態で部位一覧モーダルは正常に開き、部位選択(広背筋)で図が表示域に戻る → UI 層・状態管理は生存
- `logcat -d` (ReactNativeJS 全域): エラー・警告・NaN 関連出力なし(`r4-01-logcat-black.txt`)

真因として残る説: `src/core/zoom.ts:26` の `clamp()` は **画像矩形(1600x1200)に対するクランプ**であり、JPEG が持つ暗い余白・マーカーの存在しない領域までパンで行き着ける。8x ズームで余白に出ると「図も点も無い真っ黒」に見える。
**対策方向(修正版)**: クランプ範囲を画像全体ではなく部位ポリゴンの union bbox + padding(=コンテンツ範囲)にするか、端でバネ/フェードのフィードバックを入れる。回帰テスト: `zoom.test.ts` に「最大ズームで四端までパンしてもコンテンツ bbox の一部が viewBox に残る」を追加。

### R4-02 — ピンチズームの検証限界

`adb shell monkey -p host.exp.exponent --pct-pinchzoom 100` は monkey が Expo Go の HomeActivity(ランチャー画面)を起動しイベントがアプリに届かない。ExperienceActivity を前面化して注入しても canvas の scale 不変(monkey のピンチ系列は RNGH の Pinch ジェスチャとして成立しない)。
**確定**: ピンチの実測には実機、または二本指対応ドライバ(Maestro `pinch` 非対応のため Appium/UIAutomator2 系)が必要。

### R4-03 — 日本語入力(ADBKeyBoard 経由)

ADBKeyBoard APK を端末へ導入し `am broadcast -a ADB_INPUT_TEXT` で Unicode 入力して実測:

| 入力 | 件数 | 結果 |
|---|---|---|
| かんぞう (ひらがな) | 1 (肝臓) | PASS — `kanaOf` 読み表でヒット |
| 肝臓 (漢字) | 1 | PASS — `nameJa` 一致 |
| カンゾウ (全角カタカナ) | 1 | PASS — `normalizeQuery` が ァ-ヶ → ひらがな化 |
| ｶﾝｿﾞｳ (半角カナ) | **0** | **GAP** — `normalizeQuery` は半角カナ(FF66-FF9D)を正規化しない(`src/core/search.ts:18-22`) |
| 🐴 (絵文字) | 0 | PASS(仕様内) — 空状態正常、クラッシュなし |

半角カナは古い携帯・外部キーボード・コピペで稀に来る。normalizeQuery に半角→全角カタカナ(または直接ひらがな)変換を足すだけで潰せる軽微なギャップ。

### R4-04 — release ビルド

- ビルド: `CI=1 npx expo prebuild --platform android --clean` → `cd android && ./gradlew assembleRelease`。Maven Central が VM egress IP で 429 になるため init-script で GCS ミラーへ差し替えて回避(手順は SKILL.md に記録)
- F1 再現確認: release APK + font_scale 2.0 + 再起動でもヘッダ埋没**せず**。dev(Expo Go)特有、または low-memory/別トリガー条件の可能性。release での再現条件は未確定のまま(監視項目)
- 性能: cold start `am start -W` TotalTime 385/404/422ms、`dumpsys meminfo` TOTAL PSS 146MB。Expo Go dev bundle(537-674ms/634MB)より大幅に軽く、リリース品質として問題ないレンジ

## 新規 Finding

| # | 内容 | 重要度 |
|---|---|---|
| R4-F1 | 半角カナ検索 0 件(normalizeQuery が半角を正規化しない) | 低 |

## 未検証(最終)

- ピンチズーム実操作(二本指)— 実機 or Appium 系ドライバ要
- F1 の release での再現トリガー(dev では稀に発生する設定変更→リロード経路)
- 実機パフォーマンス/発熱(エミュレータ計測は参考値)
