STATE RUNNING 2026-11-15T05:04Z | 再開（personal）。開き PR: #316 #320（＋notes #281・handoff #318 は数えない）
mission: 「それぞれのプロジェクトに書いてあるプランに書いてある作業をやること」／「どのプロジェクトもまず既存のPRを本質的に対処することを作業を優先してください。そうしないと溜まってばっかりなので」
model fable 5.2 (lead。持ち主の指示 2026-11-15「Opus使ってるところはfableチケット使いたいからfableに変えて。」: 実装・レビューも fable、機械は Sonnet、同時に生きている担当は 1 人まで) | advisor absent | github via connector（mcp github。gh は token 無効） | push via git | png ok
goal: 第2版の決まりと夜の指示で、この周回が DONE か DONE-WAITING になるまで（または PAUSE まで） | DONE-WAITING satisfies it: yes
repo rules: AGENTS.md（main へ直接 push しない・座標の source・コメントは日本語・UI の前後の画像）、.github/scrum-board.yml（project 20。ボードは REST で読めない）、writing-format-check（## 概要/## 変更内容/## 関連Issue と Closes/Refs/No-Close）。きつい方: UI の前後の画像を PR に貼る
DEPLOY | merge to develop -> nothing | evidence .github/workflows/ci.yml:3-4（push は branches [main] だけ。r2-ci・r2-flutter-build・secret-scan も main だけ）、ci.yml:80（Pages は wrangler の direct-upload の project なので、git 連携の配備は無い）
DEPLOY | merge to main -> production | evidence .github/workflows/ci.yml:48-87（main への push で pages deploy --branch=main。main は本番の枝）。レーンは main へ取り込まない
DEPLOY | PR head -> staging（枝ごとのプレビュー） | evidence ci.yml:53,87
---


ミッション（持ち主の言葉）: 「どのプロジェクトもまず既存のPRを本質的に対処することを作業を優先してください。そうしないと溜まってばっかりなので」

## 持ち場の宣言（統括の決まり 2026-11-14: PR 1本につき持ち主1つ）

- **クラウドのセッション（このセッション）**: リポジトリの作業すべて（ブランチ・push・PR のレビュー・取り込み・issue の更新）。Mac の `status.tsv` は読めないので、宣言と記録はこのファイルに書く
- **Mac のセッション**: Mac が要る作業だけ（ネイティブの build・シミュレータ／エミュレータ・実機の確かめ・その証拠の画像や動画）。PR には push・取り込みをしない。結果は `status.tsv` の notes に PR 番号つきで書く（クラウドは統括経由で受け取る）
- 持ち主の決まり（2026-11-14、統括経由）: Mac mini でエミュレータ・シミュレータを使わない。実機（Mac に繋いだ iPhone 2台、Android は実機の電話）で確かめ、先に消音して記録する。このファイルの DEVICE の行（#263・#267・#271・#275、#12・#46、#256・#257 の実機の項目）はすべて実機の行
- 今クラウドが持っている作業（2026-11-14T10:00Z）: `fix/catalog-search-overflow`（図鑑の検索欄のはみ出し）、`fix/catalog-review-followups`（レビューの should の続き）、`docs/254-solid-audit`（#254 の監査の報告）。実機の確かめは **develop 5a191ea** を build すればよい

## 2026-11-14T11:39Z

- **#298 を develop へ squash で取り込んだ: f051c61。** develop の先頭は f051c61。
  - 中身: overlay の一覧から選んでも、図の無い深さが状態に入らないようにした。#296・#297 のレビューの続きも入っている。
  - 非作者レビューは head b7f406b で approve。
  - CI の verify は起動しなかった（#296 と同じ）。代わりにレビュー役が手元で回した。e2e は 266 件が合格、単体は 1347 件が合格。直す前の overlay に戻すと、新しい2件が落ちた。これらを PR に記録した。
- **決めたこと（統括の決まり (4)）:**
  - overlay の一覧は、補正前の depth で絞ったままにする。
    - 理由: 手で打った URL からしか届かない。深層の筋に「図で見る」から届く道を残せる。
    - 戻し方: overlay.tsx:68 を `effectiveDepth` にする。
- **#254 の続き（R2〜R5）を始めた:**
  - R2: `'muscle'` の直書きを core へ寄せる。作業役が担当。
  - R5: 保存・覚えたのボタンの組を1つの部品にする。作業役が担当。
  - R3・R4 は index.tsx・overlay.tsx が R2 とぶつかるので、R2 を取り込んだ後に始める。
- **OWNER の行に足す:** 390px の解剖画面では、部位のパネルの高さが 60px しかない。そのため「位置が未登録」の案内は、パネルの中をスクロールしないと見えない。
  - 推奨: 今のまま（スクロールすれば見える）。直すなら、パネルの高さの決め方（R4）と一緒に、デザインを決めてから直す。

## 2026-11-14T11:22Z（取り込み 5 件）

件数（2026-11-14T11:22Z 時点）:
- 開いている PR は1つで、#281（この記録）だけ。
- 開いている issue は 34。
- develop の先頭は **e18f4df**。

| PR | 中身 | develop の sha | レビュー（見た head） | 確かめ |
|---|---|---|---|---|
| #294 | 図鑑の検索欄が 320px・文字200% ではみ出す（V02 の T07） | dbd73e7 | approve（d17844e） | CI verify・deploy 成功 |
| #295 | レビューの should の続き（小図の読み上げ名・絞り込みの aria・docs） | f8aaf89 | approve（a664d85） | CI verify・deploy 成功 |
| #293 | #254 の最初の子: SOLID の監査の報告（12 件、R1〜R5） | dc82e25 | 4回目で approve（5c194e2） | CI verify・deploy 成功 |
| #297 | V02 を既定の e2e に入れた・下書きの位置を読み上げ名に入れた | a4a6a12 | approve（83f71c7） | CI verify・deploy 成功。手元の e2e は 262 件が合格 |
| #296 | 直接の URL で深層の筋を開くと図が出なかった（F12・R1） | e18f4df | approve（1928388） | CI が起動しなかったので手元で確かめた。単体 1341・e2e 225 が合格（PR に記録した） |

決めたこと:
- **#296 の直し方は (a)**: プロダクトの判断役（Fable）が決めた。
  - 理由: 図を描けない部位は6つある。(b) にすると、膀胱・盲腸の着地まで変わってしまう。
  - 戻し方: `focusAnatomyPart` の `fallbackDepth` の1行を戻す。
- **#296 の CI が起動しなかった件**: 空の commit を足して CI を回し直すことはしなかった（決まりで禁止）。統括の決まり (2) にある「手元で回した結果を PR に記録する」を使った。

進めている事:
- `fix/review-followups-3` を作業役が進めている。中身は次の3つ。
  - overlay の parts の経路でも、補正前の depth が残らないようにする。
  - #296 の案内が画面に見えることを確かめ、古いコメントを直す。
  - #297 の docs の文言を直す。
- develop の e18f4df で、全部の検査を回している（#296 と #297 を重ねた状態を確かめるため）。

ops への依頼（更新）: 実機の確かめは、develop の **e18f4df** を build して行う。対象は前と同じ DEVICE の行。

## 2026-11-14T10:05Z

- **#294（図鑑の検索欄が 320px・文字200% ではみ出す、V02 の T07）**
  - develop へ squash で取り込んだ: dbd73e7。
  - 非作者レビューは approve: https://github.com/kouiso/equus-anatomy/pull/294#issuecomment-6875587762
  - verify・deploy（プレビュー）は成功。
  - これで develop の先頭は dbd73e7。
- **#295（レビューの should の続き）を開いた**
  - head a664d85。非作者レビューの途中。
- **#293（#254 の SOLID の監査の報告）**
  - 2回目のレビューは changes-requested: https://github.com/kouiso/equus-anatomy/pull/293#issuecomment-6875607943
  - 作者が直して head fc4abfe にした。3回目のレビューの途中。
- **新しい不具合（F12・コードを追って確かめた。画面は未確認）**
  - 直接の URL `/?part=<深層の筋の id>` で開くと、深層の板が無いのに depth が deep になる。そのため図が出ず、札は「深層」、チップは「表層」と食い違う。
  - #293 を取り込んだ後に、直し方をプロダクトの判断に回してから直す。
- **ops への依頼（Mac の運用係）**
  - 実機の確かめは develop の **dbd73e7** を build して行う。対象は DEVICE の行（#263・#267・#271・#275・#12・#46・#256・#257・#255・#258 の実機の項目）。
  - 結果は status.tsv の notes に PR／issue 番号つきで書く。

## 2026-11-14T09:50Z（RESUME 後）

件数（前 → 後）: 開いている PR 12 → 1（#281 の記録だけ）、開いている issue 50 → 34。取り込み 11、閉じた issue 16。

**develop（ステージング）への取り込み**（すべて非作者レビュー済み・CI の verify 成功の head で取り込み。main へは入れていない）:
| PR | 方法 | develop の sha | レビュー |
|---|---|---|---|
| #289 develop を main にそろえる | merge | d12dcd9 | 2回目 approve https://github.com/kouiso/equus-anatomy/pull/289#issuecomment-6875436312 |
| #283（#277） | merge | 1657981 | approve |
| #282（#279） | squash | fea303b | approve |
| #284（#280・#276） | merge | 42369e3 | approve |
| #285（#264・#265） | merge | 00d0ca2 | approve |
| #288（#260・#261） | squash | 25432fd | approve（2回目） |
| #286（#268・#269） | squash | 2a67b0e | approve |
| #291（#272・#273） | squash | 9f5d020 | approve https://github.com/kouiso/equus-anatomy/pull/291#issuecomment-6875452689 |
| #290 advisor 設定 | squash | a9697c0 | approve |
| #292 ci の deploy ガード | squash | 486461a | approve |
| #287 V01・V02 | squash | 5a191ea | approve |

develop の先頭は 5a191ea。Mac のセッションの実機の確かめは **develop の 5a191ea** を build すればよい（#283〜#288・#291 をすべて含む）。

**閉じた issue（16、develop の sha を書いて completed で閉じた）**: #277・#279・#280・#276・#264・#265・#266・#268・#269・#270・#260・#261・#262・#272・#273・#274

**進めている作業**:
- develop の先頭での全検査（type-check・lint・単体・座標・e2e）
- 続きの PR（レビューの should: 小図の読み上げ名・Svg の名前・e2e の強化・絞り込みの読み上げの区切りと開閉状態・eslint-disable の除去・V02 の S09・stg-distribution.md の develop の記述・AGENTS.md の e2e/tools の説明）
- 図鑑の検索欄が 320px・文字200% ではみ出す不具合の修正（V02 の T07）
- #254 の最初の子（SOLID の監査の報告。コードは変えない）

## 引き継ぎ（2026-11-14T07:33Z、予算のための一時停止。この節だけで続けられるように書く）

### 持ち主の決定（2026-11-14、統括経由）
- 取り込み（マージ）は **develop（ステージング）まで**。main へは入れない（main へのマージは本番の Web ページを公開する）。レビューが通った PR は聞かずに develop へ取り込んでよい
- 初回のゴール: Web 版は要らない。逆解析した時の部位を iOS・Android で正しく表示し、LINE で来ていた要望を反映する。加えて issue と PR の本質的な解消
- 台帳（購入した参考アプリの部位名を持つ物）: Drive へ移して中身を確かめ、公開のブランチを消す（下の「台帳」）
- advisor: Opus の主ループは fable、Sonnet・Haiku の作業者は Opus（作業者には「助言が要る時はリードに上げる」と書く）

### 取り込みの状況（Mac のセッション向け。#283〜#288 は1本も取り込んでいない）

develop は main より 113 コミット遅れていたので、先に #289 で develop を main と同じ中身にそろえる。#289 が取り込まれるまで、ほかの PR は develop へ入れられない。

| PR | 取り込み | head（実機で build するならこの sha） | 非作者レビュー | checks（verify） | 足りないもの |
|---|---|---|---|---|---|
| #289 develop を main にそろえる | していない | 9ef1462 | must-fix 1件 → 文書で対応（stg 配布を develop だけに絞るガードは main が #240 で意図して外した。本文に記載）。**対応後の再レビューが未** | 成功 | 再レビュー（must の対応の確認）→ merge コミットで develop へ |
| #283（#277） | していない | 48e79aa | Opus approve | 成功 | #289 の取り込み → base を develop に替える → merge コミット（#288 が上に重なる） |
| #282（#279） | していない | f79d989 | Opus approve | 成功 | #289 → base を develop に → squash |
| #284（#280・#276） | していない | e5a8c59 | Opus approve | 成功 | #289 → base を develop に → merge コミット（#285 が上） |
| #285（#264・#265） | していない | 4c56caa（#284 を含む） | Opus approve | 成功 | #284 の取り込み → base を develop に → merge コミット（#286 が上） |
| #286（#268・#269） | していない | 0130cf7（#284・#285 を含む） | Opus approve | 成功 | #285 の取り込み → base を develop に → squash |
| #287（V01・V02） | していない | ed6cf35 | Opus approve（should 3 を ed6cf35 で対応） | 成功 | #289 → base を develop に → squash。CodeRabbit の nit（S09 で一覧が減る事を見る）は次に触る時に足す |
| #288（#260・#261） | していない | a44ff92（#283 を含む） | Opus 2回目でコード approve、本文は直した | 成功 | #283 の取り込み → base を develop に → squash |
| #290 advisor 設定 | していない | 8147861 | **未**（レビューを予算のため止めた） | 実行中（07:32Z） | 非作者レビュー → #289 の後に base を develop に |
| #291（#272・#273） | していない | ae9fecf | **未**（同上） | 実行中 | 非作者レビュー（デザインとの比較 #274 を含む） → base を develop に |
| #292 ci の deploy ガード | していない | 37454c2 | **未**（同上） | 実行中 | 非作者レビュー → base を develop に |

実機の確かめに使う sha（どれも PR のブランチの先頭。取り込み前でもこのコードで確かめられる）:
- 図鑑（#256・#257・#267・#271）: **0130cf7**（#284・#285・#286 を含む）
- 解剖画面のチップ（#263）: **a44ff92**（#283・#288 を含む）
- 図鑑の詳細の小図（#275）: **ae9fecf**

### 次の10行（この順）
1. #289 の再レビュー（Opus、新しいサブエージェント。must の対応＝main の c4cd6c5 の意図を確かめる）。通れば merge コミットで develop へ取り込む
2. #283 の base を develop に替え、merge コミットで取り込む。続けて #282（squash）、#284（merge コミット）
3. #285 の base を develop に → merge コミット。#286 の base を develop に → squash。#288 の base を develop に → squash。#287 の base を develop に → squash
4. #290・#291・#292 の非作者レビュー（#291 はデザインとの比較も）。通れば base を develop に替えて取り込む
5. 取り込んだ PR が閉じる issue は、既定のブランチではないので自動では閉じない。各 issue に develop の sha を書いたコメントを残し、「develop が main に上がる時に閉じる」として記録に並べる
6. 台帳の Drive への移動（下）。Mac のセッションか持ち主に渡す
7. LINE で来ていた要望: リポジトリには無い。要望の文面が要る（OWNER）
8. 「逆解析した時の部位を iOS・Android で正しく表示」: 部位データの追加は台帳を基にしている（#185・#210〜#217）。台帳を非公開に移す決定と、データの追加をどう進めるかを持ち主・統括に確かめる（下の OWNER）
9. #253 の子1（Web の書き出しの棚卸し）は、「Web 版は要らない」に従って始めない
10. stg の配布を develop からだけに絞るか（#289 のレビュー指摘）を OWNER に置いたまま

### 台帳（持ち主の決定 b: Drive へ移し、公開のブランチを消す）— 止まっている
- 場所: ブランチ `feat/reference-coverage-audit-20261022`（先頭 e612216）だけ。main には無い。タグは無く、フォークは 0。PR の参照（refs/pull/165・177・180・209）はどれも台帳を足したコミット（9bc2941）より前を指していて、台帳を含まない
- 中身（ファイル名だけで確かめた）: `doc/reference-audit/` の 90 ファイル（2026-10-22・10-24・10-25-issue185 の日付ごと、png を含む）と `doc/plan/2026-10-22-reference-parts-scope.md`、`scripts/reference-audit/`
- クラウドで作った控え（このコンテナの中だけ、消える）: ブランチの git bundle（11.3MB、sha256 5cda4a7c…）と、ファイルの tar.gz（10.6MB、sha256 4761b18d…）
- 止まった理由: Drive へのアップロードはここからだと 10MB まで。分けて送る手順はクラウドの安全確認で断られた。なので **ブランチは消していない**
- 引き継ぎ: Mac のセッションか持ち主が、`git clone` → `git bundle create` で控えを取り、Drive に上げ、Drive 側の md5・大きさを手元と照合してから、`git push origin --delete feat/reference-coverage-audit-20261022` で消す。消した後も GitHub の古い参照の写しが残る可能性は消せない（未確認）

### OWNER（持ち主の一言・人の手が要る物）
1. LINE で来ていた要望の文面（初回ゴールの一部。リポジトリに無い）
2. 台帳の Drive への移動と、ブランチの削除（上。クラウドからはできなかった）
3. 部位データの追加（#210〜#217 など）は台帳を基にしている。台帳を非公開にする決定の後、どう進めるか
4. stg の配布を develop からだけに戻すか（main は #240 で「どのブランチからでも」に変えた。おすすめ: 今のまま）
5. #250（オーナーの手元の未 push のブランチを3つの draft PR にしてよいか）、#278（書き方チェックの決まり。kouiso/.github と共有）
6. develop を main に上げる（本番公開）の時期

### DEVICE（Mac のセッション）
- #12・#46（iPhone 実機・FAD 配布）、#263（解剖画面のチップ、a44ff92）、#267・#271（図鑑、0130cf7）、#275（小図、ae9fecf）、#256・#257 の実機の項目

### この時点の件数
開いている PR 12 本（#281 の記録を含む）、開いている issue 50 件。取り込み 0、閉じた物 0（取り込みは develop まで、#289 が先）。


ミッション（持ち主の言葉）: 「どのプロジェクトもまず既存のPRを本質的に対処することを作業を優先してください。そうしないと溜まってばっかりなので」

equus-anatomy [cloud]

# クラウド作業の記録（equus-anatomy）

新しい順。時刻は UTC。後を継ぐ人は「次にやること」から始める。


## 2026-11-14T07:08Z（棚卸し・レビュー・プロダクト判断）

件数（前 → 後）: 開いている PR 7 → 7（取り込み 0。本番公開の一言待ち）、開いている issue 50 → 50。

**PR のレビュー（Opus・medium の非作者レビュー、PR に記録済み）**: 6本とも approve。must 0。
| PR | head | 判定 | 記録 |
|---|---|---|---|
| #283 | 48e79aa | approve・0 件 | https://github.com/kouiso/equus-anatomy/pull/283#issuecomment-6873477103 |
| #282 | f79d989 | approve・nit 2 | https://github.com/kouiso/equus-anatomy/pull/282#issuecomment-6873477771 |
| #284 | e5a8c59 | approve・0 件 | https://github.com/kouiso/equus-anatomy/pull/284#issuecomment-6873474224 |
| #285 | 4c56caa | approve・nit 3 | https://github.com/kouiso/equus-anatomy/pull/285#issuecomment-6873475375 |
| #286 | 0130cf7 | approve・nit 1 | https://github.com/kouiso/equus-anatomy/pull/286#issuecomment-6873479908 |
| #287 | 77c2541 → ed6cf35 | approve・should 3 を ed6cf35 で対応 | https://github.com/kouiso/equus-anatomy/pull/287#issuecomment-6873488532 |

**プロダクト判断（Fable・high、パケット1）**:
1. 図鑑の2段の行（#256・#285）: 縦積みの時だけ（今の実装のまま）。広い画面の見た目は #284 のマージ後に 1440px で確かめる
2. #255: 点1 下パネルは今の実装を正とし、handoff の守るべきこと 9 を「選択・解除・層の切替で図の枠が変わらない」という不変条件に書き直す。点2 「表示条件」の別画面は当面残す（実機の確かめが通ったら削除の issue を起こす。「この条件で表示」の見た目は #255 では変えない）。点3 常に出すチップ。点4 0 件（別画面が残るので入口は減らない）。#260・#261 → #262 に着手してよい（#283 のブランチの上に重ねる）
3. #258: 足す。part-sheet には足さない。#272〜#274 は main から着手してよい。#275 は実機
4. #250: OWNER（オーナーの手元にしか無い未 push のブランチ `codex/external-input-review-20261101` を、提案の3つに分けて draft PR にしてよいか）。#253: 提案どおり分け、子1（Web の書き出しの棚卸しを CI の試験にする）は #260・#261 の後に着手してよい。#254: 親のまま。2つの積み重ねと #255 の子がマージされてから監査を始める
5. #278: OWNER（kouiso/.github と共有の書き方の決まりなので、このアプリのプロダクト判断ではない）。おすすめ: テンプレートごとに書き方チェックの必須欄を変える（このリポジトリだけ）

**開いている issue 50 件の振り分け**:
| 振り分け | issue | 足りないもの |
|---|---|---|
| 作業する（このあと） | #255（子 #260・#261・#262）、#258（子 #272・#273・#274）、#253 の子1 | - |
| マージで閉じる（OWNER: 本番公開の一言） | #264・#265・#266・#268・#269・#270・#276・#277・#279・#280 | #282〜#286 のマージ。#266・#270（撮ってデザインと並べる）は #285・#286 のレビューで済んでいる |
| マージと実機の両方 | #256（子 #267）、#257（子 #271） | マージと、iPhone・Android の実機での確かめ |
| DEVICE（実機・端末） | #12（iPhone 実機）、#46（iOS 実機テスターの端末登録と FAD 配布）、#263・#267・#271・#275（各 PBI の実機の確かめ） | iPhone・Android の実機と、テスター配布 |
| OWNER（人・外部の作業） | #2（下書き座標の境界の確定）、#4（内臓の絵の差し替え）、#5（腱・靱帯・関節・蹄の内部）、#50（深層筋の図の調達）、#51（下書き座標の昇格の手順を回す）、#13（獣医の監修）、#173・#175（独立した原画での測定）、#210〜#217（部位データの追加：骨・神経・血管・リンパ・呼吸消化器・泌尿生殖器・歯・感覚器） | 絵・座標の計測・獣医の監修など、人の作業（どれも `blocked-external` のラベル）。部位データの行は指示で対象外 |
| OWNER（判断・権限） | #48（Firebase の再認証）、#55（ストア提出）、#240（stg の配布）、#185（購入した参考アプリの解析の資料）、#250、#254、#278 | #48 はログインの手、#55・#240 は配布・提出で指示の対象外、#185 は台帳の判断で指示の対象外、#250・#278 は上の判断、#254 は2つの積み重ねのマージ |


## 2026-11-14T06:58Z（RESUME。新しい組織のルールで再開）

統括セッションから RESUME と新しいルール（取り込みの委任・役割分担）が届いた。このセッションはリードとして動く。

**取り込み（マージ）は、このリポジトリではできない。** main へのマージは、CI（`.github/workflows/ci.yml`）の deploy ジョブで本番の Web ページを公開する。直近の main への push（0fa39e2、2026-11-12）でも deploy と本番の確認（smoke check）が成功している（Actions の run 43214055229）。新しいルールの S6 は本番の公開を取り込みの対象から外し、5 節の「緩めない決まり」にも本番の公開の禁止がある。なので、マージ待ちの PR はすべて OWNER に置く。

- **OWNER（1件にまとめた）**: #283・#282・#284・#285・#286・#287 のマージ。足りないもの: 「このリポジトリで、マージによって本番の Web ページを公開してよい」という持ち主の一言（または「merge #N」）。それがあれば、S6 のほかの条件（非作者のレビュー・CI の緑）を満たした PR から順に入れる

これから: 6本の PR の非作者レビューを、新しいルールどおり Opus（medium）でやり直して PR に書く。開いている issue を全部棚卸しし、プロダクトの判断が要る物は Fable（high）にまとめて渡す。新しい PR を作る作業は、取り込みが止まっている間は後回しにする。


## 2026-11-14T04:54Z（一時停止。指示の範囲でここでできる事は終わっている）

予算の都合の一時停止の指示（goal を外したうえでの PAUSE）を受けて止めた。やりかけは無く、全部 push 済み。#287 の verify だけ、止めた時点で実行中だった（04:54Z）。再開した時に緑か確かめる。予定やループは残していない（#287 の CI を待つ見張りは止めた）。サブエージェントも動いていない。

分類の件数: a（マージ可）7 / b（ここで直せる）0 / c（端末・オーナー判断が要る）4（#255・#258 は着手前にオーナー判断、#256・#257 は実機の項目）/ d（不要・置き換え済み）1

| 番号 | 分類 | 済み | head SHA | checks | レビュー | マージ済み、または足りないもの |
|---|---|---|---|---|---|---|
| PR #283（#277） | a | 実装・独立レビュー2回 approve | 48e79aa | verify・Writing Format 成功 | https://github.com/kouiso/equus-anatomy/pull/283#issuecomment-6871396517 | オーナーの「merge #283」 |
| PR #282（#279） | a | 実装・独立レビュー3回 approve | f79d989 | verify・Writing Format 成功 | https://github.com/kouiso/equus-anatomy/pull/282#issuecomment-6871502298 | オーナーの「merge #282」 |
| PR #284（#280・#276） | a | 実装・独立レビュー2回 approve | e5a8c59 | verify・Writing Format 成功 | https://github.com/kouiso/equus-anatomy/pull/284#issuecomment-6871503291 | オーナーの「merge #284」 |
| PR #285（#264・#265、Refs #256） | a | 実装・独立レビュー2回 approve（デザインとの目視比較を含む） | 4c56caa | verify・Writing Format 成功 | https://github.com/kouiso/equus-anatomy/pull/285#issuecomment-6871782794 | #284 のマージ後に base を main へ替える → 「merge #285」 |
| PR #286（#268・#269、Refs #257） | a | 実装・独立レビュー2回 approve（デザインとの目視比較を含む） | 0130cf7 | verify・Writing Format 成功 | https://github.com/kouiso/equus-anatomy/pull/286#issuecomment-6871890461 | #285 のマージ後に base を main へ替える → 「merge #286」（squash がおすすめ） |
| PR #287（V01・V02） | a（verify 実行中） | 観点表 34 行と headless 実行（33 行合格・T07 だけ不合格（main からある不具合）・1行1枚）・独立レビュー2回目 approve | 77c2541 | Writing Format 成功、verify は 04:54Z 時点で実行中 | https://github.com/kouiso/equus-anatomy/pull/287#issuecomment-6872007125 | オーナーの「merge #287」（#285・#286 の後がおすすめ） |
| #258（子 #272・#273） | c | 着手していない | - | - | - | オーナーの判断（質問 4） |
| #255（子 #260・#261） | c | 着手していない | - | - | - | オーナーの判断（質問 3） |
| #256・#257 の実機の項目 | c | - | - | - | - | 実機での確かめ（下の表） |
| #250・#253・#254 | - | 分け方の提案を下に書いた（起票はしない） | - | - | - | - |
| PR #281 | - | この記録の PR（draft） | - | - | - | マージ不要 |
| #259 | d | 作業前にマージ済み（2026-11-12T12:00:42Z） | - | - | - | 手を付けていない |
| S01 | - | 済み | 0fa39e2（main） | 下の表 | - | - |

画面の撮影（390px・1440px・320px で文字 200%）: 図鑑は #285 に4枚（390・層を開いた所・320 文字200%・1440）、#286 に3枚（390 の札・「まだ」）、V02（#287）に34枚（1440 は S12・T09、320 文字200% は T07）。デザインとの目視比較は #285・#286 とも実装していない別のサブエージェントが行った。自動の画像差分は回していない。解剖画面（#255）と詳細（#258）は、オーナーの判断待ちで実装していないので撮っていない。

### 再開する時にやること（上から）

0. #287 の verify が緑か確かめる。落ちていたらログを読んで直す
1. オーナーが「merge #N」と打ったら、その PR をマージする前に、マージすると本番の Web ページが公開される事を1行で確かめる
2. マージが進んだら、すぐ下の PR の base を main に替える（#284 → #285 → #286）
3. オーナーの判断（質問 3・4）が出たら、#255 → #258 の順に実装する。#255 は #283 の上に、#258 は #286 の上に重ねる
4. 起票の提案（検索欄のはみ出し）が起票されたら直す。直すと V02 の T07 が合格になる

### 積み重ね（マージの順）

main ← #284 ← #285 ← #286。#283・#282・#287 は main に直接。おすすめの順: #283 → #282 → #284 → （#285 の base を main に）#285 → （#286 の base を main に）#286 → #287。#287 の観点表の一部は #285・#286 が入ってから通る。

### S01（main 0fa39e2、Node 22.23.4・pnpm 10.33.0）

| コマンド | 終了コード | 落ちた試験 |
|---|---|---|
| `pnpm install --frozen-lockfile` | 0 | - |
| `pnpm lint` | 0 | - |
| `pnpm type-check` | 0 | - |
| `pnpm test` | 0 | なし（46 ファイル・1303 件通過） |
| `pnpm build` | 0 | - |
| `node scripts/check-agent-entrypoints.mjs` | 0 | - |
| `node --test .github/ci/run.test.mjs` | 0 | - |
| `pnpm validate:coords` | 0 | - |
| `pnpm derive:left` の後に `left.json` の差分を見る | 0（差分なし） | - |
| `pnpm e2e`（ローカル Chromium） | 0 | なし（181 件通過） |

作業を始めた時点（2026-11-14T03:48Z）で、開いている PR は 0 件だった。

## waiting on owner / needs device

| 項目 | 足りないもの | おすすめ |
|---|---|---|
| PR #283 | オーナーが「merge #283」と打つこと（main へのマージは本番の Web ページを公開する） | マージする。最初に入れる |
| PR #282 | オーナーが「merge #282」と打つこと | マージする。#283 の次 |
| PR #284 | オーナーが「merge #284」と打つこと | マージする。#285 より先 |
| PR #285 | #284 のマージ後に base を main へ替えること（AI がやる）、その後オーナーの「merge #285」 | マージする |
| PR #286 | #285 のマージ後に base を main へ替えること（AI がやる）、その後オーナーの「merge #286」 | squash でマージする（最初のコミットの件名が `wip(` のため） |
| PR #287 | オーナーの「merge #287」 | マージする。#285・#286 の後 |
| #255 の実装 | 「オーナーへの質問」3 の答え | 下のおすすめどおりに進める |
| #258 の実装 | 「オーナーへの質問」4 の答え | 進める |
| #256 の実機の項目 | iPhone・Android の実機で、絞り込みの開閉・行の押しやすさ・Android の戻るボタンで閉じる事・閉じた後の読み上げのフォーカスを確かめること | 次に実機で触る時にまとめて確かめる。それまで #256 は開けたまま |
| #257 の実機の項目 | 実機で「覚えた」を付けて図鑑へ戻った時に、札と「まだ」に反映される事を確かめること | 同上 |

## オーナーへの質問

1. 一時停止（04:07Z）と、その後に設定された goal のどちらが有効だったか。今は goal に従って作業している。止めたい時は RESUME と同じ経路で「PAUSE」と送れば、やりかけを片付けて止まる。おすすめ: 予算に余裕が無ければ PAUSE を送る
2. 図鑑の2段の行（#256）を広い画面（幅 600px 以上）でも使うか。選択肢: (a) 縦積みの時だけ2段（今の実装）/ (b) 全ての幅で2段。おすすめは (a)。デザインは 390px しか描いておらず、#276 で広い画面は横並びと決めたため
3. 解剖画面の層・向き・深さの切替（#255）の「決まっていない点」
   - 点1 下パネルの高さ: (a) 今の実装（基準から見出しと操作ボタンの分だけ伸び、本文は欄の中でスクロール）を正にし、handoff の「守るべきこと 9（固定高 46%）」を直す / (b) 固定高 46% に戻す。おすすめは (a)。デザインは (a) の前提で描かれていて、本文で伸びない今の形でも「押した部位が指の下から逃げる」問題は起きない
   - 点2 「表示条件」の別画面: (a) 当面残す（チップと両方ある）/ (b) 消す。おすすめは (a)。実機でチップの押しやすさを確かめてから消すかを決めれば、戻す手間が無い。残す間は「この条件で表示」を主ボタンの見た目にする
   - 点3 切替の形: (a) 今回のデザイン（説明欄と右の欄にチップ）/ (b) スワイプや層スライダー（2026-09-21 の U-1）。おすすめは (a)。デザインが描けていて、RN と Web で同じに動く。(b) は後で足せる
   - 点4 About への入口が1つ減る件: 点2 を (a) にすれば起きない
4. 図鑑の詳細に位置の小図を足すか（#258）。選択肢: (a) 足す / (b) 足さない。おすすめは (a)。今ある座標だけで描け（新しい座標は足さない）、検索や保存から来た人が画面を移らずに位置を見られる。下書きの座標は破線で描くので、測った値と混ざらない

## issue の分け方の提案（#250・#253・#254。起票はしない）

### #250（外部取得・配布入口の入力と資格情報の検証）

ワークフロー2本と試験が1つの PBI に入っていて、ローカルの commit（未 push）もある。次の3つに分けると、1つずつレビューしてマージできる。
1. 入力を env/argv で受け取り、ID・path・URL・制御文字を検証する共通の helper と、その合成試験（ワークフローは触らない）
2. `cf-worker-deploy.yml` を helper に載せ替え、匿名で取得し、PAT へ戻らないようにする
3. `fad-external.yml` を helper に載せ替え、APK の archive を検査する（traversal・symlink・複数候補・大きさ）

どれも実際の配布・deploy は伴わない。2 と 3 は、外部の Public リポジトリの artifact を `github.token` で読めるかが実権限に依存し、未検証のまま残る（issue に書いてあるとおり）。

### #253（配布物の逆解析耐性・秘密情報の保護）

SBI 候補が5つ書いてある。そのうち3つは、端末やストアの成果物が無くても進められる。
1. Web の成果物（`dist/`）の棚卸し: ソースマップ・環境変数・内部 URL が入っていないかを、CI で毎回確かめる試験にする（この環境でできる）
2. ライセンス・帰属の監査（画像・フォント・解剖資料）。文書だけで終わる
3. Android・iOS の本番ビルド設定（Hermes・R8・Release 構成）の監査。ストアの成果物を作るワークフローが要るので、別の PBI にする

詳しい監査結果を公開の issue に書かない、という issue の方針は、どの子にも引き継ぐ。

### #254（SOLID に照らした監査とリファクタリング）

親の PBI のまま残す。最初の子は「SBI-1 全体監査」の報告だけにして、コードを変えない（受入条件: 監査対象を漏れなく並べ、直す所と今のままにする所の理由を書く）。リファクタリングの子は、監査結果から1件ずつ起こす。今日の #277（出す部位の条件を core の関数1つにまとめた）は、この監査で挙がるはずの物を1つ先にやった形なので、監査の報告に含めて重複させない。

## 気づいたこと・起票の提案

- **起票の提案（不具合）: 図鑑の検索欄が、320px・文字200%・日本語で画面から 11px はみ出す。** main（0fa39e2）で再現した: e2e の文字2倍の仕掛け（`e2e/tools/text-scale.ts`）を入れて 320×568・ja-JP で /catalog を開くと、`catalog-search` の右端が 331px（画面は 320px）。見立て（未確認）: Web の入力欄が字の大きさに応じた最小幅を持ち、`flex: 1` でも縮まない。`minWidth: 0` を検索欄に足すのが候補。完了条件の案: 320×568・文字200% で検索欄・消すボタンが画面に収まる e2e を足す。V02 の T07（#287）がこれで不合格になっている

- Codex の自動レビューは使用上限で、どの PR でも失敗している。CodeRabbit も無料枠の上限で、#283 以降を見ていない（04:00Z 時点）。お金は使わない決まりなので、そのままにしている
- GitHub Project 20 のボードは、この環境では GraphQL が使えないので読めず、動かしていない
- PR ごとに CI の deploy ジョブが Cloudflare Pages のプレビュー（ブランチ名付きの URL）を出している。本番ではない
- #286 の最初のコミットの件名が `wip(catalog): ...` で、Conventional Commits の型になっていない。履歴は書き換えない決まりなので残している。squash マージなら PR の題が件名になる
- 予定やループは作っていない


## MANAGER 2026-11-14T12:18Z（Fable・high。マネージャーの id は a8240260225d60a9f。SendMessage で続ける）
- PASS LINE
  - コードの PR: 次を全部満たす。
    - 正確な head で verify が緑。CI が無い時は LOCAL-CHECK で代える。
    - 独立レビューの must が 0。
    - 未解決のスレッドが 0。
    - develop に取り込む。
    - issue の箱を証跡つきで埋める。
  - リファクタの PR: 上の全部に加えて、次も満たす。
    - 特性化の試験がある。
    - 前後が同じ。
    - 監査の grep の条件を満たす。
    - 解剖のデータに触れない。
  - docs の PR: 主張ごとに、元になるコマンド・ファイル・commit がある。確かめていない事には（未確認）を付ける。
  - 実機の PBI: iOS と Android の証跡（画像・端末と OS・sha）が揃って初めて完了。Web の e2e は回帰を防ぐための物で、受け入れの代わりにはならない。
- #254
  - F7・F4・F5 はやらない。理由: F7 は Web の書き出しのためだけにある。F4・F5 は利用者に見える効果が無い。
  - F8 は確かめだけやる。derive を回し直して、差分を読む。差分が空なら CI に足す。空でなければ本人に上げる。
  - #254 を閉じる条件: #301・#302 が取り込まれ、F8 の結果と SBI-4 の判断（新しい道具は作らない）が記録されていること。
- #255〜#258: 実機の SBI が済むまで開けたままにする。Web の行は、今すぐ証跡のリンクつきで箱を埋める。
- 今すぐ閉じる issue: 無し。#13・#55・#185 は理由があるので残す。
- 始める A（最優先）: Maestro の flow を直す。
  - launch.yaml:25 は、もう無い UI を確かめている。
  - #263・#267・#271・#275 の flow を足す。
  - workflow を有効に戻すのは本人。
- 始める B: #210〜#217・#5・#50 が今の 12 枚の板で描けるかを確かめる、実現性の SBI。
  - 止めていた理由（#70 待ち）は、#70 が 10-29 に閉じて、もう無い。
- LINE の要望: 見つかったのは #151・#158・#178 で、どれも閉じている。これで全部かは（未確認）なので、本人に1回だけ聞く。
- R4・R5 の続き: 試験だけの PR を1本にまとめる（表の行・toContain の偽の合格・使われていない pillTextOn）。ボタンの画素の確かめは、やらない。

## 2026-11-14T12:25Z
- #301（R4）を、第2版の関門で取り込んだ: 4307e58。REVIEW・LOCAL-CHECK・証跡 evidence/301-6f082c6.png・GATE は PR にある。
- #302（R3）のレビューは FAIL（must 1。depth を状態へ書くことを、試験が固定していない）。作者に戻した。
- 動かしている作業役:
  - 試験だけの続き（test/review-followups-4）
  - F8 の確かめ
  - Maestro の flow（test/maestro-device-flows）
  - #302 の直し

## HOUR 2026-11-14T12:38Z | merged 8 | closed 0 | output 8 | open PR 3->1（#281 を除く: 2->0） | open issues 34->34 | ledger open: 下の表 | owner 9 | device 6 | stuck at none
- 決まり 1(a)（今週・来週の Iteration）で前に出した数: 0（GitHub Project のボードがこのセッションからは読めない。for main session に書いた）。1(b)（claude-cloud のラベルが無い物を先に）で前に出した数: 0（開いている issue に claude-cloud のラベルは 0 件）。決まり 2（-ux の人の作業はしない）で飛ばした数: 0。
- 取り込み（第2版の関門。REVIEW・LOCAL-CHECK・証跡の画像・GATE は各 PR にある）:

| PR | 中身 | develop |
|---|---|---|
| #301 | #254 R4 パネルの高さの計算を core へ移す | 4307e58 |
| #302 | #254 R3 部位の選択を anatomy-state へ移す（レビュー 1回目は FAIL。depth を固定する試験を足し、本文を直した） | 8d9eccb |
| #305 | 板の実現性の報告（docs） | e9eddc1 |
| #304 | 試験だけの続き（panelCap・境目・覚えたの記録） | 692fd00 |
| #303 | CI に derive のずれの検査を足す（#254 F8） | 9356d36 |
| #306 | Maestro の smoke を直し、実機の flow 4本を足した | 8dbfb31 |

（#298・#299・#300 は第1版の時の取り込みで、11:38〜12:00Z）
- 動いている作業役: 6
  - #215 腎臓の下書き（e2e と画像）
  - #210 の数え A・B（2人がそれぞれ別に数える）
  - 小さな続き（chore/review-followups-5）
  - #255〜#258・#254 の箱を埋める
- DECIDED | #50 の4筋は 棘上筋・棘下筋・腸腰筋・鎖骨下筋 | reason: issue の題・本文と structures.ts の deep 4件が一致するため（マネージャー） | revert: #50 にコメントで訂正する
- DECIDED | 深層筋は位置を置かないまま | reason: 絵に無い物の座標は作らない | revert: 本人が別の見せ方を選んだら変える
- DECIDED | #215 の膀胱は足さない | reason: 2人が別々に見て一致しなかった | revert: 2人が別々に見て一致したら、別の PR で足す

## HOUR 2026-11-14T13:02Z | merged 1（#307 e7c380f） | closed 1（#254 completed） | output 2 | open PR → #308（DEVICE 待ち）・#309（レビュー 3回目 FAIL＝本文だけ） | open issues 34->33 | owner 9 | device 6+2（#308・#5 の関節） | stuck at allowance（GitHub の secondary rate limit。12:5xZ から約1時間、コメントと PR 作成ができない）
- 決まり 1(a)・1(b)・2 で前に出した数・飛ばした数: 0・0・0（理由は前の HOUR と同じ）
- 動いている作業役（6）:
  - 空の場所を押せなくする・後面に trunk を足す（feat/area-empty-disable 0bd65f7。e2e の途中）
  - 「すべて解除」を同じ行に（fix/catalog-reset-inline f7316fa。ポート待ち）
  - #255 の見出しを左に（fix/255-inline-chip-labels d7eeccc。ポート待ち）
  - #258 のボタンを1行に・› を足す（fix/258-detail-button-row e485f2c。ポート待ち）
  - #309 の README の直し
- 押し済みで、PR を作るのは制限が解けてから: feat/5-joints-left-draft（61538b2。肩・肘・前肢の球節。2人目の目でも一致。e2e 274）と、上の3本の直し
- 制限が解けたら投稿する物: #309 のレビュー2件（scratchpad/r/body.md・309-c4d6f14.md）、#255 の判断のコメント
- DECIDED | #210 の椎骨・肋骨は群のまま | reason: 2人が別々に数えた数が、どの群でも一致しなかった（#210 にコメントで記録） | revert: 新しい絵で数え直す
- DECIDED | #308 の腎臓は、一覧から選ぶだけでいい | reason: 根本の直しは、空の場所を押せなくする別の PR でする（マネージャー） | revert: 別の PR が入らなければ #308 の本文に戻す
- DECIDED | デザインとの差: #255 の見出しを左に・すべて解除・#258 のボタンの並びと › は直す。札の大きさ・▾・小図の高さ・1440 の表示条件は許す（理由は #309 の README の「判断」にある） | revert: 本人が許さない差を挙げたら直す
- DECIDED | #254 を閉じた（completed） | reason: マネージャーの閉じる条件（#301・#302・#303、F4・F5・F7 の理由、SBI-4）が全部そろった | revert: 開き直す

## needs owner（2026-11-14T12:20Z）
- secret-scan の workflow がリポジトリの設定で手で止められている（`disabled_manually`）。2026-10-09 から、どの PR でも走っていない。推奨: 元に戻す（守りの仕組みを弱めた状態なので、本人が決める）
- #278 の書き方チェックの揃え方（推奨 (a): テンプレートごとに必須の見出しを変える）
- LINE で来た要望の文面（リポジトリに無い）
- #250（手元の未 push の枝を、3つの下書き PR に分けてよいか）
- develop を main に上げる時期（本番の Web）。推奨: 「Web版はいらない」なので上げない
- R02: stg の版をテスターに配ってよいか
- P08: 抜き取りの 10 件を人が見る
- LINE の要望の一覧は #151・#158・#178（どれも閉じている）で全部ですか（はい／いいえ／分からない）。分からない時の既定: この3つを全部とみなす
- Maestro Smoke の workflow が 2026-10-10 から手で止められている。flow を直したら有効に戻すか
- 最初の目標（逆解析した部位を正しく表示する）は、今の 12 枚の板だけでは全部は満たせない（神経・リンパ・感覚器・深層筋などの絵が無い。報告は #305）。#70 を開き直して絵を用意するか、絵の無い系統は「載せない」と決めるか。推奨: 描かれている物から下書きして、残りは絵を用意する判断を本人がする
- secret-scan の workflow だけでなく、Maestro Smoke（2026-10-10 から）と r2-maestro も `disabled_manually` になっている。実機の flow（#306）を直したので、有効に戻すか
- 390px の解剖画面で、部位のパネルが 60px しかない（案内はスクロールしないと見えない）。推奨: 今のまま

## for main session（2026-11-14T12:20Z）
- 第2版の決まりの前（第1版）に取り込んだ #282〜#300 には、G4 の証跡の画像と、第2版の書式の GATE の行が無い。中身のレビューと手元の検査の記録は、各 PR にある。やり直しはせず、ここに記録する
- 多くの PR の head で、CI の pull_request の実行が作られない（#296・#298〜#302）。書き方チェックとラベルは走る。原因は未確認。G3 は LOCAL-CHECK で満たしている
- GitHub Project（project 20）の Iteration は、このセッションからは読めない（GraphQL と users/projectsV2 が 403）。そのため決まり 1(a) の並べ替えはできない。claude-cloud のラベルが付いた開き issue は 0 件、-ux に割り当てられた物も 0 件
- 台帳 status.tsv は Mac にあり、このセッションからは読めない。台帳の直し（S03 done・R07 取り下げ・D02 done・S01 はクラウドの記録で done・D05/D08/D12/V01/V02 の対応 PR）は、このファイルに書くので、Mac の側で写してほしい

- 2026-11-14T13:26Z OWNER RULING（判断役が伝達）:「CIはローカルで通れば通ったものとみなしていいよ」。関門の checks は、マージする head で CI と同じ検査（entrypoints・run.test.mjs・run.mjs verify-full＝type-check/lint/test/validate:coords/derive×3+差分/e2e、build）をローカルで通し、LOCAL-CHECK を PR に書けば足りる。hosted CI が緑とは書かない。後で hosted が落ちたら即 follow-up PR。
- DECIDED 13:26Z: #309 の LOCAL-CHECK は d072eb3 で CI と同じ一式を取り直す（前回は e2e・derive・run.test が抜けていた）。非 e2e 部分は 13:25Z に合格（entrypoints OK・run.test pass 10 fail 0・checks 0・unit 1414・build 0・porcelain 0）。e2e はポートの順番待ち（#258 の次）。戻し方: 無し（検査を足すだけ）。
- DECIDED 13:26Z: 255fix の「狭い幅・未選択で状態の1行を隠す」は取り消す。Maestro の smoke（view-toggle.yaml）と 263 の実機フローがその行を見ており、ここでは Maestro を走らせられないため。8px は余白から取る。足りなければ報告で止める。戻し方: index.tsx:160 の条件を `wide||selected` に戻し、Maestro フローをチップの checked 確認へ直す（実機で確かめてから）。
- 13:26Z 5-joints re-review e6fd19a PASS must 0（want は PR 本文 → 5body.md を直した）。areas-only re-review 84946f2 PASS must 0 → want の試験を f3cd594 で追加（差分レビュー要）。255fix review bc4226e FAIL must 1。
- 13:35Z 判断役の監査（PM audit 13:35）を受けた: ①デザインのアーティファクトは判断役からも「artifact not found」→ needs owner のまま、比較の記録には版 1794408922-3f3d（11-11 写し）を書く。②255fix の「状態の1行を残す」は維持。#255 には「受け入れた差」として書く（理由: 開いた時の試験で欄が溢れない／選択中の列に同じ行がある／Maestro Smoke は disabled_manually で #306 のフローは未実行）。e03b062 は別のレビューと一式の検査が要る。after-390x844-none.png は撮り直し。③b159 を先に、b173 は比較だけ、デザインの無い画面は一覧だけ。④検査一式（entrypoints・run.test・run.mjs checks・build・e2e）を最終の head で全 PR に。⑤needs owner の順: 実機の証跡（Maestro Smoke の再有効化か実機の実行）を1番に。⑥マージの順: UI の直し（#258・#255・reset・empty areas）→ #309 と比較の文書。#308・5-joints は実機待ち。⑦書き込みを減らす: PR の head ごとにコメント1つ（review＋local-check＋gate をまとめる）。
- DECIDED 13:33Z: #258 の want（英語で1行に収まるか・高さの確かめを 44 に）は後追い。en の折り返しは 320px・文字200% と同じ扱いで受け入れ（デザインも折り返しを許す）。高さの確かめを 44 にするのは別 PR。戻し方: 1行を必須にするなら [id].tsx:124 の行を縮める。
- 13:32Z #258 9210f80: review PASS must 0。非 e2e の一式 合格（entrypoints OK・run.test 10/0・checks 0・unit 1414・build 0・porcelain 0）。e2e はポート待ち（areas2 の次）。#309 d072eb3: 一式すべて合格（e2e 274 pass 13:30Z）。
- 13:55Z 判断役の監査（13:47Z の時報への返事）: ①#313（尺骨が上腕骨の上）を最優先にし、下書きの総点検へ広げる（2人が別々に「図形が名前の構造に乗っているか」を yes/no/判らない で答え、一致した no だけ直す。判らない は #13 へ）。②下書きのデータだけの PR（#308・#312・#313 の直し・総点検の直し）は、Android の画像なしで develop へ取り込んでよい。代わりに実機の確かめを 1 つの SBI にまとめ、main の前に閉じる → #314 を起票。取り込みの条件は、最終の head での検査一式・2人の一致・Web の前後の画像。③GATE の deploy 欄は「no production deploy」と書く（PR の hosted CI はブランチの preview を出す）。#310 の hosted verify は取り込みの後の確かめ（13:46:17Z success）。④#310 の後追い: 保存・覚えたにするを 44 以上で確かめる、英語 390 で折り返して切れない事を確かめる。nit 2 件は見送り。⑤ポートの順: 255fix → #311 → #312 → #308 → #313 の直し（同じファイルを触るので #312 の後）。
- 13:55Z 起票 #314（実機の確かめの SBI）。総点検の識別者 A・B（Sonnet、別々）を起動。#310 の後追いの担当（Sonnet、test/310-followup-tap-size）を起動。デザインの棚卸し d949084 は review FAIL must 2 → 直しを依頼（DECIDED: 解剖の説明欄は新しいボードが正。残りの直すは #255 で追う。閉じた #159・#56 は開け直さない。戻し方: 判断役が別の issue を指定したら移す）。
- 14:10Z 判断役の決まり（全 lane）: GitHub への書き込みは同時に 2 人まで・書き込みの間は 2 秒以上。読みはまとめて 1 回。60 秒より短い見張りの繰り返しはしない。secondary の 403 では Retry-After に従い、待つ間は手元の作業をする（レビューはファイルに書いて後でまとめて出す）。時報に、出せずに溜まっている書き込みの数を書く。この lane では GitHub に書くのはリード（自分）だけ。担当には書かせない。
- 14:10Z 溜まっている書き込み 7: #315 の関門コメント＋マージ、#317 の関門コメント＋マージ、総点検の直し1 の PR、総点検の記録の PR、#255 への b159 の後追いの書き足し。14:17Z に 2 秒以上空けて順に出す。
- 14:10Z 待つ間の手元の作業: b159 の後追い（#316 の直す 3 件、#317 の上に積む、Sonnet）と、総点検の直し2（上腕骨・尺骨、#312 の上に積む、Sonnet）を起動。
- 14:08Z #317 38a0e0f（develop 取り込み後）一式 合格（unit 1428・e2e 282）。14:03Z #315 1b2ab6c 一式 合格（unit 1414・e2e 275）。#311 は 13:58Z に取り込み済み（e2e 278）。総点検の直し1 d24d204: レビュー PASS must 0、2 人とも 5 件「乗っている」。総点検の記録 1903efb: 再レビュー PASS must 0。

## PAUSED 2026-11-14T14:22Z（判断役の指示: 週の枠が残り少なく、顧客の作業に回す）

STATE: PAUSED。新しい担当・作業は起こさない。

再開したら最初にやる事（順に、書き込みの間は 3 秒以上、403 が出たら止める）:
1. #315: `note/cloud-equus-anatomy-queued/315-combined.md` を PR にコメント → head を読み直す（1b2ab6c のはず）→ squash で取り込み（expectedHeadSha）。一式は 14:03Z に合格済み。
2. #317: `317-combined.md` をコメント → head 38a0e0f を確かめる → 取り込み。一式は 14:08Z に合格済み（develop 取り込み後）。
3. #312: 本文を `5body.md` で PATCH → `312-combined.md` をコメント → head e6fd19a → 取り込み。一式は 14:20Z に合格済み。証跡は evidence/312-e6fd19a.png。
4. 総点検の直し1（fix/draft-placement-sweep-1、d24d204）: `sweepfix1body.md` で PR を開く → 証跡（scratchpad/ev/sf1.png、無ければ一式の結果から作り直す）を evidence/<pr>-d24d204.png に → 関門のコメント → 取り込み。一式は 14:13Z に合格。#312 の後に取り込むなら、left.json と baseline.json がぶつかる → develop を取り込み、derive を回し直して hash を計算し直し、一式を取り直す。
5. 総点検の記録（docs/draft-placement-sweep-20261114、1903efb、レビュー PASS）: `sweepdocbody.md` で PR を開く。一式を取ってから取り込み。
6. #255 に「b159 の後追い」の段を書き足す（#316 の直す 3 件と、場所を選んだ時に 深さ の行が 1つ戻る の帯で切れる件）。
7. #309・#316（記録だけ、レビュー PASS）: UI の直しの後に一式を取って取り込み。

途中の物（14:22Z）:
- b159 の後追い（fix/b159-panel-followups、d633042 が push 済み）: ポート 4187 で全 e2e を回し中。その 1 手で止まる。結果が push されていなければ、再開時に e2e から。レビューはまだ。
- 総点検の直し2（fix/draft-placement-sweep-2、cc71f71、#312 の上に積んだ）: 識別者 2 は 上腕骨 yes・尺骨 no（幹が 8〜10px 後ろ寄り、x612-628 へ）・関節 3 つ yes・y740 の端は妥当。識別者 1（Opus のレビュー）は回し中。保存先 scratchpad/r/sweepfix2-cc71f71.md。再開したら尺骨の幹を直して、2 人の確かめを取り直す。
- #310 の後追い（test/310-followup-tap-size、be9565b、push 済み）: e2e と、高さ 36 で落ちる事の確かめが残る。
- #308（腎臓）: 本文は直し済み。DEVICE 待ちの文を、新しい決定（Android の画像なしで develop へ・#314 の行 1）に直し、一式を取って取り込む。
- 別の item にする事: 場所を選んだ時に 深さ の行が 1つ戻る の帯で切れる（b159 の後追いの測定で見つけた）。

溜まっている GitHub の書き込み: 9（上の 1〜6 と #312 の本文）。予約していた再試行（14:36Z）は取り消した。
今日の取り込み: #310・#311（ほかに前半で #294〜#307）。開いている PR: #281・#308・#309・#312・#315・#316・#317。
needs owner: 実機の証跡（Maestro Smoke の再有効化か実機の実行）が最初。デザインのアーティファクト Ci1ZaRA6LFrL1Pv7bPewWp をこのアカウントへ共有、#page-dcb81aee8d83 の題。ほかは前の一覧のまま。

## START 2026-11-15T01:13Z（夜の指示、統括 [ritmo]。lead = Fable、判断役とレビューは Fable、実装は Opus、機械的な手は Sonnet。同時に生きている担当は 1 人まで）
- handoff: #318（Mac の実機担当）と 枝 handoff/cloud-notes-20261114 の doc/handoff/handoff-20261114-cloud.md（クラウド）を読んだ。次の一手はクラウドの引き継ぎの「最初にやる事 3 つ」
- worktree: /workspace/equus-anatomy claude/equus-anatomy-cloud-startup-uocan9 clean | /workspace/notes chore/cloud-notes-equus-anatomy clean（新しいコンテナ。未 push は無い）
- develop の head: 23ed8cc
- next 5: #315 関門→取り込み / #317 関門→取り込み / #312 本文→関門→取り込み / #308 一式→関門→取り込み / 総点検の直し1 の PR→取り込み
- for main session: デザインのアーティファクト Ci1ZaRA6LFrL1Pv7bPewWp はこのコンテナからも確かめる（前の lane では「artifact not found」）。plan の行（TSV）は最初の伝言に無かった → 開いている PR と引き継ぎの次の一手から始める
- 時刻の訂正: この会話の初めの記録は時刻を見積もりで書いた。コンテナの時計では、開始は 01:13Z、#315・#317・#312 の取り込みは 01:14〜01:17Z。#312 の関門のコメントの「01:3xZ」は 01:16Z ごろが正しい。以後は `date -u` の値だけを書く
- 01:14Z #315 | LAND | 関門のコメント＋squash | head 1b2ab6c | local 一式 14:03Z | review https://github.com/kouiso/equus-anatomy/pull/315#issuecomment-6887144840 | merged 8118c5c
- 01:15Z #317 | LAND | 関門のコメント＋squash | head 38a0e0f | local 一式 14:08Z | review https://github.com/kouiso/equus-anatomy/pull/317#issuecomment-6887151072 | merged 2eb164c
- 01:16Z #312 | LAND | 本文を直す＋関門のコメント＋squash | head e6fd19a | local 一式 14:20Z | review https://github.com/kouiso/equus-anatomy/pull/312#issuecomment-6887159200 | merged a2c42e2
- DECIDED | 長いレビューの全文（#317・#312 は各 20KB）は PR に貼り直さず、notes の枝の固定リンク（commit c4073f0 の queued/*.md、一字一句そのまま）を指し、PR のコメントには REVIEW の行・must の中身・LOCAL-CHECK・GATE を書く | reason: 貼り直しは出力の枠を 1 本あたり約 1 万トークン使う。固定リンクは書き換わらない | revert: 全文を PR のコメントに貼り直す
- DECIDED | develop の取り込みと baseline.json の hash の計算し直し（#308・総点検の直し1）は lead が手でやった | reason: 機械的な 1 手で、担当に説明する方が高い。中身は新しいレビュー役（Fable）が「base update only」で確かめる | revert: 担当に任せる
- 判断役（Fable、agent acd3b59787f813d90）01:20Z の方針:
  - PASS LINE: 昨日の物（348 行目）のまま。足した物: 下書きのデータの PR は source: draft のまま・validate:coords 緑・1 部位 1 回・2 人の判定を PR に書く・取り込んだ sha を #314 に足す / UI の PR は同じ条件の前後の画像と doc/design/ との比べ、「アーティファクトは開けていない（未確認）」と書く / 試験を弱めて緑にしない。0.6 の割合の試験は触らない / 押しやすさの PR は見た目と高さを変えない。#267 は Pixel の証跡まで開けたまま / 積んだ枝は develop へ付け替え、その head で一式を取り直す
  - 順番（#308 の後）: 総点検の直し1 → feat/area-empty-disable → hitSlop の PR（#267。test/310-followup-tap-size を畳み込む）→ fix/b159-panel-followups（直しは 1 回まで。赤が残れば置く）→ 総点検の直し2（尺骨は 1 回動かし、2 人が一致しなければ #13 へ）→ docs（#309・#316・総点検の記録を 1 回で）
  - PR の無い issue: #250 は 0 件（受け入れの行が push/PR を禁じ、実装の commit 35420b7 は origin に無い → needs owner）/ #253 は列が空いた時だけ 1 件（Web の書き出しに source map や秘密の型が無いかの検査。数だけ報告）/ #255〜#258 は docs の手で、実機でない箱に証跡を付ける / #314 は lead が取り込んだ sha ごとに書き足す / ほかは待ち
  - 締めた点: hitSlop は Android で親の枠に切られ、react-native-web は無視する（判断役の記憶。未確認）→ レビュー役が親の余白を確かめ、試験は prop の値（高さ＋slop ≥ 48）で確かめる / パネルの直しを今夜置くなら #309・#316 は差を書いたまま取り込む
- CYCLE 1 T=2026-11-15T01:13Z | PRs 7（#281 notes・#318 handoff は数えない。#319 は T の後に開いた） | issues 35 | ledger rows 0（plan の行は届いていない） | 一覧は note/cloud-equus-anatomy-cycles/cycle-1.tsv
- 01:25Z #308 | LAND | develop を取り込み・一式・base update のレビュー（Fable）・関門・squash | head 1589971 | local 一式 01:22Z（unit 1458・e2e 283） | review https://github.com/kouiso/equus-anatomy/pull/308#issuecomment-6887254300 | merged 8a8f665
- 01:31Z #319（総点検の直し1。この会話で開いた） | LAND | develop を取り込み・一式・レビュー（Fable、PASS must 0）・関門・squash | head a1a7854 | local 一式 01:28Z（unit 1458・e2e 283） | review https://github.com/kouiso/equus-anatomy/pull/319#issuecomment-6887342184 | merged b560603
- 01:32Z #309 | LAND | 関門のコメントは昨日のまま（d072eb3）。squash | merged 3a5cf4d
- 01:34Z #320（総点検の記録、docs）を開いた。head 1903efb。レビューと関門はこれから
- feat/area-empty-disable は、中身のほとんどが #311 で develop に入っていた。残りは後面の体幹の場所（204ef7f）だけ → develop から切り直した枝 feat/rear-trunk-area（a06e8ba）。実装役（Opus）が副作用を見つけて止まった: 体幹の箱が後肢の箱の中にあり、皮膚・筋肉・骨格の層では「押せない体幹」が後肢への押しを吸う。判断役に JUDGE で送った（01:36Z）
- DECIDED | docs だけの PR（#316・#320）の LOCAL-CHECK は entrypoints・run.test・checks まで。build と e2e は回さない | reason: doc/ だけの変更で、アプリのコードと試験に差分が無い。e2e のポートは 1 つで、コードの PR に使う | revert: head で build と e2e も回してコメントに足す
- DECIDED 01:36Z | この lane が開く PR は GitHub の通知に登録しない（#319・#320 は登録を外した） | reason: 通知は bot の定型文（CodeRabbit の skip・Codex の枠切れ・書き方チェック）ばかりで、1 本あたり 13 通・数千トークンを使う。PR の状態は取り込みの直前に読む | revert: subscribe_pr_activity で登録し直す

## HOUR 2026-11-15T01:36Z | merged 6（#315 #317 #312 #308 #319 #309） | closed 0 | fixed 0 | blocked: PAUSE（統括の枠の見張り）。決まり 2・3 で前に出した数 0（ボードは読めない・claude-cloud の札 0 件）。skipped: owner's rule (-ux) 0 件

## HANDOFF 2026-11-15T01:36Z（PAUSE。押し込み済み。RESUME まで何もしない）

develop の head: 3a5cf4d（#309 まで）。未 push は無い（worktree 4 つとも dirty 0・unpushed 0）。動いている担当: 0（実装役は止めた）。

次にやる事（順に）:
1. #316（デザインの棚卸し、docs、head c7d4346）と #320（総点検の記録、docs、head 1903efb）: 新しいレビュー役（Fable）に 1 回で 2 本を見せる → REVIEW・LOCAL-CHECK・GATE をコメント → squash。LOCAL-CHECK は取り済み（entrypoints OK・run.test 10/0・unit 1414。01:33Z・01:34Z）。証跡は notes の枝 evidence/316-c7d4346.png・evidence/320-1903efb.png。昨日の PASS のレビュー文は残っていないので、取り直す
2. feat/rear-trunk-area（head 2e298cd = WIP、未検査）: 判断役の決定 C（全部の向きで、点の無い所を押した時は「今の層で部位が無い場所」を飛ばして、部位がある次に小さい場所へ落とす）。実装役（Opus）が src/core/hit-test.ts と src/ui/anatomy-canvas.tsx を書きかけた所で止めた。残り: 落ちている試験 2 件（area-availability.test.ts の空の一覧を 18/52・後面 7/12 に、anatomy-state.test.ts:222 を「後肢・尾は押せない／体幹は選べる」に）、単体 3 例、e2e（後面・内臓→体幹→腎臓／後面・筋肉で体幹の帯→後肢）、前後の画像（後面の内臓と筋肉）、derive-rear.ts のコメントと coverage の試験名の言い直し、一式、PR の本文（queued/reartrunkbody.md はまだ無い）→ PR → レビュー → 取り込み。条件の全文はこの上の「判断役」の行と会話の記録にある（hit test は純粋のまま・灰色の点そのものは押しても何も起きない・source: draft）
3. hitSlop の PR（#267。見た目 44px のまま、押せる高さ 48 以上。test/310-followup-tap-size be9565b を畳む）。判断役の注意: Android は hitSlop を親の枠で切る・Web は無視する（未確認）→ 試験は prop の値で
4. fix/b159-panel-followups（e31448c。e2e 4 件が赤。直しは 1 回まで。0.6 の試験は下げない）
5. fix/draft-placement-sweep-2（cc71f71。尺骨の幹を前へ 1 回だけ動かし、2 人が一致しなければ #13 へ。develop を取り込み直す）
6. #314 に、今夜 develop に入った sha を書き足す（#308 8a8f665・#312 a2c42e2・#319 b560603）。#255〜#258 の実機でない箱に証跡を付ける
7. まとめて取り込んだ後の develop の head で一式を 1 回取り、実機に渡す sha として記録する（#319 の head a1a7854 の一式＝unit 1458・e2e 283 は #308 までを含む。#309 は docs だけ）

開いている列: LAND 2（#316・#320）| FIX 4（rear-trunk・b159・sweep-2・#255）| FINISH 1（hitSlop＋#310 の後追い）| OWNER 22 | DEVICE 10。一覧は note/cloud-equus-anatomy-cycles/cycle-1.tsv

needs owner（はい／いいえ。既定つき）:
- #250: 手元の commit 35420b7 を push して develop への PR にしてよいか（既定: しない）
- secret-scan・Maestro Smoke・r2-maestro の workflow を有効に戻すか（既定: 止まったまま。push の前に手元で確かめる）
- デザインのアーティファクト Ci1ZaRA6LFrL1Pv7bPewWp をこのアカウントへ共有するか（既定: リポジトリの写し doc/design/ で比べる）
- #278 の揃え方は (a) テンプレートごとに必須の見出しを変える、でよいか（既定: 今のまま）
- develop を main に上げるか（既定: 上げない）／stg の版をテスターに配るか（既定: 配らない）
- 台帳の枝 feat/reference-coverage-audit-20261022 と handoff/v02-scratch-20261114 を消してよいか（既定: 消さない）
- ほかは 2026-11-14T12:20Z の一覧のまま

DEVICE（Mac の実機）: #263・#267（48dp の直しの後に Pixel で撮り直す）・#271・#275（develop の今の head で回し直す）・#314（行 1〜4、iOS と Android）・#12・#46・#256〜#258 の実機の箱・iPhone の分すべて

for main session:
- plan の行（TSV）が最初の伝言に無かった。開いている PR と引き継ぎから始めた
- GitHub Project（project 20）の Iteration はこのセッションから読めない（昨日と同じ）
- この会話の最初の数件の時刻は見積もりで書いた（訂正は上の行）。コンテナの時計は 01:13Z 開始
- 課題 review band: まだ（lane の作業が残っている）

## MOVED to personal account 2026-11-15T05:04Z
## START 2026-11-15T05:04Z（夜の指示、統括 [personal]。lead = Opus、実装とレビューは Opus、機械は Sonnet、同時に生きている担当は 1 人まで）
- handoff: 上の HANDOFF 2026-11-15T01:36Z。次の一手はその 1（#316・#320）
- worktree: /home/user/equus-anatomy claude/equus-anatomy-cloud-startup-kg2y1p clean | /home/user/notes chore/cloud-notes-equus-anatomy clean（新しいコンテナ。未 push 無し）
- develop の head: 3a5cf4d（変化なし）
- 開き PR: #316（c7d4346）・#320（1903efb）・#318 handoff・#281 notes
- next 5: #316+#320 レビュー→関門→取り込み / feat/rear-trunk-area 仕上げ→PR / hitSlop（#267）PR / fix/b159-panel-followups / fix/draft-placement-sweep-2
- 05:08Z #316 | LAND | レビュー（Opus、PASS must 0 want 2）・LOCAL-CHECK・GATE を 1 comment・squash | head c7d4346 | review https://github.com/kouiso/equus-anatomy/pull/316#issuecomment-6889552939 | merged c2d93b9
- 05:09Z #320 | LAND | 同上（PASS must 0 want 2） | head 1903efb | review https://github.com/kouiso/equus-anatomy/pull/320#issuecomment-6889554898 | merged b8bfbe0
- DECIDED | #316・#320 の want（測った commit の明記、#317 後の直す 2 の測り直し、行番号、README の #312/#319 の古い記述）は後追いにして取り込んだ | reason: 事実の誤りではなく時点のずれ。直すと再レビューが要り、1 本あたりの費用が倍になる | revert: 後追いの docs PR で直す（列の FINISH に置く）
- DECIDED | 生の出力（data/A-summary.md・B-summary.md、英語）は文書の日本語の決まりの対象外とみなす | reason: sha256 で固定した証拠で、訳すと hash が壊れる | revert: 訳を別ファイルで足す
- 05:26Z #321（feat/rear-trunk-area、この会話で開いた） | FIX→LAND 途中 | 実装役（Opus）が判定 C を仕上げた。一式 合格（unit 1464・e2e 287、a5668b1）。証跡 evidence/rear/（1716130）。レビュー役（Opus）を起動
- DECIDED | 判定 C を全部の向きに当てた副作用（正面・皮膚/筋肉で前肢の枠の中の体幹→前肢、側望・筋肉で尾の一部→後肢、側望・内臓で四肢と重なる所→体幹）は判定 C の意図どおりとして受け入れ、PR 本文に表で書いた | reason: 判断役の判定 C は「全部の向きで」。どれも「何も起きない」から「部位の有る場所」への変化で、選べなくなる物は無い | revert: canvas の selectable を後面だけに限る
- #314 に今夜の取り込み sha を書き足した（https://github.com/kouiso/equus-anatomy/issues/314#issuecomment-6889563350）
- 05:31Z #321 | LAND | レビュー FAIL（must 1 = 本文の表に 2 行抜け）→ 本文を直す → 別のレビュー役 PASS must 0 → GATE → squash | head a5668b1 | local 一式（unit 1464・e2e 287） | review https://github.com/kouiso/equus-anatomy/pull/321#issuecomment-6889782702 | merged 5d08dc6
- 後追い（FINISH）: #321 の want＝正面・側望の落ち先の変化を実データで固定する試験。#316/#320 の want（上の DECIDED）
- 05:42Z #322（fix/267-tap-target-48、この会話で開いた。test/310-followup-tap-size be9565b を畳んだ） | LAND 途中 | 実装役（Opus）。一式 合格（unit 1468・e2e 288、f43620c）。前後の画像は画素一致。証跡 evidence/267/（18b0c6a）。レビュー役（Opus）を起動
- デザインのアーティファクト: 実装役のコンテナでは開けた（版 1794658894-465d）。図鑑のボードは doc/design/ の写しと同じ中身。前の lane の「artifact not found」は解けた → needs owner の「共有するか」は外す
- DECIDED | #322 の範囲は #267 のコメントに名前のあるボタンだけ（同じ行の「まだ」と、見つからない時の戻る backPill は 44 のまま） | reason: 測った人が名前を挙げた物に限る。ほかは別の SBI で測ってから | revert: 同じ値（tap-target.ts）を足す 2 行
- DECIDED | 戻るの hitSlop を上 0・下 4 にした（列の先頭で上は親に切られる） | reason: Android の TouchTargetHelper は親の枠の外を拾わない | revert: 親に上の余白を足して 2/2 にする

## HOUR 2026-11-15T05:42Z | merged 3（#316 #320 #321） | closed 0 | fixed 1（#321 本文の must） | blocked: none（#322 レビュー中）。決まり 2・3 で前に出した数 0（ボードは読めない・claude-cloud 0 件）。skipped: owner's rule (-ux) 0 件
- 05:47Z #322 | LAND | レビュー PASS must 0 want 1（証跡の追加）→ lead が一覧（すべて解除）と詳細の前後を撮り足した（sha256 一致）→ GATE → squash | head f43620c | local 一式（unit 1468・e2e 288） | review https://github.com/kouiso/equus-anatomy/pull/322#issuecomment-6889943081 | merged d64889b。#267 は Pixel の測り直しまで開けたまま（DEVICE）
- 05:52Z 統括から新しい項目（テスターの声、解剖画面の左上と左下＝「場所・部位一覧」と「表示条件」）→ #323 を起票（人の名前は書かない）。順番は b159 の次。変える形は判断役（Fable、1 時間に 1 回）が b159・review-2026-11 のデザインと照らして決める
- 06:13Z #324（fix/b159-panel-followups、この会話で開いた） | LAND 途中 | 実装役（Opus）が直し 1 回で 4 件の赤を解いた（状態の行を測った幅で名前の右・名前の下・本文に置き分け、説明欄を伸ばさない）。一式 合格（unit 1475・e2e 292、3ffc8b8）。証跡 evidence/b159/（c43f640、develop・枝・デザイン b159 の横並び）。レビュー役（Opus）を起動
- 06:17Z #324 レビュー FAIL must 1（Web で古いスクロールバーがあると状態の行が見出しと本文を行き来し続ける。e2e は --hide-scrollbars なので見えない）→ https://github.com/kouiso/equus-anatomy/pull/324#issuecomment-6890254768 。同じ実装役に直しを戻した（FIX）

## 引き渡し（ritmo 側のクラウドの会話から。2026-11-15。この会話は保管される）

この notes は、個人アカウントの lane が 01:36Z の HANDOFF から先へ進めている。上の記録が新しい。ritmo 側の会話が持っていた物だけをここに書く。

- 触ったリポジトリ: kouiso/equus-anatomy だけ
- ritmo 側の会話が取り込んだ PR（develop へ squash、01:14〜01:32Z）: #315 8118c5c・#317 2eb164c・#312 a2c42e2・#308 8a8f665・#319 b560603・#309 3a5cf4d
- ritmo 側の会話が開いた PR: #319（取り込み済み）・#320（開いた時は head 1903efb。その後は個人アカウントの lane が扱った）
- ritmo 側の会話が作った枝: feat/rear-trunk-area。ritmo 側の最後の push は 2e298cd（WIP・未検査、hit-test.ts と anatomy-canvas.tsx の書きかけ）。その後の続きは個人アカウントの lane の記録（上）を見る
- ritmo 側の会話が push した既存の枝: feat/215-kidney-rear-draft（1589971）・fix/draft-placement-sweep-1（3d47cab・a1a7854）。どちらも取り込み済み
- 途中の物: 未 commit・未 push は無い。動いている担当・ジョブ・予約・PR の通知の登録は無い。push できなかった物は無い
- main と develop へ、直接の push はしていない。01:36Z の PAUSE の後は、この段を書いただけ
- 06:29Z #324 直し 1f12981（置き場の判定を「同じ器で測った幅だけ比べる」に。単体＋スクロールバーを出す e2e を足した。一式 unit 1483・e2e 295）。本文を直した。別のレビュー役（Opus）を起動
- notes の枝に ritmo 側の引き渡し（92d9357・196adae）が入っていた → merge で取り込んだ（強制 push なし）
- 06:38Z #324 | LAND | 再レビュー PASS must 0（スクロールバーを出した Chromium で幅と文字の大きさを振って、行が動かないことを確かめた）→ squash | head 1f12981 | local 一式（unit 1483・e2e 295） | review https://github.com/kouiso/equus-anatomy/pull/324#issuecomment-6890463951 | merged 361970d
- DECIDED | #324 の GATE のコメントは取り込みの前に送ったが接続の失敗で届かず、取り込みだけ通った。取り込みの後に同じ中身を貼り直し、順番をコメントに書いた | reason: head は expectedHeadSha で固定していたので、取り込んだ head は GATE の head と同じ | revert: 無し（記録のみ）。以後、GATE のコメントと取り込みは同じ応答で並べず、コメントの結果を見てから取り込む
- 統括 15:40 JST: ritmo 側の会話が引き渡しで notes や作業の枝に push しうる。push の前に fetch と rebase、強制 push はしない、GATE の後に head が変わった PR は取り込まない
- 06:39Z #323 判断役（Fable、この 1 時間で 1 回目）: A「表示条件」を上の行の「場所・部位一覧」の右へ。条件は https://github.com/kouiso/equus-anatomy/issues/323#issuecomment-6890471383 。needs owner へ: テスターの印の読み（2 つを上に並べる）が合っているか（はい／いいえ。既定: はい＝この形で出す）
- DECIDED 06:46Z | #323 の細部: (1) 上の行は今どおり図の上に重ねる（別の帯を足すと 390×600 の図の割合が 0.604→0.536 で 0.6 の試験を割る）。図の左下に残るのは「詳しく読む」だけ (2) 左上の 2 つのボタンの左右の余白を 14→8px（390 で ja・en とも 1 行に収まる。高さ 44 以上は保つ） (3) 320・文字200% で横に入らない時は「表示条件」を右の列（＋・−・元に戻すの下）へ（左の 2 段目だと頭部の点を覆う）。「場所・部位一覧」の 200% で切れている文字は折り返しに直す | reason: 判断役の決定 A の中の配置の細部で、元に戻せる。点を覆わず、0.6 の試験を下げない側 | revert: 余白を 14 に戻す・2 段目を左に置く
- 06:56Z 統括 16:02 JST: handoff/ritmo-hearing-20261115・wip/*-ritmo-20261115 には push・rebase・merge・close をしない（読むだけ）。読んだ: handoff/ritmo-hearing-20261115（bb43ec6、聞き取りの答え）。この lane に無い作業は無い（ritmo 側の次の一手 1〜6 のうち 1〜4 は取り込み済み、5 sweep-2 と 6 #314 はこの lane の列にある）。wip/*-ritmo-20261115 の枝は無い
- 07:03Z #325（fix/323-conditions-top、Closes #323） | LAND 途中 | 実装役（Opus）。一式 合格（unit 1490・e2e 301、a109f2c）。証跡 evidence/323/（540b8c0、390・320 文字200%・1440 の前後と b159 の横並び）。レビュー役（Opus）を起動。注意点: 英語 320 文字200% だけ点の当たりの円に少しかかり、その組の点の検査を外している（レビューで判断）
- 統括 16:15 JST: ritmo 側の会話は引き渡して止まった。この project はこの lane だけ。次は #267（#322 で取り込み済み、実機の測り直しは DEVICE）と #313（sweep-2）

## HOUR 2026-11-15T07:03Z | merged 2（#322 #324） | closed 0 | fixed 1（#324 のスクロールバーの往復） | blocked: none（#325 レビュー中）。決まり 2・3 で前に出した数 0。skipped: owner's rule (-ux) 0 件
- 07:14Z #325 レビュー FAIL must 1（本文と spec が点の当たりの円への重なりを少なく書いている。折り返した部位一覧が 2倍で頭部の円にかかる）→ https://github.com/kouiso/equus-anatomy/pull/325#issuecomment-6890924119 。同じ実装役に戻した
- DECIDED | 見える点の中心が覆われず押せるなら、見えない当たりの円にかかるのは受け入れる。試験は全部の幅・倍率で点の中心を確かめ、円にかかる組は全部書く。300px は範囲外（最小 320） | reason: 文字を省かない（判断役の条件）と点を覆わないの両立。点そのものは押せる | revert: 部位一覧の文字を省略に戻す、または 2倍で上の行を 2 段にする
- 07:26Z #325 直し fd0e7a3（spec だけ。点の中心の検査を 16 通りに、円への重なりは RING_EXCEPTIONS に全部、札が図の中に収まる検査を足した。一式 unit 1490・e2e 317）。本文を直した。証跡 evidence/323b/（a2e5576）。別のレビュー役（Opus）を起動
- 後追いの候補: 文字2倍で点の名前の札の幅が文字に合わない（develop でも起きる。札の幅を文字の倍率に合わせるか）→ #325 の後に issue にするか判断
- 07:35Z #325 再レビュー FAIL must 1（英語 2倍 320〜370 で部位の無い「尾」の札が消える。本文に無い）→ https://github.com/kouiso/equus-anatomy/pull/325#issuecomment-6891138439 。実装役に戻した
- DECIDED | 部位の無い「尾」の札が英語 2倍の狭い幅で隠れるのは受け入れる。spec で組ごとに描かれる札の集まりを固定し、ほかの札が消えたら落ちるようにする | reason: 点は残り、押しても何も起きない札 | revert: rightBelow の矩形を札の配置から外す
- 07:48Z #325 | LAND | 3 回目のレビュー PASS must 0（a109f2c FAIL → fd0e7a3 FAIL → 494e6de PASS）→ GATE（コメントの成功を見てから）→ squash | head 494e6de | local 一式（unit 1490・e2e 317） | review https://github.com/kouiso/equus-anatomy/pull/325#issuecomment-6891274096 | merged 76af83e。#323 は手で閉じた（develop は既定の枝でないため自動で閉じない）
- 後追いの候補（#325 の残る課題）: 文字2倍で札の幅が文字に合わない（develop でも）・1 フレーム早く見える・2倍で当たりの円にかかる。いずれも見た目だけ
- 07:49Z #313（fix/draft-placement-sweep-2） | FIX | 実装役（Opus）: develop を取り込み、尺骨の幹を必要なら 1 回だけ前へ、一式・証跡。その後に 2 人の識別（別々）→ 一致しなければ #13 へ

## HOUR 2026-11-15T07:49Z | merged 1（#325） | closed 1（#323、取り込みの後に手で） | fixed 2（#325 の must 2 件） | blocked: none（#313 実装中）。決まり 2・3 で前に出した数 0。skipped: owner's rule (-ux) 0 件
- 08:01Z #313 実装役: develop を取り込み（59b6881）、尺骨の幹を 1 回だけ前へ 8px（2e13d5f。下半分が骨の後ろの隙間にあった）。上腕骨は cc71f71 のまま。source: draft。一式 unit 1490・e2e 317。証跡 evidence/313/。識別者 A（Opus、画像だけ見る）を起動。次に B
- DECIDED | 「下半分が骨の後ろの隙間」を「まだずれている」と読み、1 回の移動を使った | reason: 判断役の条件は 1 回まで動かしてよい。移動は 8px で、橈骨の札の点と肘の関節の点の試験を守る | revert: 2e13d5f を打ち消す commit
- 08:03Z #313: 識別者 A・B（Opus、別々、画像だけ）とも上腕骨 yes・尺骨 yes。#326 を開いた（head 2e13d5f、Refs #313 #314）。レビュー役（Opus）を起動
- 08:04Z #326 | LAND | レビュー PASS must 0 want 1（リポジトリ内の after.png が途中の形）→ GATE → squash | head 2e13d5f | local 一式（unit 1490・e2e 317） | review https://github.com/kouiso/equus-anatomy/pull/326#issuecomment-6891442921 | merged 195bc8f。#313 は手で閉じた。#314 に今日の取り込み sha を足した（実機に渡す head 195bc8f）
- 08:10Z develop の head 195bc8f で一式 合格（entrypoints OK・run.test 10/0・unit 1490・e2e 317・verify=0）。実機に渡す sha はこれ（#314 に書いた）
- 08:10Z #327（docs/review-followups-20261115、#316・#320・#326 の want の後追い）を開いた。head d6bcab5。LOCAL-CHECK（checks のみ、docs）合格。レビュー役（Opus）を起動
- 後追いの候補（記録だけ）: 場所を選んだ 390×844 で深さの行が「1つ戻る」の帯の裏に半分隠れる（develop と同じ。#255 の決まっていない点 1＝説明欄の高さの規則と同じ根）→ needs owner の #255 の決まっていない点に含まれる
- 08:15Z #327 | LAND | レビュー FAIL must 1（測った commit が違う）→ lead が 00404ec で直す → 別のレビュー役 PASS must 0 → GATE → squash | head 00404ec | review https://github.com/kouiso/equus-anatomy/pull/327#issuecomment-6891558483 | merged 8b1eec1
- 08:16Z #253 | 判断役の決め（列が空いたら Web の書き出しの検査 1 件、数だけ）を済ませた: source map 0・sourceMappingURL 0・秘密の型 0・EXPO_PUBLIC 0・/home/ 0（195bc8f の dist） | https://github.com/kouiso/equus-anatomy/issues/253#issuecomment-6891566515 。#253 は開けたまま（ネイティブの配布物と絵・座標の逆解析への耐性は持ち主の判断と Mac が要る）→ OWNER
- 08:16Z #321 の want（正面・側望の落ち先を実データで固定する単体試験）の実装役（Opus）を起動。test/321-fallthrough-views
- 08:17Z 統括: 持ち主の指示「Opus使ってるところはfableチケット使いたいからfableに変えて。」→ lead は Fable 5.2（/model で切り替え済み）。これから起こすレビュー役・実装役は model "fable"、機械は Sonnet。同時に 1 人まで は変わらず。いま動いている #321 の後追いの実装役（Opus、切り替えの前に起動）は、やり直しの費用を避けるため最後まで走らせる。その次から fable
- 08:22Z #328（test/321-fallthrough-views、#321 の want の後追い。単体試験だけ、9 つの重なり・27 件）を開いた。head 5a846a4。checks 合格（unit 1517）。レビュー役（Fable）を起動

## HOUR 2026-11-15T08:22Z | merged 2（#326 #327） | closed 1（#313） | fixed 1（#327 の must） | blocked: none（#328 レビュー中）。決まり 2・3 で前に出した数 0。skipped: owner's rule (-ux) 0 件
