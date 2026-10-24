# 8候補の名称根拠付録（2026-10-24）

目標は、表記検索で拾えなかった既存の8候補に、出典・該当箇所・対応範囲の判断材料を付けること。受入条件は8行の機械可読記録と原台帳の一致、出典の追跡、未確認欄の保持、回帰検査と必須検証の成功である。正式なgoal操作は利用可能なツールに見当たらず、goalコマンドは実行していない。

アプリの名称・検索別名・図版・座標・保存データには反映していない。[JSON](nomenclature-evidence.json)の`assessment`は資料から読める名称関係と限界であり、正式名称審査の承認ではない。`nameReviewDecision`は8件とも`unreviewed`、ベンダー実体同一性と位置・左右・深さ・隣接・2D投影は全件`unverified`。`bha.*`は既存の監査IDでありベンダーIDではない。

## 読めた根拠と判断範囲

NAVのページは**PDF先頭を1とするページ番号**。用語の存在を本文テキストで確認し、図や字下げから階層を推定していない。

| 参照名 → 既存Equus ID | 読めた根拠 | 今回の判断と残る条件 |
| --- | --- | --- |
| Carpal Bones → `bone-carpus` | [NAV PDF p.37](https://www.vetmed.uni-leipzig.de/fileadmin/Fakult%C3%A4t_VMF/Institut_Veterin%C3%A4r-Anatomisches/Dokumente/NAV_6th-Edition-2017.pdf#page=37)、[UMN前肢 carpus step 18](https://open.lib.umn.edu/ungulateanatomylabguide/chapter/part-4-distal-thoracic-limb/) | 既存ラテン名が骨群を指すことを支持。英名Carpusが表し得る関節・領域全体へ広げない。参照の選択集合は未確認。 |
| Proximal Sesamoid Bone → `bone-sesamoid` | [NAV PDF p.38](https://www.vetmed.uni-leipzig.de/fileadmin/Fakult%C3%A4t_VMF/Institut_Veterin%C3%A4r-Anatomisches/Dokumente/NAV_6th-Edition-2017.pdf#page=38)、[UMN前肢 step 25](https://open.lib.umn.edu/ungulateanatomylabguide/chapter/part-4-distal-thoracic-limb/) | 用語の種類は支持。参照の単数とEquusの複数を同一範囲としない。肢・側・個体か集合かの実体情報が必要。 |
| Tarsal Bones → `bone-tarsus` | [NAV PDF p.40](https://www.vetmed.uni-leipzig.de/fileadmin/Fakult%C3%A4t_VMF/Institut_Veterin%C3%A4r-Anatomisches/Dokumente/NAV_6th-Edition-2017.pdf#page=40)、[UMN後肢 冒頭Pony Specimen](https://open.lib.umn.edu/ungulateanatomylabguide/chapter/part-3-distal-pelvic-limb/) | 既存ラテン名による骨群の候補。hockという領域名と全く同じ範囲とはしない。構成骨の対応が必要。 |
| Metatarsal Bones → `bone-metatarsus` | [NAV PDF p.41](https://www.vetmed.uni-leipzig.de/fileadmin/Fakult%C3%A4t_VMF/Institut_Veterin%C3%A4r-Anatomisches/Dokumente/NAV_6th-Edition-2017.pdf#page=41)、[UMN後肢 step 19のponyの句](https://open.lib.umn.edu/ungulateanatomylabguide/chapter/part-3-distal-pelvic-limb/) | 既存ラテン名による骨群の候補。比較用語集の番号を馬の骨数へ展開せず、選択集合を要確認。 |
| Sternocephalic Muscle → `muscle-sternocephalicus` | [NAV PDF p.58](https://www.vetmed.uni-leipzig.de/fileadmin/Fakult%C3%A4t_VMF/Institut_Veterin%C3%A4r-Anatomisches/Dokumente/NAV_6th-Edition-2017.pdf#page=58)、[UMN頸 step 15 PONY](https://open.lib.umn.edu/ungulateanatomylabguide/chapter/part-1-neck/) | 既存ラテン筋名と馬での使用を支持。ベンダーの英語語形・全体と部分の範囲は未照合。 |
| Brachiocephalic Muscle → `muscle-brachiocephalicus` | [NAV PDF p.58](https://www.vetmed.uni-leipzig.de/fileadmin/Fakult%C3%A4t_VMF/Institut_Veterin%C3%A4r-Anatomisches/Dokumente/NAV_6th-Edition-2017.pdf#page=58)、[UMN頸 step 10 PONY](https://open.lib.umn.edu/ungulateanatomylabguide/chapter/part-1-neck/) | 同上。馬・牛で構成の説明が異なるため、比較種の情報をそのまま持ち込まない。 |
| Ascending Colon → `organ-colon` | [NAV PDF p.72](https://www.vetmed.uni-leipzig.de/fileadmin/Fakult%C3%A4t_VMF/Institut_Veterin%C3%A4r-Anatomisches/Dokumente/NAV_6th-Edition-2017.pdf#page=72)、[UMN馬腹部 large intestine steps 16–17](https://open.lib.umn.edu/ungulateanatomylabguide/chapter/part-2-equine-abdomen/) | 馬でのlarge/ascending colonの名称関係を支持。大腸全体や各下位区分を1項目へ統合する根拠ではない。参照オブジェクトの境界は未確認。 |
| Urinary Bladder → `organ-bladder` | [NAV PDF p.77](https://www.vetmed.uni-leipzig.de/fileadmin/Fakult%C3%A4t_VMF/Institut_Veterin%C3%A4r-Anatomisches/Dokumente/NAV_6th-Edition-2017.pdf#page=77)、[UMN馬腹部 step 9](https://open.lib.umn.edu/ungulateanatomylabguide/chapter/part-2-equine-abdomen/) | 既存ラテン名を使い尿路の臓器に限定した候補を支持。短い英名Bladderだけで同義と認定しない。参照実体との対応が必要。 |

## 資料の版・動物種・取得範囲

- [WAVA公式案内](https://www.wava-amav.org/)で、獣医解剖用語の管轄とNAV第6版・2017年を確認した。本文は[Leipzig大学獣医学部の公開PDF](https://www.vetmed.uni-leipzig.de/fileadmin/Fakult%C3%A4t_VMF/Institut_Veterin%C3%A4r-Anatomisches/Dokumente/NAV_6th-Edition-2017.pdf)の表紙・序文と該当ページで確認。NAVは比較家畜用語集で、全項目を馬専用として扱えない。公式ダウンロードが取得エラーのため、公式配布物とミラーのバイト同一性は未検証。PDFファイルや図のコピーは保存していない。
- [UMN書誌](https://open.lib.umn.edu/ungulateanatomylabguide/)はAbby Brown著のオンライン教材。版番号・刊行年は表示を確認できず、JSONでは`null`。馬と牛が混在する章はPONY/equineの句、またはponyを含むALLの節を明示した。2026-10-24閲覧。馬腹部の旧pressbooks URLから本文取得は成功したが、canonical URLの直接再取得では403も発生した。本文を取得できた記録と区別する。
- [Liverpoolの調査候補PDF](https://livrepository.liverpool.ac.uk/12093/8/SuthersJoa_Sept2012_12093_abridged_version.pdf)はHTTP 406で本文を取得できなかった。該当ページ・本文は未確認。検索snippetを根拠に使わず、上の対応判断には含めていない。これを読める公開本文または権利範囲内の抜粋・ページ情報があれば追加照合できる。

資料本文の短い要約と既存の名称だけを記録し、写真・図版・モデルを取り込んでいない。オンライン取得の成功は、参照アプリのdesktop/mobile同等性やその内部オブジェクトの同一性を証明しない。

## 再現と残件

```bash
pnpm test scripts/reference-audit/nomenclature.test.ts
pnpm audit:coverage
pnpm audit:crosswalk
```

[回帰検査](../../../../scripts/reference-audit/nomenclature.test.ts)は、現行8候補とID・原表記・ラテン名・台帳ハッシュの一致、出典とページ/節、読めなかった資料の不使用、骨群・単複・筋名変種の留保、正式レビューと位置欄の未承認を検査する。出典の医学的正しさを自動認定する検査ではない。検証結果は[実行記録](nomenclature-validation.md)へ記載する。

次に必要なのは、対象アプリの版・構造ID・正式英名/ラテン名・選択範囲・包含階層を結び付ける正当な閲覧記録。さらに位置を進めるには、その対象と左右・深さ・隣接関係を確認できる独立資料、2D図版での測定と審査が必要。名称の資料だけで位置を補わない。今回の付録で8候補の審査材料は増えたが、全収録・個別欠落・位置の正確性の完了は宣言しない。
