# 部位対照の追加監査（2026-10-24）

前回の[受領台帳と監査](../2026-10-22/README.md)に、掲載単位・区分・左右・番号範囲・候補の理由を調べる監査を追加した。参照構造の実体IDや位置を新たに取得した作業ではない。アプリ表示・名称・説明・図・座標・保存データを変更せず、原本3件と既存レビューも保持する。

## 今回新しく分かったこと

| 調査結果 | 解釈・次の確認 |
| --- | --- |
| 同名11組のうち、同一区分内の反復4組・区分をまたぐ掲載7組 | 同じ構造の別ビューか、別部位かは未確定。単純に重複削除しない |
| `Ventral Intercostal Branches`は動脈区分と静脈区分に別行で掲載 | 文字列だけの統合を防ぐ衝突として検出。参照ID・区分を保持する |
| 表記681種類に対し、区分と表記を組にすると688群 | どちらも解剖学的な構造個体数ではない。検証済み総構造数は`null` |
| 左右が名前に明示された7行に、左右対の表記が3組 | `Right/Left Atrium`、`Right/Left Ventricle`、`Left/Right Tracheobronchial Ln.`の各表記。行を統合せず保持する。残りの右側のみの表記は左側の欠落を意味しない |
| 685行には左右の明示なし | 自動で左右へ展開しない。全側性の検証は未完了 |
| 数字を含む括弧付き表記11行、うち範囲表記9行 | 骨・神経の番号が含まれる。個数展開しない。同じ番号でも別分類を統合しない |
| 初期候補が0行の区分は5つ・計335行 | Hoof 7、Cartilage/Ligaments 86、Peripheral Nervous System 115、Arteries 65、Veins 62。照合先を調べる優先キューであり、335構造の欠落確定ではない |
| 表記検索の候補が出た39行の内訳は、初期名称候補31行・初期関連候補8行 | 数字が同じでも前回の名称候補39行とは別集合。文字の一致だけで同一性を承認しない |
| 前回の名称候補のうち8行は、今回の表記検索では拾えない | 用語対照や包含関係の根拠を要するキューへ分離。今回の検索から新しい対応先IDは見つかっていない |

同一区分で反復する4表記は`Intertransversarii Ventrales Cervicis`、`Superficial Digital Flexor M.`、`Deep Digital Flexor M.`、`Collateral Sesamoidean Ligament`。元一覧には各行のview・対象肢・ベンダー構造IDがなく、これを前後肢や別表示と断定していない。

区分をまたぐ7表記は`Hypophysis`、`Pineal Gland`、`Liver`、`Pancreas`、`Ventral Intercostal Branches`、`Testis`、`Ovary`。解剖学的な同一性は表記だけでは確定しない。全ての掲載行と出典順を保持する。

表記検索では拾えない初期名称候補8行:

| 参照一覧の表記 | 既存Equus ID | 既存英名 |
| --- | --- | --- |
| Carpal Bones | `bone-carpus` | Carpus (knee) |
| Proximal Sesamoid Bone | `bone-sesamoid` | Proximal sesamoid bones |
| Tarsal Bones | `bone-tarsus` | Tarsus (hock) |
| Metatarsal Bones | `bone-metatarsus` | Metatarsus |
| Sternocephalic Muscle | `muscle-sternocephalicus` | Sternocephalicus |
| Brachiocephalic Muscle | `muscle-brachiocephalicus` | Brachiocephalicus |
| Ascending Colon | `organ-colon` | Large colon |
| Urinary Bladder | `organ-bladder` | Bladder |

この表は原台帳の候補を再掲した審査キューであり、同義語の承認表ではない。例えば`Eye`は文字列が一致しても、参照のCentral Nervous SystemとEquusの外貌項目`skin-eye`の関係を確定できない。初期の「関連のみ」を維持する。

## 成果物と実行方法

- [crosswalk-report.json](crosswalk-report.json): 全692行の表記検索候補・照合ルール・元の対応先・審査状態、同名反復、左右対、番号表記、区分別キュー、包含方向未確認の18対応群。
- [relationship-reviews.json](relationship-reviews.json): 同一構造・別構造・別表示の審査と、個別カタログ項目の不足審査。実際の審査は両方とも0件。
- [検証記録](validation.md): 今回の実行環境・検証ログ・未実施範囲。

```bash
pnpm audit:crosswalk                 # 原本監査を通してから、読取のみで追加監査
pnpm audit:crosswalk --write-report  # 上記JSONを再生成
pnpm test scripts/reference-audit/crosswalk.test.ts scripts/reference-audit/audit.test.ts
```

表記索引はNFKC・大小文字・句読点・空白を揃える。筋肉区分の限定された検索では`Muscle` / `M.`や既存ラテン名の接頭辞を省く仮説も作る。既存括弧注釈の除外と複数語の包含も検索理由に記録する。単語の語幹・単複・翻訳・医学的同義語は自動生成しない。これらの検索結果を承認済み名称やアプリの検索別名へ自動追加しない。

## 根拠が得られた後の審査

`identity`の各記録には2つ以上の参照行ID、判断（`same_structure` / `different_structures` / `duplicate_view`）、確認者・日付、`reference_identity`と`independent_anatomy`の出典・具体的な該当箇所を要求する。左右が明示された行を同一個体へ統合する判断と、直接・推移的に矛盾する判断は監査エラーになる。原表記だけからは個体数を確定せず、手動審査記録も別欄に保持する。

`missingEntries`は「個別カタログ項目」の不足だけを扱う。既存名称レビューで根拠付きの`no_correspondence_after_review`、現行87項目の台帳ハッシュ、同義語・包含を調べた理由、確認者・日付、参照実体の同一性と独立解剖資料の根拠が必要。台帳が変わったら審査は再確認を要求する。図上に存在しないことや、612行の対応未特定を「不足確定」に変換しない。

審査の形式検査は出典自体の信頼性を自動認定しない。必要な根拠がない現在は、不足確定の記録0件であり「不足がない」という意味ではない。名称・包含の判断、構造個体数、位置・左右・深さ・隣接・2D投影の正確性はそれぞれ別の審査である。

## 次に必要な参照情報

1. 同名反復11組について、参照アプリの対象版と、各掲載行に対応する実体構造ID・親階層・左右・対象肢・表示方向。現在の`bha.*`は調査用IDで、ベンダー構造IDではない。これがないため別ビューか別構造かを判定できない。
2. 上表8候補と包含方向未確認の18群について、正式名・英名・ラテン名と包含範囲を結ぶ独立した獣医解剖資料の版・ページ等。単語の似方だけで対応を承認しない。
3. 5区分335行から調べる対象について、参照構造の定義・構成要素と、Equusの一括名に含まれるかを審査できる資料。名前が87項目に無いことだけでは個別不足を確定しない。
4. Androidでの対象版・ビルド番号、公式の構造メタデータまたは権利範囲内の本人閲覧記録。desktop公開一覧との同等性は未確認。今回、アプリ取得・購入・保護回避・参照画像やモデルのコピーは行わない。
5. 位置を進める際は、正当な参照閲覧に基づく左右・深さ・隣接関係の記録、独立資料、対象の2D図版と測定・審査が必要。今回も全位置未確認で、推測座標は生成していない。
