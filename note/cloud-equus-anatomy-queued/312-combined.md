この PR のレビューと関門の記録（1 つにまとめた）。

<details><summary>REVIEW | reviewer: general-purpose, opus 5.5 medium | authored no commit on this PR | head 61538b24de1587ea70c2dac8738b3c6e104edffa | axes: pass line, design, scope, tests, body vs diff, evidence | ve</summary>

REVIEW | reviewer: general-purpose, opus 5.5 medium | authored no commit on this PR | head 61538b24de1587ea70c2dac8738b3c6e104edffa | axes: pass line, design, scope, tests, body vs diff, evidence | verdict FAIL | must 1 want 2 nit 4

対象: feat/5-joints-left-draft 61538b2（base develop 8dbfb31、2コミット aa4b005・61538b2）。確認日時 2026-11-14 13:12 UTC。
一時的な detached worktree で `pnpm install --frozen-lockfile --offline` を実行（rc=0）。確認後に削除済み（`git worktree list` に残っていない）。Playwright と e2e は実行していない。

## must

M1. `e2e/legacy-cannon-search.spec.ts:16`: 件数が 87→90 になったことで、この検査の待ち条件が意味を失う
- `not.toHaveText(locale === 'ja-JP' ? '87 部位' : '87 parts')` は「件数が全件数から変わった＝検索結果が反映された」ことを待つための式で、コメントにも「入力後の反映を待ち」とある。この PR で全件数は 90 になるので、絞り込む前の一覧（「90 部位」）でもこの条件はすぐ通ってしまう。
- その後に続く `row` の表示確認も、`bone-metatarsus` は絞り込む前の一覧に入っているので、検索が壊れていても通りうる。証跡の `resultIds` にも、絞り込む前の一覧が書き込まれうる。
- この PR は単体試験の件数固定（coverage / index / pbi220）は直したが、e2e に直書きされた 87 を見落としている。直し方: `STRUCTURES.length` から作る（`e2e/v02-web-run.spec.ts:15` の `TOTAL` と同じやり方）。

## want

W1. `src/core/data/structures.ts:1085,1097,1109`: 新しい関節3件の `views: ['left']`
- `views` は側性を表す項目（`src/core/visible-parts.ts:7`「側性のある臓器（脾臓は左だけ等）は views で出す向きを限る」）。いま `['left']` だけなのは胃・脾臓の2件（476・500行）で、どちらも左側にしかない臓器。
- 肩関節・肘関節・球節は左右にあり、周りの前肢の骨（例: bone-humerus）は `['left','right']`。
- `GEOMETRY.right` は左を反転して作る（`src/core/data/index.ts:105`）ので、関節の図形は右側望にもある。それなのに `isStructureVisible` が隠すため、右側望では出ず、図鑑の詳細にも「掲載される向き: 左側望」と出る。
- 直し方: `['left','right']` にして、baseline の structuralMetadata・otherStructuresSha256 と coverage を合わせる。左だけにする判断なら、その理由を PR 本文に書く。

W2. README と handoff の件数が、マージした時点で古くなる
- 該当箇所: `README.md:63-68,92`（左側望 81 / 対象 85、合計 119、下書き 108）、`README.md:248`（解説文 87 件）、`README.md:273`、`doc/handoff.md:11`、`doc/handoff.md:110`（#5「新しい絵と座標が要る」。前肢の関節3件はこの PR で入る）。
- どれも「2026-11-14 時点（main 0fa39e2）」と日付付きなので、間違いとまでは言えない。ただ、マージ日も同じ日付になるため読み手が誤る。件数を更新するか、PR 本文で後追いすると書く。

## nit

N1. `e2e/v02-web-run.spec.ts:129` の試験名「87 部位」と、`doc/test-spec-2026-11.md:31` の「87 部位、覚えた 0 / 87」は古いまま。判定には `TOTAL` を使っているので、試験は落ちない。
N2. 証跡 `doc/evidence/5-joints/before-skeleton-all.png` と `after-skeleton-all.png` は sha256 がまったく同じ（0b5b0733…）。場所を選ぶ画面には部位の点が出ないので、同じになるのは正しい。ただ、前後の比較としては何も示していない。fore-area の前後と、関節ごとの3枚で足りている。
N3. `src/core/data/kana.ts:97` の肘関節の読みは「ひじかんせつ」。獣医解剖の読み「ちゅうかんせつ」でも引けるよう、NAME_KANA_ALIASES に別名を足すかを検討してほしい。
N4. この PR の範囲外で、前からある問題: `bone-ulna` の下書き図形（`scripts/derive-parts-skeleton-left.ts:65`、x548-596）は、絵の上では上腕骨の体の前側に乗っていて、肘頭（肘の後ろ、x≈650-668）を覆っていない。新しく書いた肘関節の解説「後ろへ突き出た尺骨の肘頭」と食い違って見えるので、別 Issue にしてほしい。

## 軸ごと

- pass line（通過条件）: must 1 件（M1）があるので FAIL。それ以外の条件は満たしている。
  - `pnpm type-check` rc=0
  - `pnpm lint` rc=0
  - `pnpm test` 51 ファイル / 1438 件すべて通過
  - `pnpm validate:coords` rc=0（配置済み 122、全部馬体の上）
  - `git merge-tree --write-tree e7c380f 61538b2` rc=0、競合なし（tree 42111f0）。マージ後の tree でも type-check rc=0、test 1438 件通過。
- design（設計）: W1。LABEL_AT の追加（`scripts/derive-parts-skeleton-left.ts:83-85,112`）はキーが `joint-fetlock-fore` の1件だけで、ほかの部位は従来どおり重心を使う。left.json の差分は関節3件の追加だけで、既存の部位の points と labelAt は変わっていない。
  - search.test の変更（`src/core/search.test.ts:96`）は正しく、弱めてはいない。「ほね」の別名は id ではなく層から機械的に張る作り（`src/core/data/kana.ts:105-122`。id ごとの例外を置かない方針がコメントに書いてある）。前の `startsWith('bone-')` は、骨格の層が bone-* だけだった間は同じ条件の言い換えだった。
  - 関節を「ほね」から外すと、id ごとの例外が必要になり、上の方針に反する。UI の層の名前も「骨格」で、関節はそこに属する。
  - 骨格の部位が全部 hone で引けることは、同じファイルの 83-89 行で正の向きに確かめている。
- scope（範囲）: 0件。追加は前肢の3件だけ（region 前肢、layer skeleton）。両隣の骨はすでに置いてある。肩関節は肩甲骨と上腕骨、肘関節は上腕骨・橈骨・尺骨、球節は中手骨・繋骨・近位種子骨。後肢・腱・靱帯には触れていない。
- tests（試験）: M1。
  - KNOWN_HIDDEN_MARKERS は変わっていない（reachability.test.ts と overlap.test.ts の差分は 0 行）。
  - overlap / reachability / marker-reachable / pbi220 / search の 5 ファイル 895 件が通過。reachability の詳細出力には関節の試験例が 24 件ある（右側望の反転も含む）。
  - 小さい部位が選べなくならないこと: 当たり判定は面積の小さい順（`src/core/hit-test.ts:53`）。種子骨 1344 < 球節 1760 なので重なり部分は種子骨が勝つ。管骨の上の小骨 1056 も同様。種子骨の点 (606,1008) は球節の多角形の中にあるが、点の当たり判定が先に効く。球節の点 (608,978) は種子骨にも管骨の上の小骨にも入っていない。腕節・膝蓋骨・足根骨は関節の多角形と重ならない。
  - `pnpm derive:left` を 2 回実行し、どちらも left.json の sha256 が c41bb0f4…771e4 になった。コミット済みのファイルとバイト単位で一致し、git status も空。
  - baseline.json の差分は、ids の 3 件追加、structuralMetadata の 3 件追加、otherStructuresSha256、geometrySha256 の left.json の 4 か所だけ。ほかのキーと、既存の ids・structuralMetadata は変わっていない。
  - #220 試験と同じ方法（review.rows を除いた STRUCTURES を JSON.stringify して sha256）で計算し直した。全件では 83eb38e6…（新しい値と一致）、joint-* を除くと d4153a31…（元の値と一致）。追加した3件以外は変わっていないことが確かめられた。
- body vs diff（PR 本文と差分の突き合わせ）: 0件。指定の 5body.md は無かったので、指示どおり確かめていない。代わりにコミットメッセージ（aa4b005）を読み、差分と食い違いが無いことを確かめた。
- evidence（証跡）: N2。
  - 3つの多角形を `assets/anatomy/skeleton_left.jpg` に PIL で重ねて目で見た。肩関節は肩端の関節窩と上腕骨頭、肘関節は上腕骨の遠位と橈骨の近位および肘頭の膨らみ、球節（前肢）は前肢の球節の膨らみを覆っていて、どれも絵に合っている。
  - 2人目の判定の中心 (557,510)・(617,645)・(610,996) はどれも対応する多角形の中にある。
  - 球節の点 (608,978) は関節線より少し上の、管骨の遠位にある。種子骨と重ならないための選択で、理由は LABEL_AT のコメントに書いてある。
  - Android 実機の証跡は DEVICE 項目なので、この判定には含めていない。
- 解説文: 0件。ja・en・latin・summary・body・function を読んだ。
  - 肩関節: Articulatio humeri。主に屈伸し、横方向の動きはほとんど無い。
  - 肘関節: Articulatio cubiti。蝶番関節で、肘頭が伸筋のてこになる。
  - 球節: Articulatio metacarpophalangea。第3中手骨・基節骨・近位種子骨でできる関節で、繋靱帯と屈腱が支える。
  - どれも標準的な獣医解剖の内容で、作った解剖は無い。文も短い。
- 秘密情報・金額・ほかの案件・私的な情報: 0件。png を除く差分を、URL・@・token・secret・password・円・ほかのリポジトリ名・個人名・/home・/tmp で grep した。png のテキスト chunk も確かめた。スクショはアプリの画面だけで、URL バーは写っていない。


</details>

REVIEW | reviewer: general-purpose, opus 5.5 medium | authored no commit on this PR | head e6fd19a6aa921b7e670e38f400002853df946315 | axes: pass line, design, scope, tests, body vs diff, evidence | verdict PASS | must 0 want 1 nit 4

対象: feat/5-joints-left-draft e6fd19a（前回 61538b2 からの差分は1コミット e6fd19a、8ファイル +27/-21）。base develop 8dbfb31、今の origin/develop は e7c380f。確認日時 2026-11-14 13:20 UTC。
前回のレビュー（61538b2、FAIL、must 1 want 2 nit 4）を先に読み、指摘ごとに確かめた。
一時的な detached worktree で `pnpm install --frozen-lockfile --offline` を実行した（rc=0）。確認後に `git worktree remove` で消し、`git worktree list` に残っていないことも確かめた。Playwright と e2e は実行していない（`--list` も使っていない）。

## 前回の指摘の確認

- M1 済み: `e2e/legacy-cannon-search.spec.ts:3,17`
  - 待ち条件が `not.toHaveText(\`${STRUCTURES.length} 部位\` / \`... parts\`)` になった。
  - `catalog-count` の文字は `{rows.length} {t('catalog.countUnit')}`（`src/app/(tabs)/catalog/index.tsx:100-102`）。単位は ja「部位」、en「parts」（`src/core/i18n/messages.ts:307,78`）なので、文字の形も一致している。
  - 絞り込む前の一覧は全件の 90（v02 S07 が `${TOTAL} 部位` で確かめている）。そのため、検索が反映されるまでこの条件は通らない。これで待ちの意味が戻り、何も確かめずに通ってしまう状態は無くなった。
  - `../src/core/data` を import するやり方は、ほかの e2e 9 本と同じ。
- W1 済み: `src/core/data/structures.ts:1085,1097,1109` が `['left','right']` になった。
  - baseline の structuralMetadata 3 件も `["left","right"]` に揃っている（`doc/review/2026-10-25-pbi-220-names/baseline.json:941-962`）。
  - otherStructuresSha256 は d556fac8…b2ba。下の tests 欄で、#220 の試験と同じ方法で計算し直した。
- W2 ほぼ済み: README.md:63-68,80,92,247-248,273 と、doc/handoff.md:11-12,58 を更新した。どの件数もデータと一致している（下の evidence 欄）。残りは N1 に書いた。
- N1 済み: `e2e/v02-web-run.spec.ts:129` の試験名を「全部位」にした。`doc/test-spec-2026-11.md:31` も `STRUCTURES.length` を正とする書き方にした。
- N3 済み: `src/core/data/kana.ts:137-138` に `'joint-elbow': ['ちゅうかんせつ']` を足した。手元で `filterStructures` に通し、次の5つがどれも joint-elbow だけを返すことを確かめた: ちゅうかんせつ・ちゅうかん・ひじかんせつ・肘関節・chuukansetsu。
- N2: 前回も直す必要なしとしたもの。今回も変わっていない。
- N4（bone-ulna）: 指示どおり手を付けていない。別 Issue にする扱いでよい。

## want

W1. PR 本文の下書き（5body.md）が e6fd19a に合っていない。PR を作る前に直す必要がある。
- 5body.md:3「head は 61538b2」を e6fd19a にする。元にした develop の 8dbfb31 は今も merge-base なので正しい。ただ、今の develop は e7c380f で、それとも競合なしにマージできることを書き足すとよい。
- 5body.md:43「e2e 274 件が合格」は 61538b2 で測った値。e6fd19a では e2e の spec 2 本（legacy-cannon-search の待ち条件、v02 の試験名）と、右側望に出る部位が変わった。e2e をもう一度流すか、「274 件合格は 61538b2 で計測。e6fd19a では未実行」と書く。
- views の変更を書いていない。関節3つを `['left','right']` にした（右側望は左の図形を反転して出す）こと、それに合わせて baseline の views と otherStructuresSha256 を直したことを足す。
- 変えたファイルの一覧（5body.md:27-33）に、次のものが無い:
  - `e2e/legacy-cannon-search.spec.ts`（件数の直書きを `STRUCTURES.length` にした）
  - `e2e/v02-web-run.spec.ts`・`doc/test-spec-2026-11.md`（87 を外した）
  - `README.md`・`doc/handoff.md`（件数の更新）
  - `kana.ts` の別名「ちゅうかんせつ」。今は「名前と説明を足した」にまとめられている。
- 5body.md:39,42 の件数（left 84/88・全体 122・単体 1438）は、e6fd19a でも同じ値だった。直さなくてよい。

## nit

N1. `doc/handoff.md:110` の #5 の行は「腱・靱帯・関節・蹄内部 → 新しい絵と座標が要る」のまま。前回の W2 で挙げた行で、今回の差分には入っていない。
- 前肢の関節3つは、今ある絵の上に下書きで入った。
- 「関節（前肢の肩・肘・球節は下書きで済。ほかは絵が要る）」のように分けて書くと、読み手が誤らない。

N2. `src/core/data/kana.ts:131,137-138` の別名の置き場所。
- `joint-elbow` の別名が、見出しコメント「#220: 変更前の読みと、原典で支持されたウマの同義名の読み…」の下に入っている。#220 とは関係が無い。
- 単体試験で「ちゅうかんせつ」を引く1行も無い。`search.test.ts` に1件足すと、別名が消えたときに気づける。

N3. `doc/handoff.md:12` の「2026-11-14 時点で 単体 1438 件 / e2e 274 件」の書き方。
- e6fd19a の e2e の差分は、試験名1つの変更と、待ち条件の式1つだけ。試験の数を増減する変更ではない。
- e2e に、データから試験を作るループも無い（`STRUCTURES`・`GEOMETRY` の使われ方を grep で確かめた）。なので件数そのものは今も正しい見込み（未確認。Playwright を流していないため）。
- ただ、測った head が書かれていない。「（61538b2 で計測）」と添えると正直になる。この行は件数を書いた行で、合格を言い切ってはいないので、want にはしない。

N4. 右側望の画面の証跡が無い。
- e6fd19a で、右側望にも関節3つが出るようになった（画面の変更）。一方、`doc/evidence/5-joints/` は左側望の画像だけ。
- 右側望の図形は計算で反転して作っていて、reachability 試験が右側望の関節でも通っている。そのため、実際に困る点は小さい。AGENTS.md の「直した画面の前後を撮る」に合わせるなら、右側望の骨格を前後1枚ずつ撮る。

## 軸ごと

- pass line（通過条件）: 0件。must は 0 件。
  - `pnpm type-check` rc=0
  - `pnpm lint` rc=0
  - `pnpm test` 51 ファイル / 1438 件すべて通過
  - `pnpm validate:coords` rc=0
    - left 配置済み 84 / 対象 88（未配置 5、下書き 78）
    - front 28/29（下書き 25）
    - rear 10/10（下書き 8）
    - 配置済み 122 件、すべて馬体の上
  - `git merge-tree --write-tree e7c380f e6fd19a` rc=0、競合なし（tree 6befb9d）。
    - develop 側の変更は 6 ファイル（#307）。e2e/v02・catalog-not-learned の MASTERY_KEY などで、この PR の行とは重ならない。
    - マージ後の tree でも type-check rc=0、lint rc=0、test 1438 件通過、座標ゲート OK。
    - マージ後の e2e・src・test-spec に「87」の直書きは残っていない（zoom.test の座標の 87 は件数ではない）。
- design（設計）: 0件。
  - views を左右両方にしたのは、周りの前肢の骨と同じ扱いで正しい。
  - 関節3つの左側望の図形（left.json）は、前回から変わっていない（`git diff 61538b2 e6fd19a -- src/core/data/regions scripts` は空）。
- scope（範囲）: 0件。差分は前回の指摘への対応だけで、ほかの部位・層には触れていない。
- tests（試験）: 0件（N2 は nit）。
  - #220 の試験（`scripts/pbi220-names.test.ts:20`）と同じ方法で計算し直した。STRUCTURES から review.rows の id を除き、JSON.stringify して sha256 を取る。
    - 今の値は d556fac821589f9f269ce881f46f4a807a52e627529b95c2bbe56b0a7df5b2ba で、baseline と一致した。
    - 関節3つの views だけを `['left']` に戻すと 83eb38e6…1702 になり、前の baseline と一致した。
    - なので、STRUCTURES で変わったのは関節3つの views だけ。kana は STRUCTURES の外にある。
  - baseline.json の差分は、views 3 か所と otherStructuresSha256 の 1 行だけ。
  - 右側望の反転を確かめた。GEOMETRY.right の関節の labelAt と頂点は、どれも x' = 1600 − x、y はそのまま（size は 1600×1200）。
    - joint-shoulder: (558,515)→(1042,515)
    - joint-elbow: (632,632)→(968,632)
    - joint-fetlock-fore: (608,978)→(992,978)
    - 頂点も同じ式で、たとえば (524,492)→(1076,492)。
  - reachability・overlap・marker-reachable・pbi220 の 4 ファイル、865 件が通過。
    - reachability の詳細出力には、`right/skeleton/joint-*` の試験例が 12 件ある（3 部位 × 4 種類）。どれも通過。
    - overlap.test は VIEWS に right を含み（`src/core/data/overlap.test.ts:31`）、right の 3 種類も通過。
  - KNOWN_HIDDEN_MARKERS は変わっていない。
- body vs diff（PR 本文と差分の突き合わせ）: W1。
- evidence（証跡）: N1・N3・N4。README と handoff の件数は、データから数え直してすべて一致した。
  - STRUCTURES は 90 件（skin 30・muscle 21・skeleton 29・organs 10）。
  - left.json の図形は 84 件。内訳は skin 30（うち実測 6）・muscle 17・skeleton 29・organs 8。大まかな場所は 6。
  - 左側望の対象は 88 件で、置けているのは 83 件。置けていない 5 件は次のとおりで、README の表と一致する: 棘上筋・棘下筋・腸腰筋・鎖骨下筋・膀胱。
  - 下書きは 78+25+8=111、実測は 122−111=11。
  - 単体 1438 件。
- 秘密情報・ほかの案件・私的な情報: 0件。前回からの差分（png は無い）に、URL・鍵・個人名・/home・/tmp は含まれていない。


LOCAL-CHECK | head e6fd19a6aa921b7e670e38f400002853df946315 | node scripts/check-agent-entrypoints.mjs && node --test .github/ci/run.test.mjs && node .github/ci/run.mjs checks && pnpm build && node .github/ci/run.mjs e2e | pass: entrypoints OK・run.test 10/0・unit 1438・build OK・e2e 274 / fail 0・作業ツリー変更 0 | 2026-11-14T14:20Z

ローカルで通れば通ったと見なす（所有者の決定）。hosted CI が緑とは書かない。

GATE | head e6fd19a6aa921b7e670e38f400002853df946315 | review このコメントの中の REVIEW: e6fd19a（PASS、must 0） | evidence https://github.com/kouiso/equus-anatomy/blob/d0384ed9aabd1a313b8711505039d44e480be3e0/evidence/312-e6fd19a.png | checks local（上の LOCAL-CHECK） | deploy no production deploy（develop へ） | repo rule met（未解決のレビューのスレッド 0。2 人が別々に出した関節の中心が一致した物だけ。判断役の決定で、下書きのデータだけの PR は Android の画像なしで develop へ。実機は #314 の行 2） | changed after pass: なし

---
_Generated by [Claude Code](https://claude.ai/code)_
