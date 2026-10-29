import { describe, expect, it } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { labelsFor, resolveLabels } = require('../.github/script/pr-auto-labels.js') as {
  labelsFor: (headRef: string, files: string[]) => string[];
  resolveLabels: (wanted: string[], existing: string[]) => { apply: string[]; skipped: string[] };
};

// repo 実測の既存ラベル（gh label list・2026-10-29）
const REPO_LABELS = [
  'accessibility', 'blocked-external', 'bug', 'dependencies', 'design',
  'design-lane', 'devin', 'documentation', 'duplicate', 'enhancement',
  'feature', 'github_actions', 'good first issue', 'help wanted',
  'invalid', 'javascript', 'owner-decision', 'question', 'wontfix',
];

describe('pr-auto-labels', () => {
  it('ブランチ名から既存の種別ラベルへ付け替える', () => {
    expect(labelsFor('feature/foo', [])).toEqual(['feature']);
    expect(labelsFor('feat/foo', [])).toEqual(['feature']);
    expect(labelsFor('fix/foo', [])).toEqual(['bug']);
    expect(labelsFor('bugfix/foo', [])).toEqual(['bug']);
    expect(labelsFor('hotfix/foo', [])).toEqual(['bug']);
    expect(labelsFor('docs/foo', [])).toEqual(['documentation']);
    expect(labelsFor('design/foo', [])).toEqual(['design']);
  });

  it('対応ラベルの無い種別は何も付けない', () => {
    expect(labelsFor('chore/foo', [])).toEqual([]);
    expect(labelsFor('refactor/foo', [])).toEqual([]);
    expect(labelsFor('release/1.0', [])).toEqual([]);
    expect(labelsFor('devin/work', [])).toEqual([]);
    expect(labelsFor('main', [])).toEqual([]);
  });

  it('パスから内容ラベルを付ける', () => {
    expect(labelsFor('x', ['docs/guide.md'])).toEqual(['documentation']);
    expect(labelsFor('x', ['README.md'])).toEqual(['documentation']);
    expect(labelsFor('x', ['package.json'])).toEqual(['dependencies']);
    expect(labelsFor('x', ['pnpm-lock.yaml'])).toEqual(['dependencies']);
    expect(labelsFor('x', ['.github/workflows/ci.yml'])).toEqual(['github_actions']);
    expect(labelsFor('x', ['design/spec.md'])).toEqual(['documentation', 'design']);
  });

  it('ブランチとパスを合成する', () => {
    const labels = labelsFor('feat/bar', ['src/app.tsx', 'docs/x.md', 'package.json']);
    expect(labels).toEqual(['feature', 'documentation', 'dependencies']);
  });

  it('出したいラベルが repo に無い時はスキップし、作らない', () => {
    // wanted に未知ラベルが混ざるのは repo 側でラベルが消えた時のみ起こり得る
    const { apply, skipped } = resolveLabels(['bug', 'bugfix', 'release'], REPO_LABELS);
    expect(apply).toEqual(['bug']);
    expect(skipped).toEqual(['bugfix', 'release']);
  });

  it('repo 実測ラベルに対し labelsFor の全出力が付与可能', () => {
    const cases = [
      ['feature/foo', []],
      ['fix/foo', []],
      ['hotfix/foo', []],
      ['docs/foo', []],
      ['design/foo', []],
      ['x', ['docs/g.md', 'package.json', '.github/workflows/a.yml', 'design/s.md']],
    ] as const;
    for (const [ref, files] of cases) {
      const { apply, skipped } = resolveLabels(labelsFor(ref, [...files]), REPO_LABELS);
      expect(skipped).toEqual([]);
      expect(apply.length).toBeGreaterThan(0);
    }
  });

  it('src だけなら内容ラベルは付かない', () => {
    expect(labelsFor('feat/bar', ['src/core/kana.ts'])).toEqual(['feature']);
  });
});
