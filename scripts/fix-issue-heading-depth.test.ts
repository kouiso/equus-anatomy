import { describe, expect, it } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { fixIssueHeadingDepth } = require('../.github/script/fix-issue-heading-depth.js') as {
  fixIssueHeadingDepth: (body: string) => { body: string; changed: boolean };
};

const FORM_ISSUE = [
  '### 背景',
  '公開リポなので書き方をそろえたい',
  '### 今どこまで',
  '検査が無い',
  '### 次にやること',
  'チェッカーを入れる',
  '### 誰の判断待ち',
  'なし',
  '### 完了条件',
  '赤が出たらコメントが更新される',
].join('\n');

describe('fix-issue-heading-depth', () => {
  it('フォーム由来の issue は ### を ## へ戻す', () => {
    const { body, changed } = fixIssueHeadingDepth(FORM_ISSUE);
    expect(changed).toBe(true);
    expect(body).toContain('## 背景');
    expect(body).toContain('## 完了条件');
    expect(body).not.toMatch(/^### /m);
  });

  it('1欄だけのフォーム（メモ（任意））も戻す', () => {
    const { body, changed } = fixIssueHeadingDepth('### メモ（任意）\n\n短い依頼');
    expect(changed).toBe(true);
    expect(body).toBe('## メモ（任意）\n\n短い依頼');
  });

  it('手書きの ## + ### 入れ子は一切触らない', () => {
    const src = '## 概要\nx\n### 詳細な設計\ny\n#### さらに深い話\nz';
    const r = fixIssueHeadingDepth(src);
    expect(r.changed).toBe(false);
    expect(r.body).toBe(src);
  });

  it('フォーム見出しに手書きの ### が混ざる時は潰さず何もしない', () => {
    const src = '### 背景\nx\n### 自分で足した詳細\ny';
    const r = fixIssueHeadingDepth(src);
    expect(r.changed).toBe(false);
    expect(r.body).toBe(src);
  });

  it('コードフェンス内の ### は判定にも変換にも使わない', () => {
    const src = '### 背景\n```\n### フェンス内\n### 自由見出し\n```\n### 完了条件\nx';
    const { body, changed } = fixIssueHeadingDepth(src);
    expect(changed).toBe(true);
    expect(body).toBe('## 背景\n```\n### フェンス内\n### 自由見出し\n```\n## 完了条件\nx');
  });

  it('見出しらしからぬ ###（空白無し）は対象外', () => {
    const r = fixIssueHeadingDepth('###背景\n###x');
    expect(r.changed).toBe(false);
  });

  it('## しか無い本文は何もしない', () => {
    const src = '## 背景\nx\n## 完了条件\ny';
    const r = fixIssueHeadingDepth(src);
    expect(r.changed).toBe(false);
  });

  it('本文が空でも落ちない', () => {
    expect(fixIssueHeadingDepth('').changed).toBe(false);
  });
});
