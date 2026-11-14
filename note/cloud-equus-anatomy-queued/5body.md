## 概要

#5（腱・靱帯・関節・蹄）のうち、今ある skeleton_left の板に描かれている前肢の関節を3つ、下書き（`source: draft`）として足した。肩関節・肘関節・前肢の球節。head は e6fd19a、元にした develop は 8dbfb31（e7c380f とも衝突なし）。左の板で決めた座標を、右の見え方へ左右反転で写した（`views: ['left','right']`、x' = 1600 − x）。

**実機の証跡はまだ無い。** 判断役の決定（2026-11-14 13:47Z）で、下書きのデータだけの PR は Android の画像なしで develop へ取り込む。実機の確かめは #314 の行 2（iOS・Android、左と右）にまとめ、main の前に閉じる。

## 変更内容

関門（判断役の決定）:
- 前肢だけにした。
- どの関節も、隣り合う2つの骨に座標が既にある。
- 2人が別々に位置を出し、一致した物だけを足した。
- 今ある小さな部位が押せなくならないようにした。

| 関節 | 隣り合う骨 | 中心（画像の px） | 2人目の中心 |
|---|---|---|---|
| `joint-shoulder` 肩関節 | bone-scapula・bone-humerus | (558,515) | (557,510) |
| `joint-elbow` 肘関節 | bone-humerus・bone-radius | (632,632) | (617,645) |
| `joint-fetlock-fore` 球節（前肢） | bone-cannon・bone-phalanx | (610,992) | (610,996) |

足さなかった物:
- 手根: bone-carpus と重なり、overlap.test が落ちる。
- 飛節・膝・股関節: 判断役の決定で保留。後肢の関節の並びが不自然。
- 繋の関節: はっきりしない。
- 蹄関節: 蹄が殻だけで描かれている。

変えたファイル:
- `scripts/derive-parts-skeleton-left.ts`: 3つの関節を足した。球節の `labelAt` を手で決める表も足した。
- `left.json`: derive を回すと、同じ内容が出てくる。
- `structures.ts`・`kana.ts`・`summary-en.ts`: 新しい部位の名前と説明を足した。
- 数の試験と baseline: データが変わった分だけ直した。baseline は関節3つの views と otherStructuresSha256 だけが変わる。
- `e2e/legacy-cannon-search.spec.ts` など e2e の数の待ち: 固定の数をやめ、`STRUCTURES.length` から作る。
- `README.md`・`doc/handoff.md`: 部位の数を直した。
- `kana.ts`: 肘関節の読み「ちゅうかんせつ」を足した。
- `search.test.ts`: 「ほね」で探すと、骨格の層の関節も出てくるようになった。それに合わせて、確かめ方を変えた。
- 画像: `doc/evidence/5-joints/`。

### 確かめた事

| | 結果 |
|---|---|
| validate:coords | OK（left 84/88、全体 122） |
| overlap・reachability の試験 | 合格 |
| type-check・lint | 合格 |
| 単体 | 1438 件が合格 |
| e2e | 274 件が合格（e6fd19a で計測、2026-11-14T14:20Z） |

## 関連Issue

Refs #5 #314
No-Close: 前肢の関節3つだけで、ほかの部位は絵が無い

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01Cv4a6DggpGHJAmmfXW7wbW
