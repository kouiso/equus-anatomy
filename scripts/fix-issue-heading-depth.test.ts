import { describe, expect, it } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { fixIssueHeadingDepth } = require('../.github/script/fix-issue-heading-depth.js') as {
  fixIssueHeadingDepth: (body: string) => { body: string; changed: boolean };
};

describe('fix-issue-heading-depth', () => {
  it('### を ## へ、#### を ### へ戻す', () => {
    const src = '### 背景\nx\n#### 詳細\ny\n##### 補足\nz';
    const { body, changed } = fixIssueHeadingDepth(src);
    expect(changed).toBe(true);
    expect(body).toBe('## 背景\nx\n### 詳細\ny\n#### 補足\nz');
  });

  it('## しか無い本文は何もしない', () => {
    const src = '## 背景\nx\n## 完了条件\ny';
    const r = fixIssueHeadingDepth(src);
    expect(r.changed).toBe(false);
    expect(r.body).toBe(src);
  });

  it('コードフェンス内の ### は触らない', () => {
    const src = '### 背景\n```\n### comment in code\n```\n### 完了条件\nx';
    const { body } = fixIssueHeadingDepth(src);
    expect(body).toBe('## 背景\n```\n### comment in code\n```\n## 完了条件\nx');
  });

  it('見出しらしからぬ ###（空白無し）は触らない', () => {
    const src = '###背景\n###x';
    const r = fixIssueHeadingDepth(src);
    expect(r.changed).toBe(false);
  });

  it('本文が空でも落ちない', () => {
    const r = fixIssueHeadingDepth('');
    expect(r.changed).toBe(false);
  });
});
