> **状態: 実施済み（[PR #14](https://github.com/kouiso/equus-anatomy/pull/14)）。**
> 2026-09-11 に承認して、そのまま実行した計画。二本に分かれとったのを一本にまとめた。
> **今の状態と次の仕事は [`doc/handoff.md`](../handoff.md)。** ここは「なんでこの形になったか」を残すための記録で、
> 作業指示としては読まん。ただし「決定事項」と「途中で変えたこと」は今も生きとる。

# EQUUS を Expo（React Native）に載せ替える

*2026-09-11 | 磯貝さんの決定「いつか RN にリプレイスする前提で作る。RN でできんことは Web POC でやらん」を受けて、
「Web で作って後で RN に移す」をやめ、**最初から RN で作って Web にも出す**に切り替えた*

## なんでやったか

PR #1 で作った物は「`src/core/` は移植できる、`src/web/` は後で捨てる」という構造やった。捨てる側 `src/web/` が 1,435 行。
これから作る物（クイズ #6・習熟度 #7・検索 #8）は全部 UI なので、**捨てる側だけがこれから増える**。だから今が一番安い。

Expo なら `expo export --platform web` で静的サイトになり、同じコードが iOS / Android でも動く。
**「RN でできん物」は最初から書けん**ので、線引きを AI の判断に頼らんで済む。これが一番の狙い。

着手前に一次情報（Expo 公式 docs、SDK 57）で確認した。

| 部品 | Web 対応 |
|---|---|
| react-native-svg | Android / iOS / macOS / tvOS / **Web** |
| react-native-gesture-handler | Android / iOS / **Web** |
| expo-router 静的出力 | `web.output: "static"` + `expo export --platform web` → `dist/` |

Cloudflare Pages の Expo 専用ガイドは 404 やったが、`dist/` は普通の静的サイトなので要らんかった。

## 何を残して何を書き直したか

| | 行数 | 扱い | 結果 |
|---|---|---|---|
| `src/core/`（描画計算・当たり判定・ズーム・データ） | 1,267 + テスト | **そのまま**。1行も変えん | 守れた。`screen-to-image.ts` を1本**足した**だけ |
| `scripts/`（シルエット・座標ゲート・切り抜き・派生） | 2,367 | そのまま。画像パス定数だけ差し替え | `public/anatomy` → `assets/anatomy` の1箇所 |
| `src/core/data/`（regions JSON・解説52件・シルエット） | — | そのまま | 座標ゲートは変わらず緑 |
| `tools/calibrator/`（単一 HTML の測定ツール） | 308 | そのまま。**アプリ内 `/calibrate` はこれに一本化して消す** | 消した |
| `src/web/`（React DOM の画面） | 1,435 | **書き直す** | `src/ui/` + `src/app/` に |
| Vite / Tailwind / TanStack Router | — | 消す | 消した |

## 新しいスタック

| 役割 | 前 | 今 | なんで |
|---|---|---|---|
| 土台 | Vite + React DOM | **Expo SDK 57** | RN 公式推奨。Web 出力と Expo Go が付いてくる |
| 画面遷移 | TanStack Router | **expo-router** | ファイルベース。Web の URL も面倒見る |
| 図の描画 | `<svg viewBox>` | **react-native-svg** | 同じ viewBox 方式が3プラットフォームで動く。Web では本物の SVG になる |
| ジェスチャ | Pointer Events | **react-native-gesture-handler** | pinch / pan。viewBox の計算は `core/zoom.ts` のまま |
| 見た目 | Tailwind v4 | **StyleSheet + `src/ui/theme.ts`** | ↓「途中で変えたこと」参照。当初は NativeWind の予定やった |
| フォント | CSS の Google Fonts | **`@expo-google-fonts/*` + `useFonts`** | Zen Kaku Gothic New / Cormorant Garamond |
| 保存 | localStorage | **AsyncStorage** | Web では localStorage に落ちる |
| Node | 未指定 | **mise**（`mise.toml`） | 磯貝さんの指定 |
| パッケージ | pnpm（既定） | **pnpm + `node-linker=hoisted`** | Metro が symlink を辿れん |
| ホスティング | 無し | **Cloudflare Pages** | 磯貝さんの指定。`dist/` を置くだけ |
| 単体テスト | Vitest | Vitest（`core/` と `scripts/`） | 変えん |
| e2e | Playwright → Vite preview | Playwright → `serve dist` | 対象が変わるだけ |

**Skia は使わん。** Web で CanvasKit（WASM 数MB）を落とす羽目になる。
react-native-svg で native の描画が遅かった時だけ差し替える（renderer だけの話で `core/` は無関係）。

## 手順と、実際どうなったか

### 1. 骨組み（Web で起動するまで）— `643a8bb`

- `mise.toml`、`app.json`（`web.output: "static"`、`newArchEnabled`）、`.npmrc`、`src/app/_layout.tsx`
- `public/anatomy/*.jpg` → `assets/anatomy/`。`scripts/` のパス定数を1箇所直す
- **最初に確かめたこと**: `pnpm test`（122）と `pnpm validate:coords` が変わらず緑。ここが崩れたら移行そのものが間違い
- 画像の渡し方は renderer 側に `src → import` の対応表を1枚置く。`core/` に `require` を持ち込まん

### 2. スパイク（ここで判断した）— `b3522f7`

左側望・表層筋だけを react-native-svg で描いて、通るかどうかを見た。

- タップ → 画像 px の変換。`getScreenCTM()` は RN に無いので、コンテナ実寸（`onLayout`）と viewBox から計算する
  純関数 `screenToImage(pt, viewBox, container)` を **`core/` に足して**テストを書いた。`markerScale()` の厳密な逆関数
- マーカーの逆スケール `scale(k)` はそのまま効いた
- pinch → `core/zoom.ts` の `pinch()`、pan → `pan()`。core は無改造
- **反証を3人に投げた**（座標計算の厳密性／e2e が空振りしてへんか／RN 移植性）。全員「反証できず」
- 結果: 単体 128・spike e2e 4本 緑。**Skia に逃げる必要は無かった**

### 3. 全画面の移植 — `4dd5339`

共通部品 → 画面3本を並列 → 反証3人、の順で進めた。

| ファイル | 中身 | 元 |
|---|---|---|
| `src/ui/theme.ts` | 色・フォント・角丸のトークン（`styles.css` の `--color-*` と同値） | `src/styles.css` |
| `src/ui/chip-row.tsx` | `accessibilityRole="radio"` + `accessibilityState.checked` の横スクロールチップ | `src/web/component/chips.tsx` |
| `src/ui/part-sheet.tsx` | 部位の解説シート（保存トグル・閉じる・図鑑へ） | `src/web/component/part-sheet.tsx` |
| `src/ui/saved-store.ts` | `useSaved()`。AsyncStorage | `src/web/store.ts` |
| `src/ui/anatomy-canvas.tsx` | 場所モード（`mode`・`visiblePartIds`・`onPickArea`）、右側望の反転、下書きの破線 | `src/web/AnatomySvg.tsx` |
| `src/app/(tabs)/_layout.tsx` | `Tabs`: 図鑑 / 解剖 / 保存。ヘッダに「学習デモ」の但し書き | `src/web/router.tsx` |
| `src/app/(tabs)/index.tsx` | 解剖図。4向き4層・深さ・場所選択→部位絞り込み・配置状況 | `src/web/routes/anatomy.tsx` |
| `src/app/(tabs)/catalog/index.tsx` | 図鑑。検索・層チップ・52件 | `src/web/routes/catalog.tsx` |
| `src/app/(tabs)/catalog/[id].tsx` | 詳細。`generateStaticParams` で52件を静的出力 | `src/web/routes/catalog-detail.tsx` |
| `src/app/(tabs)/saved.tsx` | 保存一覧。空なら「解剖図を開く」（行き止まり禁止） | `src/web/routes/saved.tsx` |
| `src/app/+html.tsx` | Web にしか無い物（`lang`・`title`・`theme-color`・`color-scheme`） | `index.html` |

`/calibrate` と `draft.ts`（下書きの重ね表示）は作らんかった。測定は `tools/calibrator` に一本化。
測定の往復は calibrator → JSON → `validate:coords` → アプリ、になる。

### 4. 旧構成の撤去と e2e の付け替え — `00e2e34`

- `src/web`・`src/main.tsx`・`src/styles.css`・`e2e/calibrate.spec.ts` を削除
- `e2e/anatomy.spec.ts` を新 DOM で書き直した。**観点は落とさん**。react-native-web が
  `testID` → `data-testid`、`accessibilityRole` → `role`、`accessibilityLabel` → `aria-label` に落とすのを
  実際の `dist` の DOM で確かめてから locator を決めた

| 旧 | 新 |
|---|---|
| `[data-marker="trunk"] circle` | `[data-testid="marker-dot-trunk"]` |
| `[data-part="muscle-triceps"]` | `path[data-testid="part-muscle-triceps"]` |
| `[data-part][data-source="draft"]` | `path[data-testid^="part-"][stroke-dasharray]` |
| `getByRole('radio' / 'button' / 'heading')` | 同じ（RN の a11y prop から出る） |

- `e2e/spike.spec.ts` は `anatomy.spec.ts` に吸収。旧13観点 + スパイク4観点 + 座標の往復2観点 = **19本**
- ESLint の「`core/` は DOM 禁止」に加えて **`core/` は react-native / expo も禁止**にした

### 5. Cloudflare Pages — `9029ad9`

- GitHub Actions に `deploy` job。`cloudflare/wrangler-action` で `wrangler pages deploy dist`
- **secrets（`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`）が無い環境では黙って飛ぶ**ようにした。fork の PR で落ちんため
- `main` が本番、PR が preview URL。**secrets を入れるのは磯貝さんの仕事**（AI は値を見られん）

### 6. 後始末 — `f8f8ed4` ほか

- README のスタック節を Expo に書き直し。「RN 移植を念頭に」→「RN で作っとる」
- PBI: #10（PWA）を not_planned で閉じ、#11 を Vercel → Cloudflare に書き換え、#12 に進捗を書いた
- ヘッダに「学習デモ — 解剖学的正確性は未監修」を出した（#11 の受け入れ条件）
- `doc/handoff.md` を書いた

### 7. CI の赤を1件潰した — `8852541`

Step 4 の時点で e2e が1本だけ落ちた。**シートを開閉するとパネルの高さが変わり、上の canvas が縮んで、
押した部位が指の下から逃げる**という形やった。パネルをスマホで固定高（46%）にして解消。
ローカルで 19/19 緑を確認してから push した。

## 途中で計画から変えたこと（と、その理由）

承認された計画そのままやない所。後から読む人が混乱せんように残す。

| 変えた所 | 計画 | 実際 | 理由 |
|---|---|---|---|
| 見た目 | NativeWind | **StyleSheet + `theme.ts`** | Tailwind v3 固定と babel/metro 設定が増えるだけで、画面5本に見合わん。トークンは同じ値なので見た目は揃う |
| 置き場所 | `app/` + `src/native/` | **`src/app/` + `src/ui/`** | Expo のテンプレが `src/app/` を使う。`ui` は「renderer」の意味で native/web 共通 |
| 画像の読み込み | `require()` | **静的 `import`**（`src/ui/images.d.ts` で型付け） | ESLint の `no-require-imports` が拒む。`<Image href>` は asset id を受けるので結果は同じ |
| マウスホイールのズーム | （言及なし） | **付けてへん** | RN に無い。ボタンとピンチで足りる。「RN でできん物は書かん」の原則どおり |

## 検証（最終）

| 何を | どうやって | 結果 |
|---|---|---|
| `core/` が無傷 | `git diff --stat main -- src/core` | 追加2ファイルだけ（`screen-to-image.ts` と そのテスト） |
| 型・lint | `pnpm type-check` / `pnpm lint`（`core/` の DOM・RN 禁止を含む） | 緑 |
| 単体 | `pnpm test` | 128 件 緑 |
| 座標ゲート | `pnpm validate:coords` | 緑（配置済み 78 件は全て馬体の上、変わらず） |
| 静的出力 | `pnpm build`（`expo export --platform web`） | 緑。`dist/` に 114 ルート |
| e2e | `pnpm e2e`（`dist/` を配信して実行） | 19 件 緑 |
| CI | PR #14 の `verify` / `deploy` | 両方 緑 |
| 実機 | 磯貝さんの iPhone の Expo Go | **未実施**（AI は実機を持たん。Chromium のモバイルエミュレーションまで） |

各段で反証エージェントに「壊せ」と投げて、出た指摘は潰してから次へ進んだ。

## 決定事項（今も生きとる）

| 項目 | 決定 | 誰が | 根拠 |
|---|---|---|---|
| RN に「リプレイス」せん。最初から RN | そうする | 磯貝さん | 捨てる側が今後増えるだけ |
| Skia は使わん（react-native-svg） | そうする | AI | Web で WASM 数MB。SVG で遅いと分かってからでええ |
| NativeWind は使わん（StyleSheet） | そうする | AI | 設定が増えるだけで画面5本に見合わん |
| `/calibrate` はアプリから消す | そうする | AI | 測定は `tools/calibrator` に一本化。アプリを RN に閉じるため |
| マウスホイールのズームは移植せん | そうする | AI | RN に無い |
| 公開先は Cloudflare Pages（Vercel やない） | そうする | 磯貝さん | adult-ai-app と同じ方式 |
| Node は mise | そうする | 磯貝さん | — |

## 着手前の確信度と、実際どうなったか

| | 着手前 | 結果 |
|---|---|---|
| Expo + react-native-svg で Web が動く | 85% | **動いた**（e2e 19本が dist に対して緑） |
| `core/` を1行も変えずに済む | 80% | **済んだ**（追加のみ） |
| native でピンチが 60fps | 60% | **未測定**。実機が要る。落ちても reanimated → Skia の逃げ道はある |
| 既存 e2e の観点が全部移せる | 75% | **移せた**（13観点そのまま + 6観点追加） |

## 前の診断（PR #1）は変えてへん

「手書き座標が測られてへんかった」が根本原因、描画方式（viewBox 1本）は正しい、という結論はそのまま。
今回はその描画方式を react-native-svg で書き直しただけで、座標系の考え方は一切変わっとらん。
