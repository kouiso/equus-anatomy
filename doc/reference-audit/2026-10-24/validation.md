# 追加対照監査の検証

2026-10-24のクラウド環境で実行。最終確認はNode 22.23.4・pnpm 10.33.0と既存`node_modules`を使用した。開始時のNode 24.19.0 / pnpm 11.25.0で発生した環境差を診断し、指定ツールだけを`/tmp/equus-audit-toolchain`へ導入した。npm・XDGキャッシュも`/tmp`へ限定し、HOME・repoの依存/lockfile・セキュリティ設定・hooksを変更していない。前回の検証結果と混同しない。

| 検証 | 今回の結果 |
| --- | --- |
| アプリ型検査 | [成功](validation/type-check-app.txt) |
| Node用型検査 | [成功](validation/type-check-node.txt) |
| lint | [成功](validation/lint.txt) |
| 監査テスト | [2ファイル32件成功](validation/audit-tests-final.txt)。新規15件と既存17件 |
| 初回の全単体 | [1,254件成功・環境要因で3件失敗](validation/unit.txt)。失敗ログを保持 |
| 指定ツールでの全単体 | [41ファイル・1,257件成功](validation/verify-pinned.txt) |
| 失敗した取り込み3件の個別再実行 | [3件成功](validation/import-annotations-rerun-pinned.txt) |
| 指定ツールでのWebビルド・画面テスト | [ビルド成功・150件成功](validation/verify-pinned.txt) |
| 左図再生成と差分 | [成功](validation/derive-left-pinned.txt)、[座標差分なし](validation/derive-diff-pinned.txt) |
| 指定ツールでの追加監査 | [成功](validation/crosswalk-audit-pinned.txt) |
| CI契約のローカル試験 | [10件成功](validation/ci-contracts-pinned.txt) |
| 原本保持・レポート再現性 | [原本ハッシュ保持・再生成バイト一致](validation/preservation-and-reproduction.json) |
| 秘密情報検査 | [履歴166コミット成功](validation/history-secret-scan.txt)、[staged差分も成功](validation/staged-secret-scan.txt) |
| 原本・既存台帳監査 | [成功](validation/base-audit.txt)。39/41/612の初期照合と位置未確認を保持 |
| 追加対照監査・JSON生成 | [成功](validation/crosswalk-audit.txt)。全692行を出力、errors空 |
| AI入口の整合 | [成功](validation/agent-entries.txt) |

[初回一括検証](validation/results.json)は環境要因の全単体失敗で停止した記録。[監査の個別再確認](validation/final-results.json)と[指定ツールでの一括再実行](validation/pinned-results.json)を分けて保持する。ログ末尾の空行のみ整形した。

全単体で失敗したのは`scripts/import-annotations.test.ts`の3件。内部で起動する既定pnpm 11が依存の自動インストールを試み、`/home/agent/.local/share/pnpm`を作成できず`ENOENT`で停止した。監査テストはこの失敗を含まない。取り込み処理・依存・repo設定は変更せず、書込可能な一時キャッシュと指定ツールを使い、該当3件と全単体1,257件の再実行が成功した。バージョンチェック・試験・hooksの回避は行っていない。

新規15件は、表記数と構造個体数の区別、区分をまたぐ衝突、同一区分反復の未確認保持、左右の保持、番号範囲を展開しないこと、表記検索の限定、同一文字列でも同義と認定しないこと、根拠・名称審査・台帳ハッシュが不足した欠落判断の拒否、同一性判断の直接/推移的矛盾、明示左右の誤統合を検査する。架空の根拠はテスト用メモリ内だけで、実際の関係レビューJSONは空のまま。

作業開始時は同一worktree1件、head `9bc2941797fdedcbac646a4bc0aacd7159224024`、作業ツリーはクリーン。他担当は読取のみとの親の確認があり、開始時にnode・pnpm・gitの別プロセスもなかった。既存ブランチを維持し、UI修正PR #209のhead `545fb5c`を変更していない。

`9bc2941`から`src/`・`assets/`・`e2e/`・lockfile・CI・Maestro・原台帳JSON3件・既存名称/位置レビュー・座標基準に差分なし。Web画面の変更はないが、通常pushの前提となるローカル検証のためWebビルド・画面テストも再実行した。追加画像は生成していない。iOS/Android・Mac・実機は未検証。アプリ取得・参照資産コピー・新規購入・CI起動・merge・deploy・配布は行っていない。

通常pushの事前確認では対象ブランチにopen PRはなく、既存workflowのpush対象はmainに限定されている。作業ブランチへの通常pushだけを行い、PR作成・GitHub Actionsの明示起動・merge・deployは行わない。
