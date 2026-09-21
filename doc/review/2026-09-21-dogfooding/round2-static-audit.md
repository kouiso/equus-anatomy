# 第2回 静的監査（dogfooding）

- 実施日: 2026-09-21
- 対象ブランチ: `devin/1789963516-dogfooding-review`
- 対象: `src/core/data/**`、`src/`、`app.json`、EAS/ビルド設定、`assets/`
- 前提: 第1回 `findings.md` / `content-audit.md` を先に読み、既知のF1〜F4・U1〜U4および既知の内容不足は新規Findingとして再掲しない。

## 結論（新規Finding）

| ID | severity | location | 概要 | ¥1000アプリへの影響 |
|---|---|---|---|---|
| R2-F1 | bug | `src/core/data/structures.ts` の各 `id` と `src/core/data/regions/{left,front,rear}.json` の部位集合 | 宣言された向きに図形が無い組合せが12件ある（完全な一覧は下記）。 | 図鑑から図へ進んだ購入者が、対象部位を表示できず「未登録」になる。教材の中核導線が欠ける。既知の第1回F2と重なる組合せを含むが、今回の監査では全件を再集計した。 |
| R2-F2 | risk | `src/core/data/regions/left.json`、`front.json`（右は `src/core/data/index.ts:79` で反転） | 同一 `view/layer` 内のポリゴン重なりが80%超の組合せを検出。左/右の皮膚（耳×頭）、正面の骨格（上腕骨×肋骨、橈骨×肋骨、肋骨×胸骨）。投影上の意図的な重なりの可能性はあるが、タップ判定の誤選択余地がある。 | 部位を押したのに別の部位が選ばれると、解剖教材としての信頼性を損なう。特に正面の骨格は重なりを個別確認すべき。 |
| R2-F3 | risk | `src/ui/persistence-controller.ts:121-124` | AsyncStorageの書き込み失敗を `catch(() => ...)` で受け、失敗理由・例外本文を破棄している。画面上のエラー状態は出るが、診断情報が残らない。 | 有料購入後に保存が不安定でも原因を切り分けられず、ユーザーの「覚えた」記録や保存部位の信頼性を回復しにくい。 |
| R2-F4 | risk | `src/ui/saved-key.ts:2`、`src/ui/mastery-key.ts:13`、各 `parse` | キー名は `v1` で版数を持つが、旧版からの migration 関数・未知フィールドの互換処理は無い。破損JSONは保留して再試行できる一方、将来の shape 変更時に移行経路が無い。 | アップデート時に学習履歴・保存部位を失うと、¥1000の継続利用価値を直接損なう。 |
| R2-F5 | risk | `app.json:5,22-35`、`scripts/patch-android-signing.ts:28-35`、`app.json` にURLなし | `versionCode` は `app.json` に無く、CI環境変数が無いとスクリプト既定値 `1`。またローカル/公開プライバシーポリシーはあるが、アプリ設定や公開ストアURLとしての設定値は無い。 | 更新版をPlayへ出す際の build number 衝突、審査・購入前の法務情報導線不足のリスク。 |
| R2-F6 | nit | `src/ui/error-boundary.tsx:31`、`src/ui/part-sheet.tsx:75`、`src/ui/bottom-nav.tsx:35`、`src/app/overlay.tsx:108,129,173`、`src/app/(tabs)/index.tsx:122-124` | 静的grepでは `Pressable` に明示的 `accessibilityLabel` が無い候補がある。ただし全件 `accessibilityRole` を持ち、子Textの可視文言が読み上げ名になる実装。固定ヒットターゲット44dp未満は検出されなかった。 | VoiceOver/TalkBackやWeb実装差で名前の解釈が変わる可能性があり、購入後のアクセシビリティ品質にばらつきが残る。 |

## 1. 52部位カタログ監査

判定は `function` フィールドが空でないか、`summary/body/note` に機能障害・傷病語または観察語があるかの静的語彙判定。機能52/52、傷病17/52、観察19/52。傷病件数自体は第1回内容監査の既知結果と重なるため、新規Findingにはしていない。

| id | name_ja | layer | declared views | geometry per view | function | injury | observation |
|---|---|---|---|---|---:|---:|---:|
| skin-head | 頭部 | skin | left,right,front | left=measured;right=measured;front=measured | 有 | 有 | 有 |
| skin-ear | 耳介 | skin | left,right | left=measured;right=measured | 有 | 無 | 無 |
| skin-neck | 頸 | skin | left,right,front | left=measured;right=measured;front=draft | 有 | 無 | 有 |
| skin-withers | 鬐甲 | skin | left,right | left=draft;right=draft | 有 | 有 | 無 |
| skin-back | 背 | skin | left,right | left=draft;right=draft | 有 | 有 | 有 |
| skin-croup | 尻 | skin | left,right,rear | left=draft;right=draft;rear=draft | 有 | 有 | 有 |
| skin-tail | 尾 | skin | left,right,rear | left=measured;right=measured;rear=measured | 有 | 有 | 有 |
| skin-chest | 胸前 | skin | left,right,front | left=draft;right=draft;front=draft | 有 | 無 | 無 |
| skin-cannon | 管 | skin | left,right,front | left=measured;right=measured;front=measured | 有 | 有 | 有 |
| skin-hoof | 蹄 | skin | left,right,front | left=draft;right=draft;front=measured | 有 | 有 | 有 |
| skin-hock | 飛節 | skin | left,right,rear | left=measured;right=measured;rear=measured | 有 | 有 | 無 |
| muscle-masseter | 咬筋 | muscle | left,right,front | left=draft;right=draft;front=draft | 有 | 無 | 無 |
| muscle-brachiocephalicus | 腕頭筋 | muscle | left,right,front | left=draft;right=draft;front=draft | 有 | 無 | 無 |
| muscle-trapezius | 僧帽筋 | muscle | left,right | left=draft;right=draft | 有 | 無 | 無 |
| muscle-triceps | 上腕三頭筋 | muscle | left,right,front | left=draft;right=draft;front=draft | 有 | 無 | 無 |
| muscle-latissimus | 広背筋 | muscle | left,right | left=draft;right=draft | 有 | 無 | 無 |
| muscle-oblique | 外腹斜筋 | muscle | left,right | left=draft;right=draft | 有 | 有 | 有 |
| muscle-gluteus | 中殿筋 | muscle | left,right,rear | left=draft;right=draft;rear=draft | 有 | 無 | 有 |
| muscle-biceps-femoris | 大腿二頭筋 | muscle | left,right,rear | left=draft;right=draft;rear=draft | 有 | 無 | 無 |
| muscle-gastrocnemius | 腓腹筋 | muscle | left,right,rear | left=draft;right=draft;rear=draft | 有 | 無 | 無 |
| muscle-ecr | 橈側手根伸筋 | muscle | left,right,front | left=draft;right=draft;front=draft | 有 | 無 | 無 |
| muscle-supraspinatus | 棘上筋 | muscle | left,right | left=none;right=none | 有 | 有 | 無 |
| muscle-infraspinatus | 棘下筋 | muscle | left,right | left=none;right=none | 有 | 有 | 無 |
| muscle-iliopsoas | 腸腰筋 | muscle | left,right | left=none;right=none | 有 | 無 | 無 |
| muscle-subclavius | 鎖骨下筋（馬） | muscle | left,right,front | left=none;right=none;front=none | 有 | 無 | 無 |
| bone-skull | 頭蓋 | skeleton | left,right,front | left=draft;right=draft;front=draft | 有 | 無 | 無 |
| bone-cervical | 頸椎 | skeleton | left,right,front | left=draft;right=draft;front=draft | 有 | 無 | 無 |
| bone-scapula | 肩甲骨 | skeleton | left,right,front | left=draft;right=draft;front=draft | 有 | 無 | 無 |
| bone-humerus | 上腕骨 | skeleton | left,right,front | left=draft;right=draft;front=draft | 有 | 無 | 無 |
| bone-ribs | 肋骨 | skeleton | left,right,front | left=draft;right=draft;front=draft | 有 | 無 | 有 |
| bone-lumbar | 腰椎 | skeleton | left,right | left=draft;right=draft | 有 | 無 | 無 |
| bone-pelvis | 骨盤 | skeleton | left,right,rear | left=draft;right=draft;rear=draft | 有 | 無 | 有 |
| bone-femur | 大腿骨 | skeleton | left,right,rear | left=draft;right=draft;rear=draft | 有 | 無 | 無 |
| bone-tibia | 脛骨 | skeleton | left,right,rear | left=draft;right=draft;rear=draft | 有 | 無 | 無 |
| bone-cannon | 中手骨 | skeleton | left,right,front | left=draft;right=draft;front=draft | 有 | 無 | 無 |
| organ-heart | 心臓 | organs | left,right,front | left=draft;right=draft;front=draft | 有 | 無 | 無 |
| organ-lung | 肺 | organs | left,right,front | left=draft;right=draft;front=draft | 有 | 無 | 無 |
| organ-stomach | 胃 | organs | left | left=draft | 有 | 有 | 無 |
| organ-liver | 肝臓 | organs | right | right=draft | 有 | 無 | 無 |
| organ-spleen | 脾臓 | organs | left | left=draft | 有 | 無 | 無 |
| organ-intestine | 小腸 | organs | left,right | left=draft;right=draft | 有 | 有 | 無 |
| organ-colon | 大結腸 | organs | left,right | left=draft;right=draft | 有 | 有 | 無 |
| organ-cecum | 盲腸 | organs | right | right=none | 有 | 無 | 有 |
| organ-kidney | 腎臓 | organs | left,right | left=draft;right=draft | 有 | 無 | 有 |
| muscle-pectoral | 胸筋 | muscle | left,right,front | left=draft;right=draft;front=draft | 有 | 無 | 有 |
| muscle-splenius | 板状筋 | muscle | left,right | left=draft;right=draft | 有 | 無 | 無 |
| muscle-deltoid | 三角筋 | muscle | left,right,front | left=draft;right=draft;front=draft | 有 | 有 | 有 |
| bone-mandible | 下顎骨 | skeleton | left,right,front | left=draft;right=draft;front=draft | 有 | 無 | 有 |
| bone-radius | 橈骨 | skeleton | left,right,front | left=draft;right=draft;front=draft | 有 | 無 | 無 |
| bone-sacrum | 仙骨 | skeleton | left,right,rear | left=draft;right=draft;rear=draft | 有 | 無 | 有 |
| bone-sternum | 胸骨 | skeleton | left,right,front | left=draft;right=draft;front=draft | 有 | 有 | 有 |
| organ-bladder | 膀胱 | organs | left,right | left=none;right=none | 有 | 有 | 有 |

### F2（宣言されたviewに図形が無い組合せ）全件

右側望は左側望のミラー生成なので、右側望の欠落も独立した宣言欠落として数えた。

| id | name_ja | view |
|---|---|---|
| muscle-supraspinatus | 棘上筋 | left |
| muscle-supraspinatus | 棘上筋 | right |
| muscle-infraspinatus | 棘下筋 | left |
| muscle-infraspinatus | 棘下筋 | right |
| muscle-iliopsoas | 腸腰筋 | left |
| muscle-iliopsoas | 腸腰筋 | right |
| muscle-subclavius | 鎖骨下筋（馬） | left |
| muscle-subclavius | 鎖骨下筋（馬） | right |
| muscle-subclavius | 鎖骨下筋（馬） | front |
| organ-cecum | 盲腸 | right |
| organ-bladder | 膀胱 | left |
| organ-bladder | 膀胱 | right |

既知の第1回F2に含まれる可能性がある項目を除外せず、今回の静的監査で得た全12組合せを掲載した。実装上の「位置未登録」表示は `src/app/(tabs)/index.tsx:115`、部位一覧の注記は `src/app/overlay.tsx:145-148` にある。

## 2. ジオメトリ／解剖学クロスチェック

- 座標系: JSONの画像ピクセル座標。画像サイズは左/右 `1600×1200`、正面 `520×1136`、後面 `560×1144`。重心は面積加重式、退化時のみ頂点平均。
- 右側望: `src/core/data/index.ts:79` の `mirror(LEFT)` で生成されるため、左の座標を `x -> width-x` して検査。左右の重心は鏡像一致した。
- viewの向きを考慮した大まかな解剖領域（左/右は体軸x、正面/後面は頭尾y）との照合で、明らかな異常配置の重心は0件。例: 左 `skin-head=(281.6,221.8)`、`bone-pelvis=(1230.6,420.5)`、正面 `bone-skull=(255.4,173.7)`、後面 `bone-tibia=(169.2,693.6)`。
- 124ポリゴンを検査し、3点未満0、自己交差0、完全な重複頂点0。
- labelAt/重心の画像外0件、短辺の4%以内0件。したがってこの項目の新規Findingは無し。

### R2-F2の重なり検出結果（8px格子近似、共有面積/小さい方）

| view | layer | polygons | ratio | 判定メモ |
|---|---|---|---:|---|
| left | skin | `skin-ear × skin-head` | 96.3% | 耳が頭部外形に含まれる設計か、輪郭の重複か要確認 |
| right | skin | `skin-ear × skin-head` | 96.3% | leftのミラーによる同一結果 |
| front | skeleton | `bone-humerus × bone-ribs` | 100.0% | 正面投影の重なりか、図形の取り違えか要確認 |
| front | skeleton | `bone-radius × bone-ribs` | 94.4% | 正面投影の重なりか、図形の取り違えか要確認 |
| front | skeleton | `bone-ribs × bone-sternum` | 100.0% | 正面投影の重なりか、図形の取り違えか要確認 |

既存テスト `src/core/data/overlap.test.ts:54-65` は筋同士のみ20%以下を要求し、`69-79` は肩甲骨×肋骨の投影重複を意図的に許している。今回の5件はその許容対象を超えて機械的に抽出したため、直ちに全件をバグ断定せず、正面骨格の部位境界とタップ優先順位を確認するリスクとして記録する。

## 3. ラベル／マーカー境界

`labelAt`（無い場合は重心）を画像サイズと比較した結果、画像外0件、各辺から4%以内0件。`src/core/data/marker-reachable.test.ts:19-43` のマーカー到達性テストも既存チェックに含まれる。新規Findingなし。

## 4. アクセシビリティ

`src/` の `Pressable`/Touchable系を静的走査した結果、roleもlabelも無いコントロールは0件。以下は明示labelが無いが、roleと可視子Textがある候補（R2-F6）。

| location | role | 可視名の根拠 | 固定サイズ |
|---|---|---|---|
| `src/ui/error-boundary.tsx:31-38` | button | `もう一度開く` | paddingのみ |
| `src/ui/part-sheet.tsx:75-77` | link | `図鑑で見る` | `pill.minHeight=44`（90） |
| `src/ui/bottom-nav.tsx:35-38` | tab | label変数（55でminHeight48） | 48 |
| `src/app/overlay.tsx:108-119,129-149,173-182` | button | area/part名・`この条件で表示` | button44/apply52（202-210） |
| `src/app/(tabs)/index.tsx:122-124` | button | `詳しく読む`・`部位一覧`・`表示条件` | `reselect.minHeight=44`（184-191） |

固定 `width/height/minWidth/minHeight` の44dp未満は検出0件。SVG markerは `src/ui/anatomy-canvas.tsx` の半径22実装で、実質44相当のタップ領域。

## 5. i18n／ハードコード文字列

- 翻訳ライブラリ／resource file は依存関係・`src/` に無く、日本語UIの固定文言（例: `src/app/(tabs)/catalog/index.tsx:15-35,100,123,147`、`src/app/overlay.tsx:73,127,165,181`）はTSXに直接記述されている。日本語専用アプリとしては動作バグではないが、将来の英語対応・文言一括修正・ストア文言監査を難しくするためR2-F6とは別の **risk/nit候補**。今回は既存要件が日本語UIであるため新規Findingには昇格しない。
- 層／向きは `LAYER_LABEL`（`catalog/index.tsx:35`）と `anatomy-state.ts:8-18` で日本語化され、raw `skin/muscle/skeleton/organs` や `left/right/front/rear` の漏出は検出しなかった。`nameLa/nameEn` と `EQUUS` は教育上意図された英語・ラテン語表示。

## 6. エラー／空状態

- カタログの検索・フィルター空結果: `src/app/(tabs)/catalog/index.tsx:145-148` に `見つかりませんでした。`。
- 保存一覧空状態: `src/app/(tabs)/saved.tsx:40-57` に読み込み中、空メッセージ、解剖図へ戻る導線。
- 条件に該当する部位なし: `src/app/overlay.tsx:127`。座標未登録の図: `src/ui/anatomy-canvas.tsx:277-280`。
- `src/app/_layout.tsx:24,38` のSplashScreen catchはOSスプラッシュのbest-effort処理で、UIを永久停止させない意図がコメントで明示されている。
- persistence write catch（`src/ui/persistence-controller.ts:121-124`）だけが例外本文を捨てるため、R2-F3として記録。読み込みcatchはread/corruptを分類し、バナーへ伝える。

## 7. 永続化

| 項目 | 結果 | 根拠 |
|---|---|---|
| Native storage | `@react-native-async-storage/async-storage` | `src/ui/saved-storage.ts:23-31`、`mastery-storage.ts:33-41` |
| Web storage | `localStorage` | `src/ui/saved-storage.web.ts`、`mastery-storage.web.ts` |
| キー | `equus.saved.v1` / `equus.mastery.v1` | `src/ui/saved-key.ts:2`、`mastery-key.ts:13` |
| 破損JSON | `CorruptPersistenceValue` → phase=`error`, problem=`corrupt`; 上書きせずバナーで再試行 | `saved-store.ts:8-15`、`mastery-store.ts:19-29`、`persistence-banner.tsx:74-80` |
| 書き込み失敗 | dirtyを維持しphase=`error`, problem=`write`; 例外本文は破棄 | `persistence-controller.ts:121-124` |
| migration | 明示的migrationなし | `v1`キーはあるが、旧shapeからの変換関数は見つからない |

## 8. app.json／EAS設定

- `orientation`: `portrait`（`app.json:6`）。Android package: `jp.co.ritmo.equusanatomy`（24）。
- icon/splash/adaptive icon/faviconのファイル指定あり（8,12-15,26-29,40）。対応ファイルも存在。
- `android.edgeToEdgeEnabled` の明示設定なし。SDK53+の既定ONについては `doc/test-spec-android.md:106` が検証項目としている。第1回のヘッダー問題を再掲せず、今回の設定監査結果として記録。
- version: `0.1.0`（5）。static versionCodeなし。`scripts/patch-android-signing.ts:28-35` で `ANDROID_VERSION_CODE` または既定`1`へパッチ。CIの注入が必須。
- `blockedPermissions` はREAD/WRITE_EXTERNAL_STORAGE、SYSTEM_ALERT_WINDOW、VIBRATE（30-35）を剥奪。不要権限の追加宣言は見つからない。
- `doc/privacy-policy.md` と `public/privacy-policy.html` は存在するが、`app.json`にprivacy policy URLは無い。Play Console側で公開URLを登録する運用ならリポジトリ内欠陥とは限らないが、現状からはストア登録漏れを静的に防げないためR2-F5。

## 9. Android bundle／アセット

`npx expo export --platform android` は5分以内に完了（exit 0）。Metro: `Android Bundled 12351ms`、`Assets (54)`、`Exported: dist`。
- `assets/`（ライセンス・PROVENANCE含む）: **4,238,036 bytes（約4.04 MiB）**。
- `dist/`出力: **24,357,536 bytes（約23.23 MiB）**。JS/Hermes bundle 4,086,861 bytesを含む。

### assets/ の大きい順

| file | bytes |
|---|---:|
| `assets/brand/icon.png` | 714,189 |
| `assets/brand/splash.png` | 544,261 |
| `assets/brand/adaptive-icon.png` | 513,181 |
| `assets/anatomy/organs_left.jpg` | 427,445 |
| `assets/anatomy/muscle_left.jpg` | 408,409 |
| `assets/anatomy/skeleton_left.jpg` | 397,101 |
| `assets/anatomy/skin_left.jpg` | 336,904 |
| `assets/anatomy/organs_rear.jpg` | 133,332 |
| `assets/anatomy/skeleton_rear.jpg` | 127,461 |
| `assets/anatomy/muscle_rear.jpg` | 123,886 |
| `assets/anatomy/skeleton_front.jpg` | 104,948 |
| `assets/anatomy/muscle_front.jpg` | 97,148 |

exportログにはZen Kaku Gothicフォント（約2.2〜2.4MB/weight）5種とCormorant/Material Symbolsも含まれる。100MB級のAI画像は無く、容量は現時点の価格リスクではない。

## 10. 既存チェック

| command | result | verbatim evidence |
|---|---|---|
| `pnpm test` | PASS | `Test Files  15 passed (15)` / `Tests  195 passed (195)` / `exit=0` |
| `pnpm lint` | PASS | `> equus@0.1.0 lint`、`> eslint .`、`exit=0`（warningなし） |
| `pnpm type-check` | PASS | `> tsc -p tsconfig.json --noEmit && tsc -p tsconfig.node.json --noEmit`、`exit=0` |
| `npx expo export --platform android` | PASS | `Android Bundled 12351ms` / `Assets (54)` / `Exported: dist` / `exit=0` |

## 監査補助ファイル

- `/home/ubuntu/equus_structures.json`: 52部位のシリアライズ結果（監査用、製品コード外）。
- `/home/ubuntu/equus-catalog.tsv`: 上記52行表のTSV。
- `/home/ubuntu/equus-geometry-audit.json`: 重心、F2、ポリゴン妥当性、ラベル境界、重なりの機械集計。
- `/home/ubuntu/equus-test.log`、`/home/ubuntu/equus-lint.log`、`/home/ubuntu/equus-typecheck.log`、`/home/ubuntu/equus-expo-export.log`: コマンドログ。

製品コードは変更していない。本監査で作成した成果物は本レポート。なお、監査開始後に別の未追跡ファイル `doc/review/2026-09-21-dogfooding/round2-test-plan.md` の存在も確認したが、本監査では変更していない。
