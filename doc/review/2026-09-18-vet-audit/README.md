# 獣医レビュー用パッケージ（2026-09-18）

馬体解剖アプリ equus-anatomy の全52部位を獣医師に確認してもらうための資料。
AIが獣医学知見を「100%正しい」前提で監査・作り込んだ上で、人間の獣医に最終確認を仰ぐためのもの。

## この資料の読み方

1. 「AIが修正した項目」— AI監査で確定誤りとして直した箇所。妥当か確認してほしい
2. 「獣医に判断を仰ぐ項目」— AIが確定できず、触らなかった箇所。ここが本体
3. 「全部位一覧」— 名称・区分・掲載向き・配置状況の全件台帳
4. 「座標の信頼度」— どの座標が実測で、どれがAI下書きか

## AIが修正した項目（確定誤り）

| # | 部位 | 修正前 → 修正後 | 根拠 |
|---|---|---|---|
| 1 | 板状筋 | `nameJa: 脾状筋（頭）` → `板状筋` | 「脾状筋」は誤字（脾=脾臓）。M. splenius の和名は板状筋（頭板状筋・頸板状筋） |
| 2 | 管 | `nameLa: Cannon` → `Metacarpus` | Cannon は英語。ラテン語は Metacarpus（中手骨部）。体表部位名としては Regio metacarpalis も候補（要確認#3参照） |
| 3 | 脾臓 | `views: left,right` → `left` | 脾臓は左側のみの臓器。反転した右側望に出すと存在しない側に描くことになる。本文も「左側の腹腔に位置」と記述しており自己矛盾していた |
| 4 | 胃 | `views: left,right` → `left` | 胃の主体は左側（幽門部のみ正中を越える）。標準図譜も左側望での描画が標準。本文も「主に左側」 |
| 5 | 盲腸 | `views: left,right` → `right` | 盲腸は右側のみの臓器。本文も「右側の腹腔に位置」。右側望の図が未整備のため位置は未登録のまま |
| 6 | 膀胱 | `region: 腹腔` → `骨盤腔` | 本文が「骨盤腔の腹側に位置」と記述。region 区分と本文が矛盾していた |
| 7 | 尻 | 本文「尾根」→「尾の付け根」 | 「尾根」は山の稜線を指す語で曖昧。尾根部/尾の付け根が解剖学的な表現 |

## 獣医に判断を仰ぐ項目（AIは触っていない）

| # | 部位 | 論点 | AI側の見解 |
|---|---|---|---|
| 1 | 鬐甲 | `nameLa: Withers` は英語でありラテン語ではない。NAVに鬐甲の独立した術語が存在しない | 候補: `Regio interscapularis` または棘突起上の部位として記述。正しい表記を教えてほしい |
| 2 | 尻 | `nameLa: Croup` も同様に英語 | 候補: `Regio glutealis`（臀部）や `Regio sacralis`（仙骨部）では厳密にクループと一致しない |
| 3 | 管 | `Metacarpus` でよいか、体表部位として `Regio metacarpalis` が適切か | 学習アプリの部位名として Metacarpus を採用したが、獣医の推奨に従いたい |
| 4 | 肝臓 | 左側望に肝臓を描いているが、馬の肝臓は右優位（右葉が大きい）。左葉は正中を越えて左に達する | 左側望への掲載を維持した。左から見える範囲として妥当か、右側のみにすべきか判断を仰ぐ |
| 5 | 腎臓 | `region: 腹腔` | 腎臓は後腹膜腔（retroperitoneal）の臓器。アプリの粗い区分では腹腔に含めたが、厳密には別 |
| 6 | 肺 | 本文「聴診野は肩甲骨後縁から最後肋骨まで広がる」 | 肺の尾側境界は第16〜17肋間程度で「最後肋骨（第18肋）まで」はやや広い表現。許容か |
| 7 | 中手骨 | `Os metacarpale III`・和名「中手骨」は前肢のみを指す | 後肢の中足骨（Os metatarsale III）は別部位として未収録。分けて収録すべきか |
| 8 | 鎖骨下筋（馬） | `nameJa: 鎖骨下筋（馬）` の（馬）注記 | 馬は鎖骨を持たないが m. subclavius は存在する。注記の表現が適切か |
| 9 | 心尖・ボタン骨等の俗語 | 「ボタン骨」（第2・4中手骨）は俗名。学名は小中手骨/繫骨 | 学習アプリでの俗名併記の是非 |
| 10 | 右側望全体 | 右側望は左側望画像の左右反転で代用。右側独自の解剖（盲腸・肝右葉・右腎の頭側位置など）を表現できない | 商用レベルでは右側専用の図が必要か。現状は反転である旨を画面に明示済み |

## 配置（座標）の信頼度

| 向き | 実測（measured） | 下書き（draft） | 未配置 |
|---|---|---|---|
| 左側望 | 6件 | 40件 | 5件（深層筋4・膀胱1）+ 盲腸は対象外 |
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
| skin-withers | 鬐甲 | Withers | Withers | 前躯 | left,right | left:draft |
| skin-back | 背 | Dorsum | Back | 体幹 | left,right | left:draft |
| skin-croup | 尻 | Croup | Croup | 後躯 | left,right,rear | left:draft,rear:draft |
| skin-tail | 尾 | Cauda | Tail | 尾 | left,right,rear | left:measured,rear:measured |
| skin-chest | 胸前 | Pectus | Chest | 前躯 | left,right,front | left:draft,front:draft |
| skin-cannon | 管 | Metacarpus | Cannon | 前肢 | left,right,front | left:measured,front:measured |
| skin-hoof | 蹄 | Ungula | Hoof | 前肢 | left,right,front | left:draft,front:measured |
| skin-hock | 飛節 | Tarsus | Hock | 後肢 | left,right,rear | left:measured,rear:measured |
| muscle-masseter | 咬筋 | M. masseter | Masseter | 頭部 | left,right,front | left:draft,front:draft |
| muscle-brachiocephalicus | 腕頭筋 | M. brachiocephalicus | Brachiocephalicus | 頸部 | left,right,front | left:draft,front:draft |
| muscle-trapezius | 僧帽筋 | M. trapezius | Trapezius | 前躯 | left,right | left:draft |
| muscle-triceps | 上腕三頭筋 | M. triceps brachii | Triceps | 前肢 | left,right,front | left:draft,front:draft |
| muscle-latissimus | 広背筋 | M. latissimus dorsi | Latissimus dorsi | 体幹 | left,right | left:draft |
| muscle-oblique | 外腹斜筋 | M. obliquus externus abdominis | External oblique | 体幹 | left,right | left:draft |
| muscle-gluteus | 中臀筋 | M. gluteus medius | Middle gluteal | 後躯 | left,right,rear | left:draft,rear:draft |
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
| organ-liver | 肝臓 | Hepar | Liver | 腹腔 | left,right | left:draft |
| organ-spleen | 脾臓 | Lien | Spleen | 腹腔 | left | left:draft |
| organ-intestine | 小腸 | Intestinum tenue | Small intestine | 腹腔 | left,right | left:draft |
| organ-colon | 大結腸 | Colon | Large colon | 腹腔 | left,right | left:draft |
| organ-cecum | 盲腸 | Cecum | Cecum | 腹腔 | right | 未配置（右側の図なし） |
| organ-kidney | 腎臓 | Ren | Kidney | 腹腔 | left,right | left:draft |
| muscle-pectoral | 胸筋 | M. pectoralis | Pectorals | 前躯 | left,right,front | left:draft,front:draft |
| muscle-splenius | 板状筋 | M. splenius | Splenius | 頸部 | left,right | left:draft |
| muscle-deltoid | 三角筋 | M. deltoideus | Deltoid | 前肢 | left,right,front | left:draft,front:draft |
| bone-mandible | 下顎骨 | Mandibula | Mandible | 頭部 | left,right,front | left:draft,front:draft |
| bone-radius | 橈骨 | Radius | Radius | 前肢 | left,right,front | left:draft,front:draft |
| bone-sacrum | 仙骨 | Sacrum | Sacrum | 後躯 | left,right,rear | left:draft,rear:draft |
| bone-sternum | 胸骨 | Sternum | Sternum | 前躯 | left,right,front | left:draft,front:draft |
| organ-bladder | 膀胱 | Vesica urinaria | Bladder | 骨盤腔 | left,right | 未配置（図上で判別不能） |

## 関連資料

- `doc/review/2026-09-17-skin-hoof/` — 蹄の座標修正の相互確認記録（AI測定→Fable反論→最終形）
- `doc/review/2026-09-18-self-review/` — 今回の自己レビュー・プレモーテム・敵対討議の記録
- `src/core/data/coverage.test.ts` — 配置状況をテストで固定（静かな退行防止）
