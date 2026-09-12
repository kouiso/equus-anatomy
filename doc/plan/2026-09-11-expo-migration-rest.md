> **状態: 実施済み（PR #14）。** 上の [`2026-09-11-expo-migration.md`](./2026-09-11-expo-migration.md) の続きとして
> 2026-09-11 に承認・実行した計画の原本。Step 3〜6 と、当時赤かった CI の扱いを書いとる。
> 今の状態は [`doc/handoff.md`](../handoff.md)。
> 原本は `/root/.claude/plans/distributed-conjuring-quiche.md`（セッション限りで消えるのでコピーした）。

---

# EQUUS Expo 移行 — 残り（Step 3〜6）と PR #14 の赤

*2026-09-11 | 承認済みの本体プラン: `/root/.claude/plans/ai-deep-research-https-tango-kite-fair-mossy-gadget.md`。これはその続き*

## Context

| 事実 | 根拠 |
|---|---|
| Step 1（Expo 骨組み）済。`643a8bb` | Vitest 122・座標ゲート・型・lint・`expo export`・serve 200 |
| Step 2（スパイク）済。**未コミット** | ワークフロー `wf_4b72958b-96f`: 3人の反証（座標計算／e2e の実質／RN 移植性）全員「反証できず」。単体 128・spike e2e 4本緑 |
| PR #14（draft）が `9029ad9` で開いとる。CI `verify` は**赤** | 旧アプリ向け e2e 15本（`anatomy.spec.ts` / `calibrate.spec.ts`）が新アプリの DOM を見つけられんだけ。この PR の責任、Step 4 で e2e を付け替えれば直る |
| Step 5（Cloudflare deploy job）は CI に入っとる。secrets 未設定なので黙って飛ぶ | `9029ad9` |

スパイクで確定したこと（次の設計の前提）:

- 画像は `import` した jpg（数値の asset ID）を `<Image href>` に渡すだけで Web も native も出る。expo-asset 不要
- `testID` は react-native-web が `data-testid` に落とす。react-native-svg の要素も同じ
- `require()` は ESLint が拒む。`src/ui/images.d.ts` の `declare module '*.jpg'` で静的 import にしとる

## やること

### 0. スパイクをコミットして push（CI が赤なんは既知、Step 4 で直す）

### 3. 全画面の移植（ワークフロー: 共通部品 → 画面を並列 → 反証）

`src/ui/theme.ts` に色・フォント・角丸のトークン（`styles.css` の `--color-*` と同値）を置き、`StyleSheet` で書く。**NativeWind は使わん**（承認プランからの変更。Tailwind v3 固定と babel/metro 設定が増えるだけで、5画面に見合わん。トークンは同じ値なので見た目は揃う）。

| ファイル | 中身 | 元 |
|---|---|---|
| `src/ui/theme.ts` | トークン | `src/styles.css` |
| `src/ui/chip-row.tsx` | `accessibilityRole="radio"` + `accessibilityState.checked` の横スクロールチップ | `src/web/component/chips.tsx` |
| `src/ui/part-sheet.tsx` | 部位の解説シート（保存トグル・閉じる・図鑑へ） | `src/web/component/part-sheet.tsx` |
| `src/ui/saved-store.ts` | `useSaved()`。AsyncStorage（Web では localStorage に落ちる） | `src/web/store.ts` |
| `src/ui/anatomy-canvas.tsx` | **場所モードを足す**: `mode: 'area' \| 'part'`、`visiblePartIds`、`onPickArea`、`mirrored`（右側望は `<Image>` を `translate(w,0) scale(-1,1)`、座標はデータ側で反転済み）。場所の点は `marker-dot-<areaId>`、部位の path は `part-<id>`、下書きは `strokeDasharray` | `src/web/AnatomySvg.tsx` |
| `src/app/(tabs)/_layout.tsx` | expo-router `Tabs`: 図鑑 / 解剖 / 保存。ヘッダーに「馬体解剖 / EQUUS」と**「学習デモ」の但し書き** | `src/web/router.tsx` |
| `src/app/(tabs)/index.tsx` | 解剖図。4向き4層・深さ・場所選択→部位絞り込み（`core/area-map`）・`zoomToPolygons`・配置状況「配置済み N / 対象 M（未配置 K）」`testID="placement-status"`・「大まかな場所を選び直す」 | `src/web/routes/anatomy.tsx` |
| `src/app/(tabs)/catalog/index.tsx` | 図鑑。検索 `TextInput`、層チップ、52件の `FlatList`、`Link href="/catalog/[id]"` | `src/web/routes/catalog.tsx` |
| `src/app/catalog/[id].tsx` | 詳細。`generateStaticParams` で 52 件（静的出力） | `src/web/routes/catalog-detail.tsx` |
| `src/app/(tabs)/saved.tsx` | 保存一覧。空なら「解剖図を開く」リンク（行き止まり禁止） | `src/web/routes/saved.tsx` |
| フォント | `pnpm expo install @expo-google-fonts/zen-kaku-gothic-new @expo-google-fonts/cormorant-garamond` → `_layout` で `useFonts` | `index.html` の Google Fonts |

`/calibrate` と `draft.ts`（下書きの重ね表示）は作らん。測定は `tools/calibrator` に一本化。

### 4. 旧構成の撤去と e2e の付け替え

- `git rm -r src/web src/main.tsx src/styles.css e2e/calibrate.spec.ts`。`src/ui/images.d.ts` 以外に Vite 由来の型参照が無いか grep
- `e2e/anatomy.spec.ts` を新 DOM で書き直す。**観点は落とさん**（旧 spec の 13 本と対応させる）:

| 旧 | 新の locator |
|---|---|
| `[data-marker="trunk"] circle` | `[data-testid="marker-dot-trunk"]` |
| `[data-part="muscle-triceps"]` | `[data-testid="part-muscle-triceps"]` |
| `[data-part][data-source="draft"]` | `path[data-testid^="part-"][stroke-dasharray]` |
| `[data-testid="anatomy-image"]` | 同じ（`testID="anatomy-image"`） |
| `getByRole('radio', { name })` | 同じ（`accessibilityRole="radio"` + `accessibilityLabel`） |
| `getByRole('heading', { level: 2 })` | `accessibilityRole="header"` を付け、dist の DOM で何になるか確かめてから決める |
| `getByRole('button', { name })` | 同じ（`Pressable` + `accessibilityRole="button"` + `accessibilityLabel`） |

- `e2e/spike.spec.ts` は `anatomy.spec.ts` に吸収して消す。`e2e/tools/*.spec.ts`（スクショ用）も新 DOM に合わせる
- `playwright.config.ts` の `webServer` は `pnpm preview`（`serve dist`）のまま。**e2e の前に `pnpm build` が要る**ので `verify` スクリプトの順序はそのまま
- ESLint の `src/web` ignore を外す

### 5. Cloudflare（済。secrets 待ち）

### 6. 後始末

- README: スタック節を Expo に書き直す。「RN 移植を念頭に」→「RN で作っとる。Web は `expo export`」。コマンド節・「今の状態」・「未着手」を更新
- PR #14 の本文を最終状態に。draft を外す
- PBI: #10（PWA）を not_planned で閉じる、#11 を Cloudflare に書き換え、#12 に「この PR で済んだ」と書く

## 進め方（ultracode）

1. **ワークフロー A（Step 3）**: 1エージェントが共通部品（theme / chip-row / part-sheet / saved-store / canvas の場所モード / tabs layout / fonts）を作って `type-check`+`lint` を通す → 3エージェント並列で解剖図・図鑑+詳細・保存を書く（触るファイルが違うので同じツリーでええ。worktree は使わん）→ 3人の反証（画面ごとの機能落ち／RN 移植性／静的出力で全ルートが出るか）
2. **ワークフロー B（Step 4）**: 1エージェントが e2e を書き直して旧構成を消し、`pnpm verify` を通す → 2人の反証（旧 spec 13本の観点が全部残っとるか／CI と同じ手順で緑か）
3. ワイがコミット・push・PR #14 更新・README・PBI

## 検証

| 何を | どうやって |
|---|---|
| `core/` が無傷 | `git diff --stat main -- src/core` が追加2ファイルだけ |
| 型・lint・単体 | `pnpm type-check` / `pnpm lint` / `pnpm test`（128） |
| 座標ゲート | `pnpm validate:coords` |
| 静的出力 | `pnpm build` → `dist/` に `index.html` / `catalog.html` / `catalog/<52件>.html` / `saved.html` |
| e2e | `pnpm e2e` 全緑（旧 13 観点 + スパイク 4 観点） |
| CI | PR #14 の `verify` が緑になる |
| 実機 | 磯貝さんの iPhone の Expo Go（`pnpm start` → QR） |

## 磯貝さんに頼むこと（変わらず）

- `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` を GitHub secrets に
- 終わったら Expo Go で触ってもらう
