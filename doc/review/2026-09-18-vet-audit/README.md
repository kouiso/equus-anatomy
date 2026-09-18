# 獣医レビュー用パッケージ（2026-09-18・第2版）

馬体解剖アプリ equus-anatomy の全52部位を獣医師に確認してもらうための資料。
AIが獣医学知見を「100%正しい」前提で監査・作り込んだ上で、人間の獣医に最終確認を仰ぐためのもの。

## 監査の経緯（なぜ第2版か）

- 第1ラウンド: 担当AI（Devin）が52部位を自力監査 → 7件修正
- 第2ラウンド: 独立AI（Fable/Claude）が**修正結果を見ずに**同じ全データを盲目監査 → 確定誤り14件・要確認11件
- 敵対照合: 2つの見解を突き合わせ、採否を裁定 → **計19件修正**（第1ラウンド7件 + 第2ラウンド12件採用）
- 独立AIの指摘で発覚した最大の欠陥: `views`（掲載向き）が部位一覧と計数には効いていたが**図への描画には効いていなかった**。脾臓・胃を左限定に直しても、右側望の図形には描き続けていた。描画フィルタ自体を修正済み（`src/app/(tabs)/index.tsx`）

## この資料の読み方

1. 「AIが修正した項目」— AI監査2ラウンドで確定誤りとして直した箇所。妥当か確認してほしい
2. 「獣医に判断を仰ぐ項目」— AIが確定できず、触らなかった箇所。ここが本体
3. 「全部位一覧」— 名称・区分・掲載向き・配置状況の全件台帳
4. 「座標の信頼度」— どの座標が実測で、どれがAI下書きか

## AIが修正した項目（確定誤り・計19件）

### 第1ラウンド（Devin自力監査・7件）

| # | 部位 | 修正前 → 修正後 | 根拠 |
|---|---|---|---|
| 1 | 板状筋 | `nameJa: 脾状筋（頭）` → `板状筋` | 「脾状筋」は誤字（脾=脾臓）。M. splenius の和名は板状筋（頭板状筋・頸板状筋） |
| 2 | 管 | `nameLa: Cannon` → `Metacarpus` | Cannon は英語。ラテン語は Metacarpus（中手骨部）。体表部位名としては Regio metacarpalis も候補（要確認#3参照） |
| 3 | 脾臓 | `views: left,right` → `left` | 脾臓は左側のみの臓器。反転した右側望に出すと存在しない側に描くことになる。本文も「左側の腹腔に位置」と記述しており自己矛盾していた |
| 4 | 胃 | `views: left,right` → `left` | 胃の主体は左側（幽門部のみ正中を越える）。標準図譜も左側望での描画が標準。本文も「主に左側」 |
| 5 | 盲腸 | `views: left,right` → `right` | 盲腸は右側のみの臓器。本文も「右側の腹腔に位置」。右側望の図が未整備のため位置は未登録のまま |
| 6 | 膀胱 | `region: 腹腔` → `骨盤腔` | 本文が「骨盤腔の腹側に位置」と記述。region 区分と本文が矛盾していた |
| 7 | 尻 | 本文「尾根」→「尾の付け根」 | 「尾根」は山の稜線を指す語で曖昧。尾根部/尾の付け根が解剖学的な表現 |

### 第2ラウンド（Fable盲目監査・採用12件）

| # | 部位 | 修正前 → 修正後 | 根拠 |
|---|---|---|---|
| 8 | 肝臓 | `views: left,right` → `right` | 解説自身が「主に右側」と明言。左右反転表示だと両側に同じ形で出て側性が消える。胃（左限定）と同じ「主体がある側」規則で右限定に。左側望計測の図形は右側望の反転表示にのみ使用 |
| 9 | 鬐甲 | `nameLa: Withers` → `Regio interscapularis` | Withers は英語。NAV の該当領域名は肩甲間部 Regio interscapularis |
| 10 | 尻 | `nameLa: Croup` → `Regio glutea` | Croup も英/仏語。臀部領域名を代用（厳密一致ではない旨は要確認#2へ残す） |
| 11 | 脾臓 | `nameLa: Lien` → `Splen` | NAV の主表記は Splen（Lien は旧来の別名扱い） |
| 12 | 盲腸 | `nameLa: Cecum` → `Caecum` | NAV 綴りは Caecum |
| 13 | 大結腸 | `nameLa: Colon` → `Colon ascendens` | Colon 単独だと小結腸（Colon descendens）を含む。大結腸は Colon ascendens |
| 14 | 仙骨 | `nameLa: Sacrum` → `Os sacrum` | NAV 正式形は Os sacrum |
| 15 | 胸筋 | `nameLa: M. pectoralis` → `Mm. pectorales` | 本文が「浅胸筋と深胸筋の総称」。群なら複数形が整合的 |
| 16 | 胸前 | `nameLa: Pectus` → `Regio pectoralis` | 領域名として使うなら NAV は Regio pectoralis |
| 17 | 骨盤 | 本文「腸骨・坐骨・恥骨が癒合した骨」→「左右の寛骨（腸骨・坐骨・恥骨の癒合骨）と仙骨が作る骨盤帯」 | 原文は単一の寛骨 Os coxae の説明。Pelvis は左右寛骨+仙骨の骨盤帯で単一骨ではない |
| 18 | 中手骨 | 本文「その**背側**に伴います」→「**掌側**」 | 副管骨（第2・4中手骨）は第3中手骨の掌側に沿う。背側は伸筋腱側で真逆だった |
| 19 | 心臓 | 本文「胸腔の**中隔**」→「**縦隔**」 | 中隔=septum、縦隔=mediastinum。心臓が位置するのは縦隔 |
| 20 | 大結腸 | 本文「右背側結腸などの屈曲部」→「骨盤曲は食滞の好発部位で、右背側結腸から横行結腸への移行部は内腔が狭まる」 | 右背側結腸は屈曲部ではなく結腸の一区分。屈曲部は胸骨曲・横隔曲・骨盤曲 |
| 21 | 橈側手根伸筋 | 本文「腕節（膝に相当）」→「腕節（人の手首に相当）」 | 腕節=手根=人の手首。「膝」は膝関節(stifle)を指す骨盤側の記述と二義になっていた |
| 22 | 中殿筋 | `nameJa: 中臀筋` → `中殿筋`、summary「大臀筋」→「最大の殿筋」 | 和名と概要が矛盾（中臀 vs 大臀）。馬で最大の殿筋は中殿筋。用字も殿に統一（他部位と整合） |
| 23 | 腕頭筋 | `function: 頭頸屈曲` → `頭頸の側屈` | 片側収縮は頸の側屈、両側収縮で頭頸を引き下げる。「屈曲」だと腹屈と誤読される |
| 24 | 棘下筋 | 本文「腱が骨化したり」→「腱炎や腱下滑液包の炎症」 | 臨床で定番なのは棘下筋腱下滑液包炎。腱の骨化は一般記載ではない |
| 25 | 棘上筋 | 本文「肩関節を外側から安定」→「内外両側から安定」 | 棘上筋腱は大結節・小結節の両方へ分岐し内外両側から支える |
| 26 | 小腸 | 本文「間膜」→「腸間膜」 | 用字の精度 |
| 27 | 腓腹筋 | 本文「総踵骨腱」→「総踵腱」 | 用字の精度 |
| 28 | 肩甲骨 | 本文「背面の棘」→「外側面の肩甲棘」 | 肩甲棘は肩甲骨の外側面にある。背面ではない |
| 29 | 骨盤・膀胱 | 本文「雌馬」「雄馬」→「牝馬」「牡馬」 | 馬は牝馬・牡馬。一般動物用字が混入していた |

（#17〜29は第2ラウンドの細目を含むため番号は通し）

### コード修正（データではなく表示制御）

| # | 場所 | 内容 |
|---|---|---|
| 30 | `src/app/(tabs)/index.tsx` | `views` を図の描画フィルタへ組み込み（従来は部位一覧・計数のみ）。脾臓・胃・肝臓が反対側の図に出続ける欠陥を根治 |
| 31 | `src/core/data/coverage.test.ts` | 左側望の期待数 51→50、肝臓の右限定を非対称性テストへ追加 |

## 獣医に判断を仰ぐ項目（AIは触っていない・計12項目）

| # | 部位 | 論点 | AI側の見解 |
|---|---|---|---|
| 1 | 鬐甲 | `Regio interscapularis`（肩甲間部）を採用したが、鬐甲と厳密一致かは要確認 | 鞍後方の棘突起隆起と肩甲間部の範囲差を教えてほしい |
| 2 | 尻 | `Regio glutea` を採用したがクループ（尾根部〜仙骨部の外貌）と厳密一致ではない可能性 | `Regio sacralis` 併記や別表現が適切か |
| 3 | 管 | `Metacarpus` でよいか、体表部位として `Regio metacarpalis` が適切か | 学習アプリの部位名として Metacarpus を採用中 |
| 4 | 鬐甲の本文 | 「第2〜10胸椎の棘突起」 | 出典で幅がある（T2–T9系/T3–T11系）。どちらの文献に合わせるか |
| 5 | 腎臓 | `region: 腹腔` | 腎臓は後腹膜腔（retroperitoneal）の臓器。アプリの粗い区分では腹腔に含めたが、厳密には別 |
| 6 | 腎臓の左右差 | 本文「右腎は最後肋骨の下、左腎はやや後方」という前後差が反転表示では再現できない | 左右で描き分けるか本文を緩めるか（右側専用図の話と連動） |
| 7 | 肺 | 本文「聴診野は肩甲骨後縁から最後肋骨まで広がる」 | 肺の尾側境界は第16〜17肋間程度で「最後肋骨（第18肋）まで」はやや広い表現。許容か |
| 8 | 小腸の掲載向き | `views: left,right` のまま | 右腹部は盲腸が占め、小腸は主に左背側〜尾側。右側望に小腸を大きく出すと盲腸の説明と矛盾しないか |
| 9 | 大結腸の掲載向き | `views: left,right` のまま | 大結腸は両側に広がる臓器だが、左=左腹背側結腸・骨盤曲、右=右腹背側結腸と区分が違う。同じ形を両側に出すことの許容度 |
| 10 | 中手骨 | `Os metacarpale III`・和名「中手骨」は前肢のみを指す | 後肢の中足骨（Os metatarsale III）は別部位として未収録。分けて収録すべきか |
| 11 | 区分境界 | 肩甲骨・僧帽筋は「前躯」、棘上筋・棘下筋・三角筋は「前肢」。大腿二頭筋は「後肢」、中殿筋は「後躯」 | 同じ肩帯・寛骨まわりが別区分に割れている。境界ルールを1本決めたい（肢帯=躯/自由肢=肢 等） |
| 12 | 右側望全体 | 右側望は左側望画像の左右反転で代用。右側独自の解剖（盲腸・肝右葉・右腎の頭側位置など）を表現できない | 商用レベルでは右側専用の図が必要か。現状は反転である旨を画面に明示済み |

## 配置（座標）の信頼度

| 向き | 実測（measured） | 下書き（draft） | 未配置 |
|---|---|---|---|
| 左側望 | 6件 | 40件 | 5件（深層筋4・膀胱1）。肝臓の図形は残すが左側望では非表示（右側望反転用） |
| 正面 | 3件 | 19件 | 1件（鎖骨下筋） |
| 後面 | 2件 | 8件 | 0件 |
| 右側望 | （左側望の反転で代用） | | |

- `measured` = 元アプリの画像上で実測した座標。それでも獣医による位置確認は未実施
- `draft` = AIが計測した下書き。skin-hoofのみAI測定+Fable相互確認済み、他は獣医確認前
- 未配置の理由は `src/core/data/coverage.test.ts` に固定済み（図が存在しない/判別不能は無理に置かない方針）

## 全部位一覧（52件）

| id | 和名 | ラテン語 | 英語 | 区分 | 掲載向き | 配置状況 |
|---|---|---|---|---|---|---|
| skin-head | 頭部 | Caput | Head | 頭部 | left,right,front | left:measured,front:measured |
| skin-ear | 耳介 | Auricula | Ear | 頭部 | left,right | left:measured |
| skin-neck | 頸 | Collum | Neck | 頸部 | left,right,front | left:measured,front:draft |
| skin-withers | 鬐甲 | Regio interscapularis | Withers | 前躯 | left,right | left:draft |
| skin-back | 背 | Dorsum | Back | 体幹 | left,right | left:draft |
| skin-croup | 尻 | Regio glutea | Croup | 後躯 | left,right,rear | left:draft,rear:draft |
| skin-tail | 尾 | Cauda | Tail | 尾 | left,right,rear | left:measured,rear:measured |
| skin-chest | 胸前 | Regio pectoralis | Chest | 前躯 | left,right,front | left:draft,front:draft |
| skin-cannon | 管 | Metacarpus | Cannon | 前肢 | left,right,front | left:measured,front:measured |
| skin-hoof | 蹄 | Ungula | Hoof | 前肢 | left,right,front | left:draft,front:measured |
| skin-hock | 飛節 | Tarsus | Hock | 後肢 | left,right,rear | left:measured,rear:measured |
| muscle-masseter | 咬筋 | M. masseter | Masseter | 頭部 | left,right,front | left:draft,front:draft |
| muscle-brachiocephalicus | 腕頭筋 | M. brachiocephalicus | Brachiocephalicus | 頸部 | left,right,front | left:draft,front:draft |
| muscle-trapezius | 僧帽筋 | M. trapezius | Trapezius | 前躯 | left,right | left:draft |
| muscle-triceps | 上腕三頭筋 | M. triceps brachii | Triceps | 前肢 | left,right,front | left:draft,front:draft |
| muscle-latissimus | 広背筋 | M. latissimus dorsi | Latissimus dorsi | 体幹 | left,right | left:draft |
| muscle-oblique | 外腹斜筋 | M. obliquus externus abdominis | External oblique | 体幹 | left,right | left:draft |
| muscle-gluteus | 中殿筋 | M. gluteus medius | Middle gluteal | 後躯 | left,right,rear | left:draft,rear:draft |
| muscle-biceps-femoris | 大腿二頭筋 | M. biceps femoris | Biceps femoris | 後肢 | left,right,rear | left:draft,rear:draft |
| muscle-gastrocnemius | 腓腹筋 | M. gastrocnemius | Gastrocnemius | 後肢 | left,right,rear | left:draft,rear:draft |
| muscle-ecr | 橈側手根伸筋 | M. extensor carpi radialis | Extensor carpi radialis | 前肢 | left,right,front | left:draft,front:draft |
| muscle-supraspinatus | 棘上筋 | M. supraspinatus | Supraspinatus | 前肢 | left,right | 未配置（深層筋の図なし） |
| muscle-infraspinatus | 棘下筋 | M. infraspinatus | Infraspinatus | 前肢 | left,right | 未配置（深層筋の図なし） |
| muscle-iliopsoas | 腸腰筋 | M. iliopsoas | Iliopsoas | 体幹 | left,right | 未配置（深層筋の図なし） |
| muscle-subclavius | 鎖骨下筋（馬） | M. subclavius | Subclavius | 前躯 | left,right,front | 未配置（深層筋の図なし） |
| bone-skull | 頭蓋 | Cranium | Skull | 頭部 | left,right,front | left:draft,front:draft |
| bone-cervical | 頸椎 | Vertebrae cervicales | Cervical vertebrae | 頸部 | left,right,front | left:draft,front:draft |
| bone-scapula | 肩甲骨 | Scapula | Scapula | 前躯 | left,right,front | left:draft,front:draft |
| bone-humerus | 上腕骨 | Humerus | Humerus | 前肢 | left,right,front | left:draft,front:draft |
| bone-ribs | 肋骨 | Costae | Ribs | 体幹 | left,right,front | left:draft,front:draft |
| bone-lumbar | 腰椎 | Vertebrae lumbales | Lumbar vertebrae | 体幹 | left,right | left:draft |
| bone-pelvis | 骨盤 | Pelvis | Pelvis | 後躯 | left,right,rear | left:draft,rear:draft |
| bone-femur | 大腿骨 | Femur | Femur | 後肢 | left,right,rear | left:draft,rear:draft |
| bone-tibia | 脛骨 | Tibia | Tibia | 後肢 | left,right,rear | left:draft,rear:draft |
| bone-cannon | 中手骨 | Os metacarpale III | Cannon bone | 前肢 | left,right,front | left:draft,front:draft |
| organ-heart | 心臓 | Cor | Heart | 胸腔 | left,right,front | left:draft,front:draft |
| organ-lung | 肺 | Pulmo | Lung | 胸腔 | left,right,front | left:draft,front:draft |
| organ-stomach | 胃 | Ventriculus | Stomach | 腹腔 | left | left:draft |
| organ-liver | 肝臓 | Hepar | Liver | 腹腔 | right | right:反転表示（左計測図形） |
| organ-spleen | 脾臓 | Splen | Spleen | 腹腔 | left | left:draft |
| organ-intestine | 小腸 | Intestinum tenue | Small intestine | 腹腔 | left,right | left:draft |
| organ-colon | 大結腸 | Colon ascendens | Large colon | 腹腔 | left,right | left:draft |
| organ-cecum | 盲腸 | Caecum | Cecum | 腹腔 | right | 未配置（右側の図なし） |
| organ-kidney | 腎臓 | Ren | Kidney | 腹腔 | left,right | left:draft |
| muscle-pectoral | 胸筋 | Mm. pectorales | Pectorals | 前躯 | left,right,front | left:draft,front:draft |
| muscle-splenius | 板状筋 | M. splenius | Splenius | 頸部 | left,right | left:draft |
| muscle-deltoid | 三角筋 | M. deltoideus | Deltoid | 前肢 | left,right,front | left:draft,front:draft |
| bone-mandible | 下顎骨 | Mandibula | Mandible | 頭部 | left,right,front | left:draft,front:draft |
| bone-radius | 橈骨 | Radius | Radius | 前肢 | left,right,front | left:draft,front:draft |
| bone-sacrum | 仙骨 | Os sacrum | Sacrum | 後躯 | left,right,rear | left:draft,rear:draft |
| bone-sternum | 胸骨 | Sternum | Sternum | 前躯 | left,right,front | left:draft,front:draft |
| organ-bladder | 膀胱 | Vesica urinaria | Bladder | 骨盤腔 | left,right | 未配置（図上で判別不能） |

## 関連資料

- `doc/review/2026-09-17-skin-hoof/` — 蹄の座標修正の相互確認記録（AI測定→Fable反論→最終形）
- `doc/review/2026-09-18-self-review/` — 今回の自己レビュー・プレモーテム・敵対討議の記録
- `src/core/data/coverage.test.ts` — 配置状況をテストで固定（静かな退行防止）
