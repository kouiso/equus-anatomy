> **状態: 実施済み（PR #14）。** これは 2026-09-11 に承認されて、そのまま実行した計画の原本や。
> 今どうなっとるか・次に何をするかは [`doc/handoff.md`](../handoff.md) を見る。
> ここに書いてある「やること」は済んでおり、決定事項と理由だけが生きとる。
> 原本は `/root/.claude/plans/ai-deep-research-https-tango-kite-fair-mossy-gadget.md`（セッション限りで消えるのでコピーした）。

---

# EQUUS を Expo（React Native）に載せ替える

*2026-09-11 | 磯貝さんの決定「いつか RN にリプレイスする前提で作る。RN でできんことは Web POC でやらん」を受けて、「Web で作って後で RN に移す」をやめ、**最初から RN で作って Web にも出す**に切り替える*

## Context

PR #1 で作った物は「`src/core/` は移植できる、`src/web/` は後で捨てる」という構造やった。捨てる側 `src/web/` は今 1,435 行。これから作る物（クイズ #6・習熟度 #7・検索 #8）は全部 UI なので、**捨てる側だけがこれから増える**。今が一番安い。

Expo で作れば `expo export --platform web` で静的サイトになり、同じコードが iOS / Android でも動く。「RN でできん物」は最初から書けんので、線引きをワイの判断に頼らんで済む。

一次情報で確認済み（Expo 公式 docs、SDK 57）:

| 部品 | Web 対応 |
|---|---|
| react-native-svg | Android / iOS / macOS / tvOS / **Web** |
| react-native-gesture-handler | Android / iOS / **Web** |
| expo-router 静的出力 | `web.output: "static"` + `expo export --platform web` → `dist/` |

Cloudflare Pages の Expo 専用ガイドは 404 やったが、`dist/` は普通の静的サイトなので要らん。

## 何が残って何を書き直すか

| | 行数 | 扱い |
|---|---|---|
| `src/core/`（描画計算・当たり判定・ズーム・データ） | 1,267 + テスト | **そのまま**。1行も変えん（変えたら理由を書く） |
| `scripts/`（シルエット・座標ゲート・切り抜き・派生） | 2,367 | **そのまま**。画像パス定数だけ `public/anatomy` → `assets/anatomy` |
| `src/core/data/`（regions JSON・解説52件・シルエット） | — | そのまま |
| `tools/calibrator/`（単一 HTML の測定ツール） | 308 | そのまま。**アプリ内 `/calibrate` はこれに一本化して消す** |
| `src/web/`（React DOM の画面） | 1,435 | **書き直す** → `app/` + `src/native/` |
| Vite / Tailwind / TanStack Router | — | 消す |

## 新しいスタック

| 役割 | 今 | これから | なんで |
|---|---|---|---|
| 土台 | Vite + React DOM | **Expo（現行 SDK）** | RN 公式推奨。Web 出力と Expo Go が付いてくる |
| 画面遷移 | TanStack Router | **expo-router** | ファイルベース。Web の URL も面倒見る |
| 図の描画 | `<svg viewBox>` | **react-native-svg** | 同じ viewBox 方式が3プラットフォームで動く。Web では本物の SVG になる |
| ジェスチャ | Pointer Events | **react-native-gesture-handler** | pinch / pan。viewBox の計算は `core/zoom.ts` のまま |
| 見た目 | Tailwind v4 | **NativeWind** | Tailwind の書き味とデザイントークンを残す |
| フォント | CSS | **expo-font** | Zen Kaku Gothic New / Cormorant Garamond |
| 保存 | localStorage | **AsyncStorage** | Web では localStorage に落ちる |
| Node | 未指定 | **mise**（`mise.toml` で node 22 + pnpm） | 磯貝さんの指定 |
| ホスティング | 無し | **Cloudflare Pages** | 磯貝さんの指定。`dist/` を置くだけ |
| 単体テスト | Vitest | Vitest（`core/` と `scripts/`） | 変えん |
| e2e | Playwright → Vite preview | Playwright → `npx serve dist` | 対象が変わるだけ |

Skia は使わん。Web で CanvasKit（WASM 数MB）を落とす羽目になる。react-native-svg で native の描画が遅かった時だけ差し替える（renderer だけの話で `core/` は無関係）。

## 手順

### 1. 骨組み（Web で起動するまで）

- `mise.toml`、`app.json`（`web.output: "static"`、`newArchEnabled`）、`app/_layout.tsx`
- `public/anatomy/*.jpg` → `assets/anatomy/`。`scripts/` のパス定数を1箇所直す
- `src/core/` と `scripts/` はそのまま。`pnpm test` と `pnpm validate:coords` が変わらず緑なことを最初に確かめる
- 画像は RN では `require()` が要る。`regions/*.json` の `"src": "/anatomy/skin_left.jpg"` は変えず、renderer 側に `src → require(...)` の対応表を1枚置く（`core/` に require を持ち込まん）

### 2. スパイク（ここで判断する）

左側望・表層筋だけを react-native-svg で描く。

- タップ → 画像 px の変換。`getScreenCTM()` は無いので、コンテナ実寸（`onLayout`）と viewBox から `core/geometry.ts` の `markerScale` と同じ計算で出す。**この変換を `core/` に純関数で足してテストを書く**（`screenToImage(pt, viewBox, container)`）。Web と native で同じ経路にする
- マーカーの逆スケール `scale(k)` はそのまま効くはず
- pinch → `core/zoom.ts` の `pinch()`、pan → `pan()`
- **判断点**: Web で e2e 15本相当が通る／磯貝さんの iPhone の Expo Go でピンチが引っかからん。引っかかるなら reanimated の `animatedProps` で viewBox を動かす。それでもアカンなら Skia

### 3. 全画面の移植

- `app/index.tsx` 解剖図（4向き4層・場所選択・部位シート）
- `app/catalog/index.tsx` 図鑑、`app/catalog/[id].tsx`（静的出力なので `generateStaticParams` で52件）
- `app/saved.tsx` 保存（AsyncStorage）
- `/calibrate` は作らん。`tools/calibrator` に一本化。下書きの重ね表示（`draft.ts`）も消える。測定の往復は calibrator → JSON → `validate:coords` → アプリ、になる

### 4. 旧構成の撤去

- `src/web/`、`vite.config.ts`、`index.html`、Tailwind、TanStack を消す
- `playwright.config.ts` の `webServer` を `pnpm expo export --platform web && npx serve dist -l 4173` に
- e2e の locator を見直す（`data-testid` は react-native-svg の Web 出力でも付く。`getByRole('radio')` は RN の `accessibilityRole` で出す）
- ESLint の「`core/` は DOM 禁止」はそのまま。加えて **`core/` は react-native も禁止**にする

### 5. Cloudflare Pages

- GitHub Actions に `deploy` job。`cloudflare/wrangler-action` で `wrangler pages deploy dist`
- 要るもの: `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を GitHub の secrets に。**これだけは磯貝さんに入れてもらう**（ワイは値を見られん）
- `main` に入ったら本番、PR は preview URL

### 6. 後始末

- README のスタック節を書き直す。「RN 移植を念頭に」は消して「RN で作っとる」に
- PBI の付け替え: #10（PWA）は閉じる、#11 は Cloudflare に書き換え、#12（RN 実証）はこの PR で済む
- 「学習デモ」の但し書きを画面に出す（#11 の受け入れ条件）

## 検証

| 何を | どうやって |
|---|---|
| `core/` が無傷 | `git diff --stat main -- src/core` が空、Vitest 122件が緑 |
| 座標ゲート | `pnpm validate:coords` が緑（画像パスを変えてもハッシュは同じ） |
| Web で動く | `expo export --platform web` → `serve dist` → Playwright で4向き4層・タップ・ピンチ・サイズ不変（既存 e2e と同じ観点） |
| 実機で動く | 磯貝さんの iPhone の Expo Go で左側望・表層筋を触ってもらう（ワイは実機を持たん。Chromium のモバイルエミュレーションまで） |
| Cloudflare | preview URL が出て、上と同じ画面が見える |
| 型・lint | `tsc --noEmit`、ESLint（`core/` の DOM / RN 禁止を含む） |

## 決定事項

| 項目 | 決定 | 根拠 |
|---|---|---|
| RN に「リプレイス」せん。最初から RN | 磯貝さん | 捨てる側が今後増えるだけ |
| Skia は使わん | ワイ | Web で WASM 数MB。SVG で足りんと分かってから |
| `/calibrate` は消す | ワイ | 測定ツールは `tools/calibrator` に既にある。アプリを RN に閉じるため |
| Cloudflare Pages | 磯貝さん | — |
| mise | 磯貝さん | — |

## 確信度

| | |
|---|---|
| Expo + react-native-svg で Web が動く | **85%**（公式 docs で対応を確認。実際に組んではおらん） |
| `core/` を1行も変えずに済む | **80%**（`screenToImage` の追加は「足す」であって「変える」やない） |
| native でピンチが60fps | **60%**（未測定。スパイクで測る。落ちても reanimated → Skia の逃げ道はある） |
| 既存 e2e の観点が全部移せる | **75%**（`getByRole` 周りは RN の a11y 出力次第） |

## 前の診断（PR #1）は変えん

「手書き座標が測られてへんかった」が根本原因、描画方式（viewBox 1本）は正しい、という結論はそのまま。今回はその描画方式を react-native-svg で書き直すだけで、座標系の考え方は一切変わらん。
