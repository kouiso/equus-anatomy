# #185 解析成果の索引(2026-10-25)

PBI #185「購入済み馬解剖2アプリの解析 → 部位網羅資料 + 非公開PDF → 実装PBI起票」の成果物ハブ。
この README から全結論の根拠へ戻れることを確認済み。

> 訂正記録(2026-10-26): 非公開指定の解析PDF・解析メモ・APK抽出部品表の一次資料・内部証跡の所在記録は、
> 非公開指定にもかかわらず公開ブランチへ配置されていたため、履歴を含めて本リポジトリから除去した。
> 正本は Google Drive「06_受信箱/ダウンロード」の `equus-anatomy-analysis-2026-10-25.pdf`。
> あわせて `structure-ledger.csv` の `position_status` 誤記6件(位置列が空なのに `measured`)を `未確認` へ訂正。

## 成果物

| 成果物 | 場所 | 状態 |
|---|---|---|
| 構造台帳(全構造×全項目) | [structure-ledger.csv](./structure-ledger.csv) | 1598構造群・3ソース統合済み |
| 台帳の生データ(JSON) | [structure-ledger.raw.json](./structure-ledger.raw.json) | 名前正規化のグループ単位 |
| 系統別照合表 | [coverage-matrix.md](./coverage-matrix.md) | 網羅漏れはここで確認 |
| 踏襲対象機能の差分 | [feature-diff.md](./feature-diff.md) | クイズ以外の全機能 |
| 実装差分の対応付け | [diff-disposition.md](./diff-disposition.md) | 実装済み/既存PBI/新規PBI/対象外/未解決 |
| 非公開PDF | 本リポジトリ外(Drive) | 公開面から除去済み。正本は Drive |

## 証跡

| 証拠ID | 内容 | ファイル |
|---|---|---|
| EV-DESK-1 | Biosphera desktop 2.0.4 公開部位一覧(692行) | [../2026-10-22/source/Horse-Anatomy-Catalog-692.json](../2026-10-22/source/Horse-Anatomy-Catalog-692.json) SHA-256 は [source-manifest](../2026-10-22/source-manifest.json) 参照 |
| EV-EQU-1 | Equus 現行カタログ(87項) | [../2026-10-22/source/Equus-Current-Catalog.json](../2026-10-22/source/Equus-Current-Catalog.json) |
| EV-RBW-1 | Real Bodywork 公開メタデータのみ(構造一覧なし) | [evidence/realbodywork-public-metadata.md](./evidence/realbodywork-public-metadata.md) |
| EV-XWALK | デスクトップ一覧×Equus の対照報告 | [../2026-10-24/crosswalk-report.json](../2026-10-24/crosswalk-report.json) + [nomenclature-evidence](../2026-10-24/nomenclature-evidence.md) |

非公開証跡(APK抽出物・取得手続メモ等)は公開リポジトリには置かない。入手経路は issue #185 のコメント履歴を参照。

## カウントの約束

- 名称抽出数と位置確認数は別集計。`structure-ledger.csv` の `position_status` 列が正。
- `measured` = Equus 実測座標あり(87項のうち該当分)。
- `partial_draft` = 一部 draft 座標混在。
- `未確認` = 位置根拠なし。**推測で確認済みにしない**ためこの区分を維持する。
- Biosphera mobile: オブジェクト名 1423件 → 系統内 1332件(編集用置き場除外) → 左右まとめ後 1022名。集計値であり医学的位置検証数ではない。
- Biosphera desktop: 692行・681の異表記(行数であり展開構造数ではない)。
- Real Bodywork: 構造約350(ストア記載のクイズ対象数ベース)。個別一覧は未取得。

## 参照先

- 上流の監査フレーム: [../2026-10-22/README.md](../2026-10-22/README.md) (名称審査・位置審査・証拠規則)
- 系統別差分→PBI の写像は [diff-disposition.md](./diff-disposition.md)。起票済み番号もそこに記す。
