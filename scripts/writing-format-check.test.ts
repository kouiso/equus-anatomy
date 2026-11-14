import { describe, expect, it } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { checkBody } = require('../.github/script/writing-format-check.js') as {
  checkBody: (kind: 'issue' | 'pr', body: string) => { ok: boolean; reasons: string[] };
};

const FULL_ISSUE = [
  '## 背景',
  '公開リポなので書き方をそろえたい',
  '## 今どこまで',
  '検査が無い',
  '## 次にやること',
  'チェッカーを入れる',
  '## 誰の判断待ち',
  'なし',
  '## 完了条件',
  '赤が出たらコメントが更新される',
].join('\n');

const FULL_PR = [
  '## 概要',
  'チェッカーを追加する',
  '## 変更内容',
  'script と workflow を追加',
  '## 関連Issue',
  'Closes #244',
].join('\n');

describe('writing-format-check', () => {
  it('issue: 5 節そろえば ok', () => {
    expect(checkBody('issue', FULL_ISSUE)).toEqual({ ok: true, reasons: [] });
  });

  it('issue: ### でも見出しとして数える', () => {
    const body = FULL_ISSUE.replaceAll('## ', '### ');
    expect(checkBody('issue', body).ok).toBe(true);
  });

  it('issue: 見出しが無い節は未記入', () => {
    const body = FULL_ISSUE.replace('## 完了条件', '完了条件');
    const r = checkBody('issue', body);
    expect(r.ok).toBe(false);
    expect(r.reasons.join()).toContain('完了条件');
  });

  it('issue: 見出しだけ・器だけ・コメントだけは未記入', () => {
    const empty = FULL_ISSUE.replace('チェッカーを入れる', '<!-- あとで -->\n-\n- [ ]');
    const r = checkBody('issue', empty);
    expect(r.ok).toBe(false);
    expect(r.reasons.join()).toContain('次にやること');
  });

  it('issue: 次の見出しの手前までが中身（混入しない）', () => {
    const r = checkBody('issue', '## 背景\n## 今どこまで\nx\n## 次にやること\nx\n## 誰の判断待ち\nx\n## 完了条件\nx');
    expect(r.reasons.join()).toContain('背景');
    expect(r.reasons.join()).not.toContain('今どこまで');
  });

  it('issue: 先頭の自由文は見出し判定に混ざらない', () => {
    const r = checkBody('issue', `# タイトル\n自由文\n${FULL_ISSUE}`);
    expect(r.ok).toBe(true);
  });

  it('pr: 3 節と Closes 参照で ok', () => {
    expect(checkBody('pr', FULL_PR)).toEqual({ ok: true, reasons: [] });
  });

  it('pr: Refs と No-Close も受理する', () => {
    expect(checkBody('pr', FULL_PR.replace('Closes #244', 'Refs: #244')).ok).toBe(true);
    expect(checkBody('pr', FULL_PR.replace('Closes #244', 'No-Close: 雛形だけ')).ok).toBe(true);
  });

  it('pr: 関連Issue が節だけあるが参照が無いと理由が出る', () => {
    const r = checkBody('pr', FULL_PR.replace('Closes #244', 'あとで書く'));
    expect(r.ok).toBe(false);
    expect(r.reasons.join()).toContain('関連Issue');
  });

  it('pr: 関連 Issue の空白揺れも見出しとして認める', () => {
    const r = checkBody('pr', FULL_PR.replace('## 関連Issue', '## 関連 Issue'));
    expect(r.ok).toBe(true);
  });
});
