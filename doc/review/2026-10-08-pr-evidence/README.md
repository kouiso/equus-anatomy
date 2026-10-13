# PR #133〜#141 の動作確認の証跡 2026-10-08

#133〜#141 で行った動作確認の録画・スクリーンショット・Maestro の結果・ログをまとめた。各 PR の本文「証跡」からここへリンクしている。

- Web の録画とスクリーンショットは Playwright（Chromium）で撮影した。幅 390×844 が基準で、#135 だけは iPad 横向き 1024×768。
- Android / iOS の画面は GitHub Actions の Maestro Smoke（Android API 34 pixel_6 エミュレータ、iOS 26.5 シミュレータ）が撮ったスクリーンショット。
- GIF は PR 本文で見るための縮小版。元の解像度で見るときは同じフォルダの mp4 を使う。
- この環境には KVM が無いため、Android / iOS の確認はすべて CI の Maestro Smoke で行った。

| PR | 内容 | CI verify | フォルダ |
|---|---|---|---|
| #133 | 座標の並び順テスト・手修正座標の集約 (#129) | [37785367874](https://github.com/kouiso/equus-anatomy/actions/runs/37785367874) | [133-coords](133-coords/) |
| #134 | プライバシーポリシー配信・OGP・VIA の GA 削除 (#45, #57, #43) | [37785617251](https://github.com/kouiso/equus-anatomy/actions/runs/37785617251) | [134-web](134-web/) |
| #135 | iPad 横向き e2e・Maestro フロー拡充 (#44, #41) | [37792865835](https://github.com/kouiso/equus-anatomy/actions/runs/37792865835) | [135-ipad-maestro](135-ipad-maestro/) |
| #136 | ストア提出用ビルド経路 (#39) | [37787400423](https://github.com/kouiso/equus-anatomy/actions/runs/37787400423) | なし（CI のみ） |
| #137 | 端末 BACK で選択を 1 段ずつ解除・フッター順 (#82) | [37862183235](https://github.com/kouiso/equus-anatomy/actions/runs/37862183235) | [137-back](137-back/) |
| #138 | ローマ字の混在綴り・ei→e (#130) | [37787759374](https://github.com/kouiso/equus-anatomy/actions/runs/37787759374) | [138-romaji](138-romaji/) |
| #139 | 文字 200% のレイアウト崩れ (#66) | [37861907514](https://github.com/kouiso/equus-anatomy/actions/runs/37861907514) | [139-font200](139-font200/) |
| #140 | 英語・日本語の多言語基盤 (#72) | [37788518605](https://github.com/kouiso/equus-anatomy/actions/runs/37788518605) | [140-i18n](140-i18n/) |
| #141 | About・ライセンス・クラッシュ情報・監修状態 (#40, #56) | [37861859394](https://github.com/kouiso/equus-anatomy/actions/runs/37861859394) | [141-about](141-about/) |

## #133 座標

[`133-coords/derive-idempotency.txt`](133-coords/derive-idempotency.txt): main（d547739）で `pnpm derive:left` を 2 回実行し、2 回とも `left.json` に差分が出ないこと、追加したテスト 13 件の通過、`pnpm validate:coords` の通過を記録した。CI の verify にも同じ冪等チェックを入れてある。

## #134 Web 公開物

[`134-web/live-check.txt`](134-web/live-check.txt): 本番 https://equus-anatomy-84f.pages.dev をマージ後に curl で確認した結果（2026-10-09T00:08:59Z）。

- `/`・`/privacy-policy`・`/privacy-policy.html`・`/og-image.jpg` がすべて 200 を返す（#45）
- トップの HTML に og:* が 10 件、twitter:* が 4 件出力されている（#57）
- `tools/via/via.html` に GA の痕跡が無い（#43）

## #135 iPad 横向き・Maestro

iPad 1024×768 横向き（Web、タッチ操作）: 一覧 → 腕頭筋 → 詳しく読む → 閉じる、表示条件の切替、ズーム、保存の順に操作した。

![iPad 横向き](135-ipad-maestro/ipad-landscape.gif)

Maestro Smoke [run 37792858097](https://github.com/kouiso/equus-anatomy/actions/runs/37792858097): Android 5/5、iOS 5/5 が通過した（[Android の結果](135-ipad-maestro/maestro-results-android.xml)、[iOS の結果](135-ipad-maestro/maestro-results-ios.xml)）。この前の run 37787209238 では、Android の「この条件で表示」が 3 ボタンナビの裏に隠れる不具合と、iOS が Metro 待ちで時間切れになる問題が見つかったので、それぞれ修正してから再実行した。

| | 起動 | 保存→解除→取り消し | 覚えた ON | 右側望・内臓 | ズーム ×2 | 全体に戻る |
|---|---|---|---|---|---|---|
| Android | ![](135-ipad-maestro/android/anatomy-top.jpg) | ![](135-ipad-maestro/android/saved-after-undo.jpg) | ![](135-ipad-maestro/android/mastery-on.jpg) | ![](135-ipad-maestro/android/right-organs.jpg) | ![](135-ipad-maestro/android/zoom-in-x2.jpg) | ![](135-ipad-maestro/android/zoom-reset.jpg) |
| iOS | ![](135-ipad-maestro/ios/anatomy-top.jpg) | ![](135-ipad-maestro/ios/saved-after-undo.jpg) | ![](135-ipad-maestro/ios/mastery-on.jpg) | ![](135-ipad-maestro/ios/right-organs.jpg) | ![](135-ipad-maestro/ios/zoom-in-x2.jpg) | ![](135-ipad-maestro/ios/zoom-reset.jpg) |

## #136 ストア提出用ビルド

画面の変更は無い。PR の Store Build [run 37787400776](https://github.com/kouiso/equus-anatomy/actions/runs/37787400776) で、Android AAB（`bundleRelease`、debug 署名、送信なし）のビルドが成功した。iOS IPA は secrets が要るため、pull_request トリガーではスキップされる設計になっている。

## #137 端末 BACK・選択解除

Web の録画（37 秒）: 場所を選ぶ → 部位を選ぶ → 戻るで部位を解除 → 戻るで場所を解除 → 戻るで図鑑へ遷移 → 「× 選択を解除」と案内文 → × で解除 → 空白タップで解除 → フッターの順番。戻るの場面は、Esc キーで `stepBackAnatomy()` を呼ぶ検証専用ビルドで撮った（このビルドはコミットしていない）。端末の BACK そのものは、下の Android エミュレータで確認した。

![BACK と選択解除](137-back/back-ux.gif)

| 部位を選択 | 戻る 1 回目（部位を解除） | 戻る 2 回目（場所を解除） | 戻る 3 回目（遷移） | × 選択を解除 | フッター順 |
|---|---|---|---|---|---|
| ![](137-back/01-part-selected.jpg) | ![](137-back/02-back1-part-cleared.jpg) | ![](137-back/03-back2-area-cleared.jpg) | ![](137-back/04-back3-navigated.jpg) | ![](137-back/05-deselect-affordance.jpg) | ![](137-back/06-footer-order.jpg) |

Android の端末 BACK（Maestro Smoke [run 37799491884](https://github.com/kouiso/equus-anatomy/actions/runs/37799491884) の 2 回目の試行、`back-deselect.yaml`）。[結果](137-back/maestro-results-android.xml)は BACK・launch とも通過。1 回目の試行では、BACK は通過したものの、続く launch が起動直後の Hermes の SIGSEGV で落ちた。iOS ジョブは、#135 で直した Metro 待ちの既存の問題で赤くなったので、途中で止めた。

| 頭部 → 咬筋を選択 | BACK 1 回目: 部位だけ外れる | BACK 2 回目: 場所も外れ全体図へ |
|---|---|---|
| ![](137-back/android/back-0-part-selected.jpg) | ![](137-back/android/back-1-part-cleared.jpg) | ![](137-back/android/back-2-area-cleared.jpg) |

## #138 ローマ字検索

図鑑で `zyouwankotsu` → 上腕骨、`ketsui` → 頸椎 が出ることを確認した。

![ローマ字検索](138-romaji/romaji.gif)

## #139 文字 200%

Chromium の文字サイズを 200% にして、修正前（main）と修正後を同じ手順で撮った。320×568 では、修正前は「場所を選び直す」がパネルの外に押し出されて押せない（タップしても画面が変わらない）。修正後はボタンが残り、図鑑の見出しと層バッジも縦に割れない。

![文字200%](139-font200/font-200.gif)

| 320×568 | 解剖パネル | 図鑑の行 | 表示条件 |
|---|---|---|---|
| 修正前 | ![](139-font200/before-panel-320x568.jpg) | ![](139-font200/before-catalog-rows-320x568.jpg) | ![](139-font200/before-conditions-320x568.jpg) |
| 修正後 | ![](139-font200/after-panel-320x568.jpg) | ![](139-font200/after-catalog-rows-320x568.jpg) | ![](139-font200/after-conditions-320x568.jpg) |

| 390×844 | 解剖パネル | 図鑑 | 図鑑の行 |
|---|---|---|---|
| 修正前 | ![](139-font200/before-panel-390x844.jpg) | ![](139-font200/before-catalog-390x844.jpg) | ![](139-font200/before-catalog-rows-390x844.jpg) |
| 修正後 | ![](139-font200/after-panel-390x844.jpg) | ![](139-font200/after-catalog-390x844.jpg) | ![](139-font200/after-catalog-rows-390x844.jpg) |

## #140 多言語

英語 UI で開き、ヘッダの言語ボタンで日本語・英語を切り替える。再読み込み後も選んだ言語が残る。図鑑では `liver` と「肝臓」のどちらでも、どちらの言語でも肝臓が出る。英訳の無い解説は日本語で表示し、英訳待ちであることを英語で注記する。

![多言語](140-i18n/i18n.gif)

| EN 解剖 | EN 前肢 | EN 図鑑 | EN 検索 liver | JA 検索 肝臓 | JA 再読み込み後 |
|---|---|---|---|---|---|
| ![](140-i18n/01-en-anatomy.jpg) | ![](140-i18n/02-en-forelimb.jpg) | ![](140-i18n/03-en-catalog.jpg) | ![](140-i18n/04-en-search-liver.jpg) | ![](140-i18n/06-ja-search-kanzo.jpg) | ![](140-i18n/08-ja-after-reload.jpg) |

| JA 詳細 | EN 詳細 | EN 表示条件 | EN 詳細（解説は日本語にフォールバック） | EN 保存→取り消し |
|---|---|---|---|---|
| ![](140-i18n/09-ja-detail.jpg) | ![](140-i18n/10-en-detail.jpg) | ![](140-i18n/13-en-overlay-conditions.jpg) | ![](140-i18n/14-en-overlay-detail-ja-fallback.jpg) | ![](140-i18n/15-en-saved-undo.jpg) |

## #141 About・クラッシュ情報・監修状態

ヘッダの i → About を上から下まで → OFL/MIT 本文の展開 → プライバシーポリシー → 図鑑の詳細と部位解説の「未監修」 → クラッシュ画面でクラッシュ情報をコピー → 「もう一度開く」で復帰（復帰後は 01 と同じ画面）。

![About](141-about/about.gif)

| ヘッダ注記と i | About（監修状態: 未監修） | プライバシー・問い合わせ | OFL 本文 | OSS（MIT） | プライバシーポリシー |
|---|---|---|---|---|---|
| ![](141-about/01-header-demo-note.jpg) | ![](141-about/02-about-top.jpg) | ![](141-about/04-about-privacy-contact.jpg) | ![](141-about/05-about-ofl-text.jpg) | ![](141-about/06-about-oss-mit.jpg) | ![](141-about/07-privacy-policy-popup.jpg) |

| 図鑑詳細の監修表示 | 部位解説の監修表示 | クラッシュ情報 | コピー後 | 復帰 |
|---|---|---|---|---|
| ![](141-about/08-catalog-detail-supervision.jpg) | ![](141-about/09-part-sheet-supervision.jpg) | ![](141-about/10-crash-details.jpg) | ![](141-about/11-crash-copied.jpg) | ![](141-about/12-recovered.jpg) |
