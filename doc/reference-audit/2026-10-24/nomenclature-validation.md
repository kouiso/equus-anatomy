# 名称根拠付録の検証（2026-10-24）

今回の変更は[8候補の付録](nomenclature-evidence.md)、[JSON](nomenclature-evidence.json)、対応する回帰検査と入口の文書更新。アプリの表示・データ・検索別名・座標は変更していない。既存の82c4f2aでの結果と分け、以下は今回の変更を含むクラウド環境で実行した結果である。

## 結果

| 実行 | 結果・証跡 |
| --- | --- |
| 追加の名称根拠テスト | 6件成功。[focused-tests.txt](nomenclature-validation/focused-tests.txt) |
| `pnpm verify` | 成功。型検査、lint、単体42ファイル・1,263件、座標検査、Webビルドを伴うPlaywright 150件。[全ログ](nomenclature-validation/verify-pinned.txt) |
| `pnpm derive:left` + 生成後のgit diff | 成功・座標差分なし。[生成](nomenclature-validation/derive-left-pinned.txt) / [差分](nomenclature-validation/derive-diff-pinned.txt) |
| `pnpm audit:coverage` | 成功。原本ハッシュ・既存87項目・レビュー・位置ベースラインを検査。[ログ](nomenclature-validation/base-audit-pinned.txt) |
| `pnpm audit:crosswalk --write-report` | 成功。再生成した全692行の報告は82c4f2aとバイト一致。[ログ](nomenclature-validation/crosswalk-audit-pinned.txt) |
| agent入口 / ローカルCI契約 | 成功 / 10件成功。[入口](nomenclature-validation/agent-entries-pinned.txt) / [契約](nomenclature-validation/ci-contracts-pinned.txt) |
| 秘密情報検査 | 既存履歴167コミットの検査成功。[履歴](nomenclature-validation/history-secret-scan.txt)。追加するstaged差分も検査。[差分](nomenclature-validation/staged-secret-scan.txt) |
| 保持確認 | 原台帳3件、既存レビュー、位置ベースライン、前回の報告と関係レビューの計7ファイルを保持。[SHA-256記録](nomenclature-validation/preservation.json) |

[コマンド・開始終了時刻・終了コード](nomenclature-validation/pinned-results.json)を併記した。前回のpnpm起動失敗ログは上書きしていない。今回は下記の既存固定版とexecutor内の書込可能キャッシュを使い、全単体検査に含まれるimporter検査も成功した。依存定義・lockfile・通信/セキュリティ設定は変更していない。

## 再実行環境

Node 22.23.4、pnpm 10.33.0、Chromium 154.0.8037.57、gitleaks 8.28.0。ツールチェーンは既存の`/tmp/equus-audit-toolchain`と`/tmp/equus-audit-gitleaks`を利用。

```bash
export PATH=/tmp/equus-audit-toolchain/node_modules/.bin:/tmp/equus-audit-gitleaks:$PATH
export XDG_DATA_HOME=/tmp/equus-audit-xdg-data
export XDG_CACHE_HOME=/tmp/equus-audit-xdg-cache
export npm_config_cache=/tmp/equus-audit-npm-cache
export EXPO_NO_TELEMETRY=1
export PLAYWRIGHT_CHROMIUM=/usr/bin/chromium
pnpm verify
pnpm derive:left
git diff --exit-code src/core/data/regions/left.json
pnpm audit:coverage
pnpm audit:crosswalk --write-report
node scripts/check-agent-entrypoints.mjs
node --test .github/ci/run.test.mjs
bash .github/ci/scan.sh
```

## 検証の限界と保存先

ベンダーの実体ID・対象版・選択範囲・desktop/mobile同等性、および位置5項目は未検証。iOS/Androidの実機・ネイティブ検証も未実施。今回はUI変更がなく、新しい画面比較画像は作成していない。Webテスト成功は解剖学的な位置の正しさを意味しない。

Liverpool PDFはHTTP 406で本文取得できず、根拠から除外。WAVA公式ページで版を確認しNAV本文は大学ミラーで読んだが、公式PDFとのバイト同一性は未検証。根拠の取得成否はJSONの各sourceに保持する。

保存対象は既存の独立ブランチ`feat/reference-coverage-audit-20261022`のみ。開始時HEADは`82c4f2aa59313d1cf22cf1418afe0c044ade51d4`。作業ブランチのOpen PRなしとworkflowのpush対象がmainであることを確認。PR209・main・依存・workflow・hookを変更せず、CIの手動起動・PR作成・merge・deployは行わない。通常pushの成否とremote SHAの一致は最終応答で報告する。
