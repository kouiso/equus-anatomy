# #220 実行検証と未達

今回のmain基点ブランチで実行。前回の研究ブランチの成功件数を流用していない。変更後の`structures.ts` blobは`569cc8d2f137745eb90fdd70c52d9b87b5ccc874`。[コード・画像・16ケースのハッシュ記録](evidence-manifest.json)と[実行時刻・コマンド・終了コード](evidence/checks/results.json)を併記する。

## 最終結果

| 検査 | 結果・ログ |
| --- | --- |
| `pnpm verify` | **成功**。型検査・lint・単体40ファイル1,239件・座標検査・Webビルド・Chromium E2E 160件。[全ログ](evidence/checks/verify.log) |
| 名称/検索の対象検査 | 38件成功（追加の名称保持/非変更範囲14件と既存検索24件）。[ログ](evidence/checks/focused-tests.log) |
| 変更前の実ブラウザ | 既存mainのビルドで8部位×日英16件成功。[ログ](evidence/checks/before-browser.log) / [ビルド](evidence/checks/baseline-build.log) |
| 変更後の実ブラウザ | 全E2E内の新規16件成功。現名・旧入力・ラテン名→同じIDの詳細、既存7部位の図上選択、位置未登録1部位を日英で確認。before/after各30画像 |
| `pnpm derive:left` / 差分 | 成功 / 差分なし。[生成](evidence/checks/derive-left.log) / [差分](evidence/checks/derive-diff.log) |
| 固定c479d462の既存coverage/crosswalk単体 | 32件成功。[ログ](evidence/checks/fixed-reference-tests.log)。これは旧監査実装の検査であり、現在アプリの医学的検収ではない |
| 現在版を入力したreference-check | 成功。旧台帳との差分警告1件と名称差分5 IDを明示、追加/削除なし、geometry一致、current crosswalk errors 0、新しい対応先ID 0。[ログ](evidence/checks/reference-check.log) |
| agent入口 / ローカルCI契約 | 成功 / 10件成功。[入口](evidence/checks/agent-entries.log) / [契約](evidence/checks/ci-contracts.log) |
| gitleaks 8.28.0 | 既存履歴169コミットで検出なし。[履歴](evidence/checks/history-secret-scan.log)。追加staged差分も検査。[差分](evidence/checks/staged-secret-scan.log) |

`check-pbi220-reference.ts`は固定c479d462のdetached checkoutから監査と原本を読み、書き込まない。旧台帳を更新して名称差分を隠さず、5 IDが今回の許可された名称差分と一致することを確認する。通常coverageの無条件all-passと報告せず、警告を残したまま差分の理由を#220へ対応付けた。

ログは追跡可能な`checks/`へ保存し、行末の空白だけを正規化した。終了コード・失敗内容・件数は保持している。

## 初回失敗と修正

全回帰の初回は単体1,239件成功、Web E2E 147成功・13失敗だった。[初回ログ](evidence/checks/verify-first.log) / [終了コード](evidence/checks/results-first.json)。全13件は旧表示`腕頭筋`を完全一致で探すselector/期待値であり、実画面の`上腕頭筋`と不一致。既存3 specの該当表示期待だけを更新し、同じ操作・marker ID・位置保持のassertionは維持した。その後の同じ`pnpm verify`で160件成功を確認した。

追加ハーネスの初期段階では、`newQueries`が未定義のケースの型エラーを修正した。[初期型検査](evidence/checks/types-initial.log)。また、既存導線の`?from=catalog`と、選択後に`part`クエリがURLから消える仕様をハーネスで扱うようにした。アプリ不具合の再現として数えていない。最終beforeは16件、afterは全回帰内の16件が成功している。

## 環境と再現

Node 22.23.4、pnpm 10.33.0、Chromium 154、Linux。既存アプリの依存は元のlockfileと一致するnode_modulesを利用した。固定Node/pnpmとgitleaksはexecutorの一時領域へ準備し、repoの依存・lockfile・workflow・セキュリティ設定は変更していない。gitleaksの公式release archiveは公式checksumsのSHA-256（`a65b5253807a68ac0cafa4414031fd740aeb55f54fb7e55f386acb52e6a840eb`）と一致を確認してから利用した。

```bash
export PATH=/tmp/equus-pbi220-toolchain/node_modules/.bin:$PATH
export XDG_DATA_HOME=/tmp/equus-pbi220-xdg-data
export XDG_CACHE_HOME=/tmp/equus-pbi220-xdg-cache
export npm_config_cache=/tmp/equus-pbi220-npm-cache
export EXPO_NO_TELEMETRY=1
export PLAYWRIGHT_CHROMIUM=/usr/bin/chromium
export EQUUS_NAMES_EVIDENCE_DIR=doc/review/2026-10-25-pbi-220-names/evidence/after
pnpm verify
pnpm derive:left
git diff --exit-code src/core/data/regions/left.json
pnpm exec tsx scripts/check-pbi220-reference.ts /path/to/detached-c479d462
node scripts/check-agent-entrypoints.mjs
node --test .github/ci/run.test.mjs
```

`EQUUS_NAMES_STAGE=before`は既存mainの変更前画面記録専用で、通常の回帰は未指定（after期待）で実行する。before記録の成功を変更後期待の合格と混同しない。

## 未達・範囲外

- 正誤反映PDF本体は通常/正式execとも通信403で未取得。旧第6版本文と公開正誤表を版・ページ別に照合した。[8件の原典判定](README.md)。正式execの自動承認審査に拒否されたのではなく、実行後の通信エラーである。
- 名前と同義関係の判断は全説明・機能・臨床・位置を承認しない。保存済みID・選択経路・87構造・図版・座標を保持した。位置の医学的正確性・vendor identity・最新PDF同一性・獣医監修済み認定は未検証。
- 実ブラウザはChromium Web。iOS/Android実機・native・3Dの合格にはしない。SDK同意・ログイン・端末操作は未実施。
- 研究ブランチ・PBI #219のworkflowは変更しない。新規PR・CI手動起動・merge・deploy・公開配布を行わない。作業ブランチpush時のremote SHAと#220への記録先は最終応答で報告する。
