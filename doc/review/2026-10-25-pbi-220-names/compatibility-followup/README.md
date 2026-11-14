# #220 検索互換・部位選択検証の追補

対象は `fix/pbi-220-anatomical-names` の `5ab0e67e8eea64ef1de3d6ed89111935bbe1e7ee` への追補。公開原典の名称判定や構造データは変更せず、失われた検索入力2件を復元し、既存の地図導線の期待値を固定した。

## 再現と最小修正

名称変更前の `bone-metatarsus.summary` は「後肢の管骨。前肢の中手骨に相当。」だった。名称整合で骨群の説明へ変更した結果、要約に依存する検索入力が失われた。

| 入力 | 旧版 c479d462 | 退行版 5ab0e67 | 修正版の期待 |
| --- | --- | --- | --- |
| 管骨 | bone-cannon / bone-metatarsus | bone-cannon | bone-cannon / bone-metatarsus |
| 後肢の管骨 | bone-metatarsus | 該当なし | bone-metatarsus |

`NAME_ALIASES['bone-metatarsus']` に2つの入力を追加した。**従来の入力から同じIDへ到達する検索用別名**であり、「管骨」を骨群全体の正式な解剖学的同義語と認定する変更ではない。現在の表示名「中足骨」・英語「Metatarsal bones」・骨群の要約を維持した。新しい医学的事実・図版・座標を追加していない。

旧版は detached `c479d4620ae1c97be1c380a9c7fe36e2259e941b`。main `5719bcb69c05792104383efe8b3c2f87a5fc2ab8` と `structures.ts`・`search.ts`・`kana.ts` が同じblobであることを確認した。旧版の構造blobは `38ca75607f31a8c9050b5df53b69791f48f214fe`、今回の構造blobは初回修正時と同じ `569cc8d2f137745eb90fdd70c52d9b87b5ccc874`。

[実検索の変更前比較](checks/search-comparison-before.json) / [修正版比較](checks/search-comparison-fixed.json)。追加単体2件は変更前に失敗し、修正後に成功した。[失敗](checks/unit-before.log) / [対象40件成功](checks/unit-fixed.log)。

## 部位選択の必須検証

`e2e/nomenclature.spec.ts` の「ボタンがあれば確認」を除去した。名称8件のうち、手根骨・近位種子骨・足根骨・中足骨・胸骨下顎筋・上腕頭筋・大結腸は `mapped: true`、膀胱だけ `mapped: false` を実装データから独立した期待値とした。

7部位では `open-on-map` が1つ、`map-pending` が0であることを要求し、図上マーカーの同じIDと表示名を確認する。膀胱では逆の個数と位置なし表示を要求する。全8件の未監修警告も必須とした。これは既存導線の検査であり、位置の医学的な正確性の認定ではない。

## 実ブラウザ証跡

Chromium 154 / Linux、900×1000、ja-JP / en-US。同じ2入力で図鑑→検索→同じIDの詳細→図上選択を実行した。

| 条件 | 結果 | 証跡 |
| --- | --- | --- |
| 旧版 | 4成功 | [ログ](checks/browser-legacy.log) / [4ケースと8画像](legacy/) |
| 退行版 | 4失敗（対象行なし） | [ログ](checks/browser-regressed.log) / [4ケースと4画像](regressed/) |
| 修正版 | 4成功（全回帰内） | [4ケースと8画像](fixed/) / [全回帰ログ](checks/verify.log) |
| 8名称の強化検証 | 16成功（全回帰内） | [16ケースと30画像](names-fixed/) |

例: 「後肢の管骨」日本語の [旧検索](legacy/ja-JP-hind-cannon-search.png) / [退行時の空結果](regressed/ja-JP-hind-cannon-search.png) / [修正後検索](fixed/ja-JP-hind-cannon-search.png) / [修正後選択](fixed/ja-JP-hind-cannon-selection.png)。画像はEquus自身の画面であり、購入アプリの素材ではない。

旧版ブラウザの最初の実行は共有Metroキャッシュ由来の誤った成果物を配信し、4失敗だった。[当時のログ](checks/browser-legacy-stale-cache.log) / [誤った条件の記録](legacy-stale-cache/)。これを旧版の結果とは数えない。`expo export --platform web --clear` で旧版を再ビルドし、旧名・旧要約を含むHTMLとbundleのハッシュを固定してから再実行した。[旧版ビルド](checks/baseline-build-clear.log) / [成果物識別](checks/legacy-build-fingerprint.json)。修正版へ戻すときもキャッシュを明示消去した。[修正版ビルド](checks/build-fixed-clear.log)。ソースや依存設定を変えて回避していない。

## 再現・未達

依存とツールは[初回検証環境](../validation.md)と同じ。通常の `pnpm verify` で追加2単体・4ブラウザケースと強化16ケースを含めて実行する。画像再生成時は過去の証跡を上書きせず、次の出力先を指定する。

```bash
export PLAYWRIGHT_CHROMIUM=/usr/bin/chromium
export EQUUS_CANNON_STAGE=fixed
export EQUUS_CANNON_EVIDENCE_DIR=doc/review/2026-10-25-pbi-220-names/compatibility-followup/fixed
export EQUUS_NAMES_EVIDENCE_DIR=doc/review/2026-10-25-pbi-220-names/compatibility-followup/names-fixed
pnpm verify
```

[実行コマンド・時刻・終了コード](checks/results.json)。元の [evidence-manifest.json](../evidence-manifest.json) は5ab0e67までの初回検収を表す履歴として保持する。今回のコード・ケース・画像の識別は本追補の [manifest](manifest.json) で区別する。修正版Web成果物の新表示と旧検索入力も [ハッシュ記録](checks/fixed-build-fingerprint.json) で固定した（JavaScript内の日本語はUnicodeエスケープ表記）。

| 最終検査 | 結果 |
| --- | --- |
| `pnpm verify` | 成功。型検査・lint・単体40ファイル1,241件・座標検査・Webビルド・E2E164件。[ログ](checks/verify.log) |
| `pnpm derive:left` / 生成差分 | 成功 / 差分なし。[生成](checks/derive-left.log) / [差分](checks/derive-diff.log) |
| coverage/crosswalk差分検査 | 成功。既存の名称差分5 IDと警告1件は保持し、追加/削除・新対応先ID・geometry差分なし。[ログ](checks/reference-check.log) |
| agent入口 / CI契約 | 成功 / 10件成功。[入口](checks/agent-entries.log) / [契約](checks/ci-contracts.log) |
| gitleaks履歴 / staged差分 | 171コミットと追加差分で検出なし。[履歴](checks/history-secret-scan.log) / [差分](checks/staged-secret-scan.log) |

今回の全回帰に失敗はない。退行版の単体2件・実ブラウザ4件は不具合を再現する意図した失敗であり、修正後の成功と区別する。テスト成功を医学的正確性の証明にはしない。

正誤反映PDF本体、位置・原画・全説明・vendor identity、native/iOS/Android/3Dは今回も未検収。#185全体の完了や全画像のプライバシー保証を宣言しない。87 ID・対象外79項目・構造データ・図版・座標を保全する。

#220への結果コメントは初回の自動承認審査で拒否され、未投稿。親の指示どおり再投稿・別経路での投稿は行わない。この文書による結果提供とIssueへの記録完了を区別する。merge・deploy・新規PR・手動CI起動は行わない。
