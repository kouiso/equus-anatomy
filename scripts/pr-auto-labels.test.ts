import { describe, expect, it } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { labelsFor } = require('../.github/script/pr-auto-labels.js') as {
  labelsFor: (headRef: string, files: string[]) => string[];
};

describe('pr-auto-labels', () => {
  it('ブランチ名から種別ラベルを付ける', () => {
    expect(labelsFor('feature/foo', [])).toEqual(['feature']);
    expect(labelsFor('feat/foo', [])).toEqual(['feature']);
    expect(labelsFor('fix/foo', [])).toEqual(['bugfix']);
    expect(labelsFor('bugfix/foo', [])).toEqual(['bugfix']);
    expect(labelsFor('hotfix/foo', [])).toEqual(['hotfix']);
    expect(labelsFor('refactor/foo', [])).toEqual(['chore']);
    expect(labelsFor('docs/foo', [])).toEqual(['documentation']);
    expect(labelsFor('release/1.0', [])).toEqual(['release']);
  });

  it('該当なしのブランチはラベル無し', () => {
    expect(labelsFor('devin/work', [])).toEqual([]);
    expect(labelsFor('main', [])).toEqual([]);
  });

  it('パスから内容ラベルを付ける', () => {
    expect(labelsFor('x', ['docs/guide.md'])).toEqual(['documentation']);
    expect(labelsFor('x', ['README.md'])).toEqual(['documentation']);
    expect(labelsFor('x', ['package.json'])).toEqual(['dependencies']);
    expect(labelsFor('x', ['pnpm-lock.yaml'])).toEqual(['dependencies']);
    expect(labelsFor('x', ['.github/workflows/ci.yml'])).toEqual(['github_actions']);
  });

  it('ブランチとパスを合成する', () => {
    const labels = labelsFor('feat/bar', ['src/app.tsx', 'docs/x.md', 'package.json']);
    expect(labels).toEqual(['feature', 'documentation', 'dependencies']);
  });

  it('src だけなら内容ラベルは付かない', () => {
    expect(labelsFor('feat/bar', ['src/core/kana.ts'])).toEqual(['feature']);
  });
});
