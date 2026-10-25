# #220 既存8名称の原典検収と表示整合

[対象PBI #220](https://github.com/kouiso/equus-anatomy/issues/220) / [親 #185](https://github.com/kouiso/equus-anatomy/issues/185)。目的は既存8部位の名称とアプリ表記を整合させ、同じIDへ検索・選択できることを確認すること。構造追加・位置測定・購入アプリの内部データ取得は含めない。

実装基点は`main=5719bcb69c05792104383efe8b3c2f87a5fc2ab8`、変更前`structures.ts`のblobは`38ca75607f31a8c9050b5df53b69791f48f214fe`。canonical `kouiso/equus-anatomy` のremote・tree・対象ソースを照合した。[固定記録](baseline.json)に87 ID、層・深さ・向き、対象外79項目、geometryのハッシュを保存した。

[既存付録 c479d462](https://github.com/kouiso/equus-anatomy/blob/c479d4620ae1c97be1c380a9c7fe36e2259e941b/doc/reference-audit/2026-10-24/nomenclature-evidence.md)と[機械可読根拠](https://github.com/kouiso/equus-anatomy/blob/c479d4620ae1c97be1c380a9c7fe36e2259e941b/doc/reference-audit/2026-10-24/nomenclature-evidence.json)を再利用した。研究ブランチへは書き込まず、main基点の`fix/pbi-220-anatomical-names`で実装した。

## 8件の判定

[review.json](review.json)が各IDの判定・出典・種・単複・許容する変更欄を保持する。`supported`は既存項目が指す名称関係を、読めた一次原典の範囲で支持する意味。正式見出しに揃える編集判断と、解剖学的に別の構造へ誤同定していたという判断を区別した。付着・機能・臨床説明全体の検収ではない。

J旧 = 学会の[第6版2022旧公開PDF](https://www.jpn-ava.com/wp_new/wp-content/themes/ava_public_wp/data/glossary/navj_6th_ed.pdf)（418ページ）。ページはPDF先頭を1とする。N = [NAV第6版2017 Leipzig公開PDF](https://www.vetmed.uni-leipzig.de/fileadmin/Fakult%C3%A4t_VMF/Institut_Veterin%C3%A4r-Anatomisches/Dokumente/NAV_6th-Edition-2017.pdf)。

| App ID | 変更前の名称関係判定 | 読取根拠と支持範囲 | 編集結果 |
| --- | --- | --- | --- |
| bone-carpus | supported（骨群のJA/LA。ENと説明の範囲は要整合） | J旧 p.66 #1525/#1528、N p.37。骨群と関節を区別。前肢step18は既存付録の読取根拠を再利用 | ENをCarpal bonesへ。本文・要約・機能の主語を骨群にし、中手根骨→中間手根骨 |
| bone-sesamoid | supported（JAの限定語は不足） | J旧 p.70 #1616、N p.38。[UMN後肢](https://open.lib.umn.edu/largeanimalanatomy/chapter/pelvic-limb/) A3.1 Digit(s)、equineの句。近位・複数を保持 | JAを近位種子骨へ。EN/LAは保持 |
| bone-tarsus | supported（跗骨を別構造とは断定しない） | J旧 p.77 #1791、N p.40。UMN後肢 Tarsus → HORSE。骨群と飛節全体を区別 | JAを足根骨、ENをTarsal bonesへ。本文・機能を関節を構成する骨群へ |
| bone-metatarsus | incorrect（現JAの中趾骨という誤記） | J旧 p.79 #1823、N p.41。UMN後肢 Metatarsus → HORSE。比較用語集のI–Vをウマの骨数にしない | JAと当該本文を中足骨、ENをMetatarsal bonesへ。日英要約も骨群に整合。誤記検索は旧入力互換に限定 |
| muscle-sternocephalicus | supported（ウマの有効同義関係） | J旧 p.105 #2386–2389、N p.58。[UMN頸部](https://open.lib.umn.edu/ungulateanatomylabguide/chapter/part-1-neck/) step15 PONY。胸骨頭筋と胸骨下顎筋を別筋にしない | 表示名は胸骨下顎筋を保持。正式見出し胸骨頭筋・sternomandibularisも同じIDで検索可能にする |
| muscle-brachiocephalicus | supported（腕頭筋を別構造とは断定しない） | J旧 p.105 #2378、N p.58。UMN頸部 step10 PONY。筋全体の単数名 | JAを正式表記の上腕頭筋へ。旧名・読みでの検索は維持 |
| organ-colon | supported（ウマの大結腸/上行結腸） | J旧 p.143 #3250–3251、N p.72。[UMNウマ腹部](https://open.lib.umn.edu/ungulateanatomylabguide/chapter/part-2-equine-abdomen/) large intestine steps16–17。大腸全体へ意味を広げない | JA/EN/LA・説明を変更しない |
| organ-bladder | supported（尿路の臓器という文脈） | J旧 p.165 #3760、N p.77。UMNウマ腹部 Palpation and Visualization step9 | 既存JA/EN/LA・説明を変更しない |

変更前はsupported 7件・incorrect 1件。変更後の名称は上記の限定範囲で支持されるが、**正誤反映PDF本体の直接照合はinsufficient-evidence**として別に残す。名称が支持されたことから位置、全説明、vendor identityや#185全体を合格にしない。

## 版と取得制限

[学会配布元](https://www.jpn-ava.com/glossary/)は第6版2022と、2025-10-30正誤反映の案内を掲載している。[正誤表](https://www.jpn-ava.com/wp_new/wp-content/themes/ava_public_wp/data/glossary/navj_6th_2510_02.pdf)2ページを読み、筋注釈の付替えと本件の名称見出しを区別した。旧PDFと正誤反映版は同じファイル・ページとして扱っていない。

指定された[正誤反映PDF本体](https://www.jpn-ava.com/wp_new/wp-content/themes/ava_public_wp/data/glossary/navj_6th_2510.pdf)はweb toolで取得できず、通常execと正式exec承認経路も`Tunnel connection failed: 403 Forbidden`で失敗した。本文・バイトハッシュは未確認。プロキシ・sandbox・ネットワーク設定を変更せず、この経路は再反復していない。旧PDFは本表に記したページで独立に読めた一次資料であり、PBI記載の正誤反映版のページ（68/72/79/81/107/145/167）を旧版へ流用していない。

Nは比較家畜用語で、全項目をウマ専用として扱わない。WAVA配布版と大学ミラーのバイト同一性は未検証。UMNのPONY/HORSEとCALF/OXを区別し、オンライン教材の版番号は未確認のまま記録した。前肢canonical URLの今回再取得も403だったため、そこは既存c479d462の読取根拠を再利用したと明記している。

PDFや教材の図・写真・モデルはリポジトリへ取り込んでいない。短い用語と要約、版・ページ/節・取得成否だけを記録した。

## 実装と互換性

- 変更対象は`structures.ts`の5部位の名称と直接関係する説明、英語要約2件、読み、検索の入力互換。ID・保存済みID・構造数87・層・深さ・向き・図版・座標・選択経路は保持する。
- `中趾骨`は正式同義語へ昇格させず、旧入力互換としてだけ検索に保持する。跗骨、旧英名、旧読み・ローマ字も従来のIDへ到達する。
- 胸骨下顎筋という有効なウマの同義名は表示から削除せず、胸骨頭筋を検索別名として追加した。筋全体と部分・比較種の差を一律に畳み込む処理は追加していない。
- 筋の付着・機能・臨床・位置の既存説明全体は今回の承認範囲に入れない。画面の未監修表示も保持する。

## ブラウザ証跡と再現

900×1000、日英各8部位で、図鑑→現名・旧名・読み等の検索→該当行→同じIDの詳細→既存の選択マーカーと見出しを確認する。位置未登録の膀胱は詳細まで確認し、図上に新しい点を作らない。元の選択経路がないことを名前の不合格と混同しない。

| 条件・画面 | before（固定main） | after（今回の作業版） |
| --- | --- | --- |
| 手根骨・英語詳細 | [画像](evidence/before/en-US-bone-carpus-detail.png) | [画像](evidence/after/en-US-bone-carpus-detail.png) |
| 中足骨・日本語詳細 | [画像](evidence/before/ja-JP-bone-metatarsus-detail.png) | [画像](evidence/after/ja-JP-bone-metatarsus-detail.png) |
| 足根骨・日本語選択 | [画像](evidence/before/ja-JP-bone-tarsus-selection.png) | [画像](evidence/after/ja-JP-bone-tarsus-selection.png) |
| 上腕頭筋・日本語詳細 | [画像](evidence/before/ja-JP-muscle-brachiocephalicus-detail.png) | [画像](evidence/after/ja-JP-muscle-brachiocephalicus-detail.png) |
| 近位種子骨・日本語詳細 | [画像](evidence/before/ja-JP-bone-sesamoid-detail.png) | [画像](evidence/after/ja-JP-bone-sesamoid-detail.png) |

[before全画像と各ケースの入力・結果](evidence/before/) / [after全画像と各ケースの入力・結果](evidence/after/) / [検証記録](validation.md)。画像はこのアプリの実Chromium画面で、原典や購入アプリの画像ではない。native/3D・OS文字倍率・医学的な位置精度の合格証拠にはしない。

```bash
pnpm test scripts/pbi220-names.test.ts src/core/search.test.ts
PLAYWRIGHT_CHROMIUM=/usr/bin/chromium pnpm exec playwright test e2e/nomenclature.spec.ts --workers=2
pnpm verify
```

旧原台帳のcoverage/crosswalkはc479d462のdetached checkoutを読み、研究ブランチを書き換えず実行する。再現には次を使う。

```bash
git worktree add --detach /path/to/reference-c479 c479d4620ae1c97be1c380a9c7fe36e2259e941b
# 固定checkoutの依存を既存のlockfileで準備してから実行する
pnpm exec tsx scripts/check-pbi220-reference.ts /path/to/reference-c479
```

この検査は、元台帳を保持したまま現在版との名称差分5件を検出し、追加/削除・層/配置差分がないことを確認する。旧coverageの差分警告1件を隠さず記録し、crosswalkの字面一致増加をvendor実体対応の承認へ変換しない。

## 受入条件・残件

| #220の条件 | 対応 |
| --- | --- |
| main/blob/8 ID固定・既存付録の再利用 | baseline.json / review.json |
| 全8件の三値判定と編集判断の分離 | 上表・review.json。正誤反映PDF本体は取得不足の留保あり |
| 最小差分・ID/選択/図版/座標/構造数維持 | 回帰検査とreference-check。対象外79構造もハッシュ一致を要求 |
| 実ブラウザ導線・旧入力互換 | 日英16ケース、各入力と実ID・表示名・画像を記録。膀胱は位置未登録を保持 |
| 必要な回帰・同版の証跡 | validation.mdと実行ログ |
| #220と#185の判定へ対応 | 結果報告はこの文書で提供。#220コメントは自動承認審査で拒否され未投稿。#185・位置・全説明・獣医監修済み認定は未完了 |

正誤反映PDF本体の直接照合、残る全説明の検収、位置と原画の検収、実機/nativeは未達として残す。PBIや親Issueを自動でcloseしない。workflow・PBI #219の担当範囲は変更しない。

初回実装・検証は `5ab0e67` までの履歴。[検索互換と部位選択検証の追補](compatibility-followup/README.md)で「管骨」「後肢の管骨」の検索入力を復元し、7部位の図上選択・膀胱の位置なし表示を必須期待値にした。初回のコード/証跡manifestは上書きせず、追補の結果と区別する。
