# NOTICE — 同梱フォントのライセンス

このアプリには以下のフォントが同梱されている。両方とも SIL Open Font License 1.1。
ライセンス本文は `assets/licenses/` に収録。

| フォント | 著作権 | ライセンス |
|---|---|---|
| Zen Kaku Gothic New | Copyright 2022 The Zen Kaku Gothic Project Authors | OFL-1.1（`OFL-zen-kaku-gothic-new.txt`） |
| Cormorant Garamond | Copyright the Cormorant Garamond Project Authors | OFL-1.1（`OFL-cormorant-garamond.txt`） |

その他の依存ライブラリは `package.json` の各パッケージのライセンスに従う。アプリに同梱する
`dependencies` は全て MIT License（`@expo-google-fonts/*` はコードが MIT、フォントが OFL-1.1）。
各ライブラリの著作権表示と MIT License 本文はアプリ内の「このアプリについて」→「ライセンス」で読める
（正本は `src/ui/licenses.ts`。`scripts/in-app-licenses.test.ts` が node_modules の実物と突き合わせる）。
解剖図の権利関係は `assets/anatomy/PROVENANCE.md` を参照。
