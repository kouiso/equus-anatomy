REVIEW | reviewer: general-purpose, opus 5.5 medium | authored no commit on this PR | head 1b2ab6c54d970df24e7ead6176926bdb612c2d84 | axes: pass line, design, scope, tests, a11y, evidence | verdict PASS | must 0 want 0 nit 3

## pass line — 0件
- head 1b2ab6c, 3 commits on top of merge-base. origin/develop = 57cb049 (#310). The branch is 1 commit behind develop. #310 only touches `src/app/(tabs)/catalog/[id].tsx`, `src/ui/icons.tsx`, `e2e/catalog-detail-map.spec.ts`, the button-row evidence tool and PNGs, so no file overlaps this PR.
- `git merge-tree --write-tree origin/develop 1b2ab6c` -> e78c28a, exit 0, no conflicts.
- Detached worktree at head, `pnpm install --frozen-lockfile --offline`: done.
  - `node scripts/check-agent-entrypoints.mjs`: OK (2 Skills, no drift).
  - `node --test .github/ci/run.test.mjs`: 10/10 pass.
  - `node .github/ci/run.mjs checks`: exit 0, vitest 51 files / 1414 tests passed.
  - The worktree was removed afterwards.
- I did not run Playwright, e2e or Maestro, as instructed. The author's "e2e 275 passed" is (未確認) by me.

## design — 0件
- doc/design/project/review-2026-11-catalog.dc.html, column 3 「案 絞り込みを使っている時」 (l.116-133): `すべて解除` is the last `<button class="sg">` inside `.frow` (wrapping flex row, gap 6). Its style is `background: transparent; color: var(--bone)`, and `.sg` (l.28) is min-height 44, padding 0 14, pill radius, 400 14px.
- `src/app/(tabs)/catalog/index.tsx:189-194`: the reset Pressable is now the last child of `catalog-filters` (filterRow, flexWrap, gap 6).
- `src/app/(tabs)/catalog/index.tsx:344-346`:
  - `resetButton`: minHeight 44, pill, paddingHorizontal 14, no background.
  - `resetText`: fontSans 14, letterSpacing 0.35 (same as the FilterButton text in `src/ui/filter-sheet.tsx:108`), color bone.
  - This matches the design chip 1:1.
- Wrapping onto line 2 at 390px is decision (a), and is accepted.

## scope — 0件
- 7 files:
  - `src/app/(tabs)/catalog/index.tsx` (+9/-8: move the node, restyle two styles)
  - `e2e/catalog-reset-inline.spec.ts` (new)
  - `e2e/tools/catalog-reset-evidence.spec.ts` (new; `e2e/tools/**` is in `testIgnore` in playwright.config.ts:16, so it is outside the default run)
  - 4 PNGs under `doc/evidence/catalog-reset-inline/`
- No unrelated changes. i18n keys, `resetFilters` and the `filtersActive` gate are unchanged.

## tests — nit 2
- `e2e/catalog-reset-inline.spec.ts` is not vacuous:
  - l.20: DOM containment `catalog-filters >> catalog-filter-reset` toHaveCount(1). This fails on old code, where the reset was a sibling after the row.
  - l.27-28: computed font-size === '14px'. This fails on old code, where it was 12px.
  - l.15 / l.30-31: hidden with no filter, removed after click.
  - Height and left alignment are measured with boundingBox (l.22-25).
- Old "same row" assertion: grep of origin/develop `e2e/` finds no same-row / y-comparison assertion for the reset. Only `e2e/persistence.spec.ts:115` checks height >= 44, and it stays. Nothing had to be dropped.
- Other specs that click the reset (catalog-compact-list, catalog-not-learned, persistence, text-scale, v02-web-run) use only the testid, so they are unaffected by the move.
- nit 1 — `e2e/catalog-reset-inline.spec.ts:24`: `toBeGreaterThanOrEqual(44)` passes on old code too (minHeight 44 then), and it would also pass a 60px chip. The intent is "44px high, same as the chips". If an exact value is wanted at default text scale, compare with the layer chip height (`Math.abs(resetBox.height - layerBox.height) <= 1`).
- nit 2 — `e2e/catalog-reset-inline.spec.ts:25`: the left-edge check (`|reset.x - layer.x| <= 1`) also passes on old code (old marginLeft 16 = row paddingHorizontal 16). It works only because the reset wraps at 390px. If a later change lets all five fit on line 1, which would be closer to the design, this fails with a misleading message. Acceptable under decision (a). Optionally assert `resetBox.y > layerBox.y` first, so the precondition is explicit.

## a11y — nit 1
- Reset chip: `accessibilityRole="button"`, `accessibilityLabel` = `catalog.filterResetLabel` (ja 「絞り込みを解除」 / en "Clear all filters", `src/core/i18n/messages.ts:86,315`).
- It is distinguishable from the filter chips:
  - FilterButton (`src/ui/filter-sheet.tsx:43-47`) is a button with label 「<sheetTitle>: <value>」, `accessibilityState.expanded` and aria-haspopup.
  - 「まだ」 is `role=switch` with aria-checked.
  - The reset has no popup or state, and has a distinct name.
- Focus/reading order is unchanged: it was after the row, and is now the last item inside the row, still after 「まだ」.
- Tap target: minHeight 44 + paddingHorizontal 14. In after-390x844.png the chip occupies roughly 30-110 x 238-282 CSS px, so it is ≥44 in both axes.
- nit 3 (pre-existing, not introduced here) — `src/app/(tabs)/catalog/index.tsx:191`: the accessible name 「絞り込みを解除」 does not contain the visible text 「すべて解除」 (WCAG 2.5.3 Label in Name). Voice-control users saying "すべて解除" may not hit it. Also, the appearance of the chip is not announced (no live region). Both are the same as on develop, so they are follow-up candidates and not for this PR.
- Maestro: the only flow touching it is `.maestro/device/267-catalog-filters.yaml` (l.25-26, 56-57, 61-64, 81-82, 97-98, 109-110, 123-124). It uses only `id: catalog-filter-reset` with assertVisible / assertNotVisible / tapOn. There are no positional selectors (`below` / `rightOf` / `childOf` / `point`) anywhere in `.maestro/`, and no text match on 「すべて解除」. Nothing in Maestro asserts the old position or the 12px style -> no must.

## evidence — 0件
- Read with the Read tool:
  - after-390x844.png: chips 層:骨格 / 場所 / 向き / まだ on line 1, 「すべて解除」 in bone at 14px on line 2. The text starts at the chip text inset (x≈30), and the line-2 gap is 6px. This matches design column 3 apart from the accepted wrap.
  - after-320x568-text200.png: the row wraps to 3 lines and the reset is at the left of line 3, with no clipping.
  - before-390x844.png: same position, smaller 12px text.
- The before/after pair is shot under the same conditions (`e2e/tools/catalog-reset-evidence.spec.ts`, deviceScaleFactor 2, ja-JP), and shows the 12->14px change.
- The visual position difference is small by design: the old reset was already left-aligned below the row. The structural move (into catalog-filters) is proven by spec l.20, not by the PNGs.


LOCAL-CHECK | head 1b2ab6c54d970df24e7ead6176926bdb612c2d84 | node scripts/check-agent-entrypoints.mjs && node --test .github/ci/run.test.mjs && node .github/ci/run.mjs checks && pnpm build && node .github/ci/run.mjs e2e | pass: entrypoints OK・run.test 10/0・unit 1414・build OK・e2e 275 / fail 0・作業ツリー変更 0 | 2026-11-14T14:03Z

ローカルで通れば通ったと見なす（所有者の決定）。hosted CI が緑とは書かない。

GATE | head 1b2ab6c54d970df24e7ead6176926bdb612c2d84 | review このコメントの上の REVIEW（PASS、must 0） | evidence https://github.com/kouiso/equus-anatomy/blob/e2446cbc8a7f32a7a671e2e19f4411beec7e8c8f/evidence/315-1b2ab6c.png | checks local（上の LOCAL-CHECK） | deploy no production deploy（develop へ） | repo rule met（未解決のレビューのスレッド 0） | changed after pass: なし

---
_Generated by [Claude Code](https://claude.ai/code)_
