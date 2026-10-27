# 図鑑・保存一覧で部位名を省略せず読む

2026-10-22 のリモート main `606bff46f0dc54c4b156bca9538a62d762c7c6ce` を基点に確認した。
#208 は `f9d1ce5`、#205 も `606bff4` でマージ済みだった。起動画面と解剖パネルの既存修正を重複実装せず、独立ブランチ `fix/cloud-ui-navigation-20261022` で一覧の可読性を修正する。
確認時に open のPRは無かった。関連する小画面の既知課題 #66 と #205、残件 #173 / #175 / #176 / #164 を確認した。

## 再現と変更

幅320×568・本文文字2倍・英語で、図鑑から Brachiocephalicus を検索すると名前が「B…」になる。
保存一覧でも「Brachi…」になり、名称を確認してから図へ進めない。保存行の名称は表示幅104pxに対し内容220px、同じ条件のラテン名も表示幅104pxに対し内容178pxだった。
日本語でもラテン名の省略を再現した。変更前ビルドで、新しい回帰試験6件は4件成功・2件失敗となり、320px条件は英語・日本語とも名称の実寸検査で失敗する。

- 図鑑は画面幅を文字倍率で割った値が600未満なら、層・名称・場所を縦に配置する。
- 保存一覧も同条件で名称の下に操作を置く。
- 一覧の名称とラテン名の1行省略を外し、全文を折り返す。広い画面でも長い名称は読める。
- 既存の図へのリンク、詳細、保存・解除の処理を利用する。名称・説明・座標・画像・通信・認証は変更していない。

## 同条件の画面証跡

Chromium の実アプリ画面。before は main `606bff4` のWeb書き出し、after は本ブランチの修正を含むWeb書き出し。
`e2e/catalog-readability.spec.ts` で同じ部位・言語・viewport・文字倍率を指定し、図鑑は行をスクロールで表示してから、保存は詳細から実際に保存してから撮影した。
文字2倍は既存の `installTwoTimesTextScale` を使うWeb検査であり、OSのネイティブ文字倍率と同一とは認定しない。

| 条件 | 図鑑 before / after | 保存 before / after |
| --- | --- | --- |
| 英語 320×568・2倍 | [before](evidence/before-en-320-2x-catalog.png) / [after](evidence/after-en-320-2x-catalog.png) | [before](evidence/before-en-320-2x-saved.png) / [after](evidence/after-en-320-2x-saved.png) |
| 日本語 320×568・2倍 | [before](evidence/before-ja-320-2x-catalog.png) / [after](evidence/after-ja-320-2x-catalog.png) | [before](evidence/before-ja-320-2x-saved.png) / [after](evidence/after-ja-320-2x-saved.png) |
| 英語 375×812・1倍 | [before](evidence/before-en-375-1x-catalog.png) / [after](evidence/after-en-375-1x-catalog.png) | [before](evidence/before-en-375-1x-saved.png) / [after](evidence/after-en-375-1x-saved.png) |
| 日本語 375×812・1倍 | [before](evidence/before-ja-375-1x-catalog.png) / [after](evidence/after-ja-375-1x-catalog.png) | [before](evidence/before-ja-375-1x-saved.png) / [after](evidence/after-ja-375-1x-saved.png) |
| 英語 1280×800・1倍 | [before](evidence/before-en-1280-1x-catalog.png) / [after](evidence/after-en-1280-1x-catalog.png) | [before](evidence/before-en-1280-1x-saved.png) / [after](evidence/after-en-1280-1x-saved.png) |
| 日本語 1280×800・1倍 | [before](evidence/before-ja-1280-1x-catalog.png) / [after](evidence/after-ja-1280-1x-catalog.png) | [before](evidence/before-ja-1280-1x-saved.png) / [after](evidence/after-ja-1280-1x-saved.png) |

## クラウド検証

Linux、Node 22.23.4、pnpm 10.33.0、Chromium 154.0.8037.57。初回の調査はNode 24.19.0、最終の全体検証と画像採取はCIに合わせたNode 22で実行した。
`pnpm install --frozen-lockfile` を使用した。クラウドの既定pnpmが指定版と異なるため、指定版を一時ディレクトリに導入した。Expoは検証コマンドのみ `EXPO_NO_TELEMETRY=1` とし、ユーザー設定ディレクトリへの書き込みを避けた。

| 検査 | 結果 |
| --- | --- |
| `pnpm verify` | 成功。型・lint・単体1225件（39ファイル）・座標検査・Webビルド・E2E150件 |
| 新規の可読性・導線E2E | 成功6件。変更前mainでは4件成功・2件失敗 |
| `node scripts/check-agent-entrypoints.mjs` | 入口と共通Skillのずれなし |
| `node --test .github/ci/run.test.mjs` | 成功10件 |
| `pnpm derive:left` 後の `git diff --exit-code -- src/core/data/regions/left.json` | 差分なし |
| `git diff --check` | 成功 |
| gitleaks 8.28.0による履歴検査（修正前163コミット） | 検出なし。本修正コミットもpush前に別途検査する |

全体検証のログは [verify.log](evidence/verify.log)、比較試験は [before](evidence/readability-before.log) / [after](evidence/readability-after.log)、共通CIの契約試験は [ci-contracts.log](evidence/ci-contracts.log) に保存した。
画像のハッシュは [images.sha256](evidence/images.sha256) に記録した。
途中の実装で検出したリンクへのスタイル配列の渡し方を修正し、全体検証をやり直した。
比較試験と全体試験の出力先が衝突した実行は中断・破棄し、出力先を分離した上で上表の検証を完走した。
GitHub Actionsの明示起動、マージ、Draft解除、公開・配布は行っていない。

## Macでの最小受入手順（未実施）

既存のXcode・iOS Simulator、Android SDK・エミュレータを使う。新しい認証情報、署名・配布設定は作成しない。

1. このブランチをcheckoutし、Node 22・pnpm 10.33.0で `pnpm install --frozen-lockfile`、`pnpm verify` を実行する。
2. 準備済みのSimulatorで `pnpm ios`、準備済みのAndroidエミュレータで `pnpm android` を実行する。実機確認も別途必要。
3. 通常文字とOSの最大文字サイズ（200%相当）でアプリを再起動する。日本語・英語の両方で図鑑から「腕頭筋」または「Brachiocephalicus」を検索し、名称・ラテン名が全文読めることを確認する。
4. 詳細で保存し、保存タブで同じ名称を確認する。「図で見る」で同じ部位の点が選択されること、詳細への移動、保存解除と取り消しを確認する。
5. 小型端末・タブレット、向きの変更でも名称と操作が重ならず、操作のタップ領域が44pt以上あることを確認し、画像を残す。

iOS/Androidのネイティブビルド・Simulator・実機、OS文字倍率、Safari/Firefoxは本クラウドでは未検証。
#176 の最終native証跡、#175 の独立原画測定、#164 の未配置部位・新規アートワークは完了扱いにしない。
