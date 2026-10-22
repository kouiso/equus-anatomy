# AGENTS.md

馬の解剖を層ごとに学ぶアプリ（Expo / React Native。Web は同じコードから `expo export --platform web` で出す）。
このファイルが、開発AI共通のルールの正本です。AI ごとの入口はここを指します。

## 製品の目的と対象外（2026-10-22）

- 主目的は、3D Horse Anatomy に収録される骨・筋肉・内臓などの部位・名称を洗い出し、全ての位置も正確にして2Dの Equus Anatomy で参照できるように収録すること。機能模倣や3D制作は対象外。
- 公式全構造一覧を取得した調査担当が692掲載行のEquus対照表を作成中。左右や集合骨を展開した総個数ではない。表を受け取るまで存在しない座標を生成しない。
- 名称の収録と、位置・左右・深さ・隣接関係・2D投影の検証を別に追跡する。名前があるだけ、馬体マスク内にあるだけ、座標ゲートが通るだけで正確な収録完了や全網羅を宣言しない。未確認の位置を推測で描いて完成扱いにしない。
- クイズ・出題・採点・誤答再学習は作らず、完成条件に含めない。旧計画のクイズ案や、その代替としての自己テスト案を復活させない。
- 保存・手動の「覚えた」・過去の成績記録の読み込み互換を維持する。方針変更を理由に既存保存データを削除・初期化しない。
- 現行の計画と受入条件は [部位・名称の収録方針](doc/plan/2026-10-22-reference-parts-scope.md) を参照する。

## 構成

- `src/core/` — 座標計算・当たり判定・ズーム（純 TypeScript。画面に依存しない）
- `src/ui/` `src/app/` — 画面
- `scripts/` — 座標の検査・生成の道具
- `e2e/` — Playwright（Web）。`e2e/tools/` はスクショ取り専用で、既定の実行からは外してある
- `.maestro/` — Maestro の実機・エミュレータ試験
- `.github/ci/run.mjs` — CI とローカルで共通の検証の入口

## 守ること

- 座標には出どころ（`source`: `measured` / `draft`）を必ず持たせる。測った座標と AI が引いた下書きを混ぜない。`pnpm validate:coords` が機械で担保する
- コメントとドキュメントは日本語。コミット件名は英語の Conventional Commits
- `main` へ直接 push しない。ブランチを切って PR を出す
- 秘密情報・認証情報は置かない（CI に secret-scan（gitleaks）がある）
- UI を直したら、直した画面の前後を同じ条件で撮って PR に貼る

## 検証

```bash
pnpm install --frozen-lockfile
pnpm verify        # type-check + lint + 単体 + 座標検査 + e2e
node scripts/check-agent-entrypoints.mjs   # 本ファイルと各 AI の入口のずれを検査
```

## 共通 Skill と各 AI の入口

| 置き場 | 役割 |
|---|---|
| `AGENTS.md`（このファイル） | 共通ルールの正本。Codex・Cursor・GitHub Copilot・Devin が直接読む |
| `CLAUDE.md` | `@AGENTS.md` の 1 行だけ。Claude Code への入口 |
| `.agents/skills/<name>/SKILL.md` | 共通 Skill の正本 |
| `.claude/skills/<name>/SKILL.md` | Claude Code 用の写し。正本から `node scripts/check-agent-entrypoints.mjs --write` で作る。手で直さない |
| `.gemini/settings.json` | Gemini CLI に `AGENTS.md` を読ませる設定 |

- Claude Code は、`CLAUDE.md` が（作業場所より上の階層を含めて）あると `AGENTS.md` を直接は読まない。`CLAUDE.md` の `@AGENTS.md` で取り込む（公式: https://code.claude.com/docs/en/memory 、2026-10-22 確認。手元で、上の階層に別の `CLAUDE.md` がある環境では取り込みが無いと読まれないことを確かめた）
- Gemini CLI の `context.fileName` に `AGENTS.md` を入れる（公式: https://geminicli.com/docs/cli/gemini-md/ 、2026-10-22 確認）
- 各 AI の hooks・サブエージェント・権限・MCP は共通化しない。配布もしない
