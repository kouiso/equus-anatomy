# 今回の監査実装の検証

実行環境はLinux、Node 22.23.4、pnpm 10.33.0、Chromium 154。先行UIコミット`545fb5c`や別担当のセットアップ実績と分け、このブランチの監査実装で実行した結果を記録する。[コマンド・終了コード・時刻](validation/results.json)と各ログを同梱する。ログ末尾の空行のみ整形した。

| 検証 | 結果・ログ |
| --- | --- |
| 型検査 | [成功](validation/type-check.txt) |
| lint | [成功](validation/lint.txt) |
| 単体テスト | [40ファイル・1,242件成功](validation/unit.txt)。新規監査17件を含む |
| 台帳監査 | [成功](validation/audit.txt)。原本3件のハッシュ、692行、87項目、全未審査、位置5項目すべて0件確認済み |
| 座標ゲート | [成功](validation/coords.txt)。119配置中108は既存の下書き。解剖学的な正しさは未確認 |
| 左図の再生成 | [成功](validation/derive-left.txt)、[追跡座標に差分なし](validation/derive-diff.txt) |
| 共通AI入口 | [成功](validation/agent-entries.txt) |
| CI実行契約 | [10件成功](validation/ci-contracts.txt) |
| Webビルド・画面テスト | [ビルド成功・150件成功](validation/e2e.txt) |
| 秘密情報検査 | [履歴165コミット成功](validation/secret-scan.txt)。[今回のstaged差分も成功](validation/staged-secret-scan.txt) |

出力JSONは差分を追いやすい1掲載行=1行の形式に整形し、最後に[型](validation/type-check-final.txt)・[lint](validation/lint-final.txt)・[監査17件](validation/audit-final-test.txt)を再確認した。生成JSONの再読込でも692行・errors空を確認した。

新規17件は、原本・現行データの整合、レビュー欠落・ID重複、掲載順・集計不整合、現行データの追加・削除・名称変更、初期候補の自動承認禁止、同義語と包含関係の区別、根拠の参照先、名称と位置の独立、投影の向き・層・深さ・画像ハッシュ等を検査する。テスト用の架空根拠はメモリ上のfixtureのみで、実台帳へ保存していない。

CI契約テストの最初の指定先を`contracts.test.mjs`と誤記し、存在しないパスで終了コード1になった。[失敗ログ](validation/ci-contracts-path-error.txt)を残し、実在する`.github/ci/run.test.mjs`で10件成功を確認した。初期のCLI未使用変数も修正後、上表の型・lint・全単体を完走した。

`1feda0b`から`src/`・`assets/`・`e2e/`・依存lockfile・CI・Maestroに差分なし。新しい部位・名称・説明・画像・座標を本番データへ追加せず、保存・成績互換も維持した。[既存UI修正の前後画像](../../review/2026-10-22-catalog-readability/README.md)はそのまま保持し、今回の監査機能は画面変更を含まないため追加画像は生成していない。

## Macでの最小受入（今回未実施）

1. この作業ブランチを独立checkoutし、Node 22・pnpm 10.33.0で`pnpm install --frozen-lockfile`を実行する。
2. `pnpm audit:coverage`と`pnpm test scripts/reference-audit/audit.test.ts`を実行する。692掲載行、87項目、39/41/612行、位置5項目すべて0件確認済み、mobile未確認を確認する。
3. `pnpm verify`で既存UIも検証する。手動では小型画面・大きな文字で部位名全文、詳細・保存・図への移動が保たれることを確認する。
4. native受入が必要になった時点で、既存の署名・Simulator・端末を使い、[先行UIの受入手順](../../review/2026-10-22-catalog-readability/README.md#macでの最小受入手順未実施)を実施する。今回、新たな実機起動は行わない。

iOS/Androidのnativeビルド・Simulator・実機、OS文字倍率、Safari/Firefox、Android参照アプリ実体は未検証。公開一覧の構造数展開、名称関係の獣医解剖レビュー、位置・左右・深さ・隣接・投影の正確性も未確認。マージ・本番公開・CIの明示起動は行っていない。
