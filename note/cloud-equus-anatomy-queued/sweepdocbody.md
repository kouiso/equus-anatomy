## 概要

#313（尺骨の下書きが上腕骨の上に乗っている）を見つけたので、置いてある部位を全部（119 件、右は左の写しなので除く）、2 人が別々に「図形が名前の構造に乗っているか」で見た記録。境界の細かさ（#2）は見ていない。判断役の決定（2026-11-14 13:47Z）: 2 人とも「違う」と言った物だけ直し、食い違い・判らない物は #13（獣医の監修）へ回す。

## 変更内容

- `doc/review/2026-11-14-draft-placement-sweep/README.md`: 数・一覧・正しい場所の箱。
- `doc/review/2026-11-14-draft-placement-sweep/data/`: 2 人の生の結果（A・B の results.json と summary.md）。README の数はここから計算できる。

結論:
- **2 人とも「違う」: 7 件**（直す）。左 `bone-ulna`（#313）・`bone-humerus`・`skin-forehead`・`skin-pastern`・`skin-fetlock`、正面 `skin-coronet`・`bone-mandible`。
  - 皮膚の 4 件と正面の下顎骨は `fix/draft-placement-sweep-1`。上腕骨と尺骨は、同じファイルを触る #312 の後の別の PR。
- **食い違い 5 件・2 人とも判らない 1 件**: 直さない。#13 へ。
- **「乗っている」と「判らない」に分かれた 9 件**: 誰も「違う」と言っていないので直さない。参考として別に並べた。

### 確かめた事

| | 結果 |
|---|---|
| レビュー | cb29eb0 で FAIL（must 3: 出どころの無い主張・言い換えの誤り・部位名 3 件の誤り）→ 1903efb で PASS（must 0。数・一覧は data/ から計算し直して一致、部位名 23 件は structures.ts と一致） |
| check-agent-entrypoints | OK |

## 関連Issue

Refs #313 #13 #2 #314
No-Close: 記録だけ。直しは別の PR

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Cv4a6DggpGHJAmmfXW7wbW
