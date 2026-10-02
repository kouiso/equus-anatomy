# Round 2 dogfooding test plan — EQUUS 馬体解剖

環境: emulator-5554 (1440x3120, density 560), Expo Go, Metro localhost:8081 (稼働確認済)。adb 座標=物理px、screencap 1:1。
録画中は `wm size 720x1560`+`wm density 280` で窓を収める。証跡は `shots/r2-*.png`、動作系は録画+時刻。
Round-1 F1–F4 は除外。

根拠コード: saved.tsx:40-53 (空状態文言「保存した部位はまだありません。」+「解剖図を開く」リンク、undo バーはタイマー無し=手動 dismiss 無し), catalog/[id].tsx:103-108 (覚えた/覚えたにする), catalog/index.tsx:92 (覚えた N / 52), overlay.tsx:97,127, anatomy-state.ts changeConditions (view 変更時のみ zoom リセット→層変更ではズーム維持が仕様).

## R2-1 フォント 200% + density 560
`settings put system font_scale 2.0` → force-stop→再起動。解剖/図鑑/保存/表示条件モーダル/部位一覧/詳細/図鑑詳細を撮影。
PASS: 全ボタンのラベルが完全表示・重なり無し・モーダル「閉じる」「この条件で表示」が画面内で押せる。FAIL: 省略/重なり/画面外。終了後 1.0 に戻す。

## R2-2 アクセシビリティ(uiautomator dump)
解剖/図鑑/保存/詳細 overlay で `uiautomator dump` → clickable=true かつ text="" かつ content-desc="" のノードを列挙。
PASS: 0 件。FAIL: 件数と bounds を報告。

## R2-3 バックスタック
表示条件/部位一覧/詳細overlay/図鑑詳細/「図」経由の解剖 の各所で BACK 連打 (5 回)。左端スワイプも 1 回。
PASS: 順に閉じ→タブ root→アプリ退出(1 回のみ)、白画面/二重モーダル無し。

## R2-4 高速切替
表示条件で向き/層を 20 回交互高速タップ → 最終状態が最後のタップと一致。モーダル開閉アニメ中に背面をタップ。部位ダブルタップ、2 部位 100ms 以内タップ。
PASS: パネル表示部位が最後にタップした部位、opening ロック残留無し(次の押下が効く)。

## R2-5 回転
各タブ+overlay で `user_rotation 1`→`0`。PASS: display orientation 0 維持、選択/ズーム維持。

## R2-6 ズーム限界
+ を上限まで → 小部位タップ → 正しい部位。パンで端まで → 図が完全に消えるか。リセットで戻るか。層切替でズーム維持か。

## R2-7 検索境界
空/1 文字 "a"/半角カナ不可のため romaji "kanzou"/英 "liver"/100 文字/絵文字(unicode escape 不可→`input text` 限界を記録)。件数と空状態文言を記録。

## R2-8 保存・覚えた
52 件全て覚えた(図鑑詳細で順次) → カウンタ 52 / 52 の表示。保存 0 → 「保存した部位はまだありません。」+「解剖図を開く」。undo バーが消えるタイミング。

## R2-9 起動時間/メモリ
`am start -W` (ExperienceActivity) ×3、`dumpsys meminfo host.exp.exponent`、`send-trim-memory RUNNING_CRITICAL`→復帰で状態維持。

## R2-10 全 52 部位コンテンツ walk
図鑑行 → 詳細を全て撮影 `r2-detail-NN-<id>.png`。行名 vs 詳細タイトル一致、省略、行き止まりボタン、解剖学的誤り。

## R2-11 右側望ミラー
右側望 骨格/筋肉/内臓 で「左〜」ラベル・鏡文字・非対称の有無。

## R2-12 IME
`ime list -a` = LatinIME/VoiceIME のみ → 日本語 IME 無し。romaji 入力で代替し制限記録。
