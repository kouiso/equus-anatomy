# 引き継ぎ — EQUUS 馬体解剖（Expo 版）

*2026-09-11 時点の本文に、2026-09-18 の状況を追記済み。別の AI / 人がここから続けるための1枚。これを読めば、他に読む物は README だけでええ。*
*「なんでこの形になったか」まで遡りたい時だけ `doc/plan/` を見る（実施済みの計画書。作業指示としては読まん）。*

## 2026-09-18 時点の差分（新しい方が正）

- **クイズは削除済み**（画面・タブ・`core/quiz*`・専用e2e）。覚えた/保存/既存記録は維持。理由と互換は `doc/test-spec.md`
- **FAD 配布はテスターグループ `beta-testers` で運用**（iOS/Android 共通。`.github/workflows/fad.yml` の `--groups` 指定）。個人追加は Firebase のグループ操作のみでOK。iOS新規端末は UDID 登録→`provision_ios:true` 実行が必要
- **獣医レビュー用資料**: `doc/review/2026-09-18-vet-audit/`（全52部位台帳・AI修正19件・獣医判断12件。第2版=Fable盲目監査反映済み）。PBI/SBI は `doc/plan/2026-09-18-vet-review-pbi.md`
- **座標**: 78件配置（measured 11 / draft 67）。skin-hoof(左)は AI測定+Fable相互確認済み（`doc/review/2026-09-17-skin-hoof/`）
- **単体テスト 195件 / e2e 59件 / 座標ゲート 緑**
- **非対称臓器は存在側にのみ掲載**（脾臓・胃=左のみ、盲腸・肝臓=右のみ）。views は図の描画にも効く（index.tsx でフィルタ）。region に 骨盤腔 を追加済み

## 場所

| | |
|---|---|
| リポジトリ | `kouiso/equus-anatomy` |
| ブランチ | `main`（Expo 移植は 2026-09-12 にマージ済み。作業ブランチは消した） |
| PR | [#14](https://github.com/kouiso/equus-anatomy/pull/14)（マージ済み） |
| この文書 | `doc/handoff.md` |
| 計画の記録（実施済み） | `doc/plan/2026-09-11-expo-migration.md` |
| ローカル作業ディレクトリ（前セッションの環境） | `/home/user/equus` |

## 一言でいうと

**馬の解剖図に、実測した座標で部位マーカーを重ねて学ぶアプリ。Expo（React Native）で書いてあり、`expo export` で Web にも出る。**
前身（grok.me でバイブコーディングした版）はマーカーが馬体からズレとった。原因は「座標を測らずに手書きしとった」の一点。描画方式は正しかった。
そこで **測った座標しか入らん仕組み（座標ゲート）** を土台にして作り直し、そのあと **「いつか RN にリプレイス」をやめて最初から RN で作る** ことにした（局長の決定 2026-09-11）。

## 今どうなっとるか

| 項目 | 状態 |
|---|---|
| Expo SDK 57 + expo-router + react-native-svg + gesture-handler | 動いとる。4向き（左側望・右側望・正面・後面）× 4層（皮膚・筋肉・骨格・内臓） |
| `src/core/`（計算・当たり判定・ズーム・データ） | **前身から無傷で移植**。追加は `screen-to-image.ts` の1組だけ |
| 座標 | 78 件（うち 66 件は AI の下書き `source: draft`。破線で描かれる） |
| 単体テスト（Vitest） | 155 件 緑 |
| e2e（Playwright、`expo export` した `dist/` に対して） | 27 件 緑（ローカル） |
| 座標ゲート `pnpm validate:coords` | 緑 |
| CI（`.github/workflows/ci.yml`） | `verify` job = 型・lint・単体・ゲート・build・e2e。**緑確認済み**（`8852541` のパネル固定高でレース条件は解消） |
| Cloudflare Pages | **公開済み: https://equus-anatomy-84f.pages.dev/** （2026-09-16 手動デプロイ）。手動は `pnpm deploy`、ただし `CLOUDFLARE_ACCOUNT_ID=6e206506efda3871a2d6e81da38b4b0b` の明示が要る（環境に別アカウントIDが拾われて認証エラーになる）。CI 自動化には secrets `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` |
| 実機 | **Android 確認済み**（Pixel_9a エミュレータ: Chrome でWeb版・Expo Go 57 でネイティブ、両方正常。ピンチもCDP実タッチで検証）。iPhone は後回し |

## 構成

```
src/core/        純 TS。React も RN も DOM も import 禁止（ESLint で機械的に止めとる）
  geometry.ts        px ⇄ viewBox、重心、flip、bbox、markerScale（逆スケール k）
  screen-to-image.ts タップ位置（コンテナ px）→ 画像 px。preserveAspectRatio meet の逆算
  hit-test.ts        点→多角形、マーカー優先の当たり判定
  zoom.ts            viewBox の状態機械（pinch / pan / zoomAt / clamp）
  label-layout.ts    ラベルの重なり回避
  area-map.ts        解説の region（10種）→ 図の「大まかな場所」（6つ）
  search.ts          図鑑の検索・絞り込み（読み仮名・層・場所・向き）
  mastery.ts         覚えた判定（手動マーク。過去のテスト記録 correct/wrong/streak も保持）
  data/              structures.ts（解説52件）、kana.ts（読み仮名52件）、regions/{left,front,rear}.json（座標の正本）、silhouettes.json（実測マスク）
src/ui/          RN の部品。anatomy-canvas.tsx（react-native-svg の描画）、chip-row、part-sheet、saved-store・mastery-store（AsyncStorage）、theme
src/app/         expo-router。(tabs)/index（解剖）、(tabs)/catalog（図鑑 + [id] 詳細）、(tabs)/saved
assets/anatomy/  画像12枚（JPEG）。座標は画像実寸 px で、画像の SHA-256 と紐づく
scripts/         座標ゲート・シルエット抽出・切り抜き・派生・重なり率など（node、tsx で実行）
tools/calibrator/ 単一 HTML の測定ツール（アプリ内 /calibrate は無くした）
e2e/             Playwright。anatomy.spec.ts が本体、tools/ はスクショ用
doc/handoff.md   これ
```

右側望は `left.json` を `x → w − x` で反転して使う（データ側で反転。描画の transform に任せると当たり判定と食い違う）。

## 守るべきこと（壊すと前身と同じ事故になる）

1. **座標は測定値しか入れん。** 推測で埋めん。置けんものは「未配置 N 件」と画面に出す。`pnpm validate:coords` が CI で落とす
2. **`src/core/` に React / RN / DOM を持ち込まん。** renderer（`src/ui`）を差し替えられるのが芯の価値。ESLint が止める
3. **RN でできんことは書かん。** `window` / `document` / CSS は `src/ui` `src/app` で禁止。どうしても要るなら `*.web.tsx` に隔離
4. **マーカーは `translate(x,y) scale(k)`。** `k = markerScale(viewBox, container)`。`vector-effect` は線の太さにしか効かん
5. **当たり判定は core がやる。** SVG の `onPress` に頼らん。点（半径 22 CSS px）→ 場所 → 多角形の順
6. **`fill="transparent"`。** `fill="none"` は内側が当たらん
7. **画像は静的 `import`。** `require()` は ESLint が拒む。react-native-svg の `<Image href>` に asset id を渡せば Web も native も出る
8. **viewBox は向きの切り替えと同じレンダーで決める**（`useEffect` に置くと1フレーム前の枠で描く）
9. **解剖画面の下パネルはスマホで固定高（46%）。** 中身で伸縮させると canvas が動いて、押した部位が指の下から逃げる

## コマンド

```bash
mise install              # node 22 / pnpm 10（mise.toml）
pnpm install              # .npmrc の node-linker=hoisted が要る（Metro は symlink を辿れん）
pnpm start                # Expo dev server。Expo Go で QR を読む
pnpm web                  # ブラウザで
pnpm verify               # 型・lint・単体・座標ゲート・build・e2e を通しで
pnpm build                # expo export --platform web → dist/
pnpm preview              # serve dist（4173）
pnpm e2e                  # Playwright（先に pnpm build が要る）
pnpm validate:coords      # 座標ゲート
pnpm report:overlap left  # 同じ層の部位の重なり率
pnpm build:calibrator     # 測定ツールの単一 HTML
```

e2e の DOM: react-native-web が `testID` → `data-testid`、`accessibilityRole` → `role`、`accessibilityLabel` → `aria-label` に落とす。
主な testID: `anatomy-svg`、`anatomy-image`、`marker-dot-<id>`（場所も部位も）、`part-<id>`（部位の path）、`placement-status`、`close-sheet`。

## 残っとる仕事

| # | 内容 | 誰が |
|---|---|---|
| [#12](https://github.com/kouiso/equus-anatomy/issues/12) | iPhone 実機のみ残（Android は Expo Go + Chrome で確認済み）。iOS シミュレータは Mac 専用なので物理 iPhone が要る | 局長（iPhone） |
| [#12](https://github.com/kouiso/equus-anatomy/issues/12) | RN で動くことの実証。Web は済。**Expo Go で実機のピンチが滑らかか**を見て、遅ければ reanimated の `animatedProps` で viewBox を動かす。それでもアカンなら Skia | 局長（実機）→ AI |
| #2 | 下書き 66 件の境界確認 → **一次レビュー済**（全件を絵に重ねて目視、大きなズレ無し）。残るのは境界の精密さの最終確認だけ | 人（最終確認のみ） |
| #3 | 未配置 6 件 → **済**（全件「絵が無いから配置不能」と判定。深層筋4・盲腸・膀胱、解説は図鑑で表示維持） | — |
| #4 | 内臓図が解剖学的に怪しい → 具体的な問題を issue コメントに記録済み（肝臓が左側望で目立つ・大結腸フレーム無し・膀胱未描出）。新しい絵が要る | 人（絵の制作） |
| #5 | 腱・靱帯・関節・蹄内部 → 新しい絵と座標が要る | 人（絵）→ AI（座標） |
| #9 | 解説文 → **済**（PR [#23](https://github.com/kouiso/equus-anatomy/pull/23)。全52部位を3〜4文に拡充） | — |
| #13 | 獣医解剖学の監修。それまで画面に「学習デモ — 解剖学的正確性は未監修」を出しとく | 人 |
| [#10](https://github.com/kouiso/equus-anatomy/issues/10) | PWA → **やらん**（not_planned）。RN なら画像は同梱でオフラインは最初から効く | — |

## 決めたこと（蒸し返さんように）

| 決定 | 理由 |
|---|---|
| Web で作って後から RN、をやめて最初から Expo | 捨てる側（画面）がこれから増えるだけやった。RN でできんことが最初から書けん |
| Skia は使わん（react-native-svg） | Web で CanvasKit（WASM 数MB）を落とすことになる。SVG で遅いと分かってからでええ |
| NativeWind は使わん（StyleSheet + `theme.ts`） | Tailwind v3 固定と babel/metro 設定が増えるだけで、画面5本に見合わん |
| `/calibrate` はアプリから消す | 測定は `tools/calibrator`（単一 HTML）に一本化。アプリを RN に閉じるため |
| マウスホイールのズームは移植せん | RN に無い。ボタンとピンチで足りる |
| 公開先は Cloudflare Pages（Vercel やない） | 局長指定。adult-ai-app と同じ方式 |
| Node は mise | 局長指定 |

## 未検証・注意

- **native の実行は一度も実機で見てへん。** Web 出力と型・lint・単体・e2e で「RN のコードとして成立する」所まで。Expo Go で見るのが最初の仕事
- **このマシン（WSL2）は `localhostForwarding=false`。** Windows のブラウザから `localhost` / `127.0.0.1` 系の URL は一切届かん（vsock relay storm 対策で意図的に無効）。画面を見せる時は `hostname -I` の WSL IP + ポート直打ち（例: `http://172.x.x.x:4187`）。ブラウザプレビュー系の 127.0.0.1 URL も同じく届かん
- e2e はこのマシンの Chromium（`/opt/pw-browsers/chromium-1194`）を優先して使う設定（`playwright.config.ts`）。CI では `playwright install` の既定
- `test-results/` `playwright-report/` `dist/` `.expo/` は git 管理外

## 経緯（読まんでもええ）

1. grok.me 版のズレを実測で切り分け → 座標の値だけが原因と確定（PR #1 の本文に詳しい）
2. 座標ゲート + core/web 分離で作り直し（PR #1、main にマージ済み）
3. 局長「いつか RN にリプレイス」→「なら最初から RN で」→ Expo に載せ替え（PR #14）
   - Step 1 骨組み `643a8bb` → Step 2 スパイク `b3522f7`（反証3本通過）→ Step 3 全画面 `4dd5339` → Step 4 旧構成撤去 + e2e `00e2e34` → 修正 `8852541`
