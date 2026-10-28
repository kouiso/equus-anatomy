# AGENTS.md

馬の解剖を層ごとに学ぶアプリ（Expo / React Native。Web は同じコードから `expo export --platform web` で出す）。
このファイルが、開発AI共通のルールの正本です。AI ごとの入口はここを指します。

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

## GitHub Project での作業管理

- この repo の作業は GitHub Project（`.github/scrum-board.yml` の番号）で管理する
- 次にやる物を決める・課題を起票する・Status を動かす・繰り越す時は、必ず先に `.agents/skills/scrum-board/SKILL.md`（`.claude/skills/scrum-board/`）を読んでから手を付ける
- 読めない・見つからない場合の要点: 次にやる物=盤の「今週の Iteration」で Wait 空の先頭（無ければ「無し」と答える・issue一覧や open PR から選ばない）・課題は題の頭に `[PBI]`/`[SBI]` を付け sub-issue と盤登録と項目（Iteration・Priority・Estimate・Size）までやる・繰り越しは `kouiso/.github` の `scripts/scrum_keeper/scrum_keeper.py --job carryover|okawari` を使う
- Status は Backlog / In progress / In review / Done の 4 つ。Todo は作らん
