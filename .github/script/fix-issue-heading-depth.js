'use strict';

// WHY: issue フォーム経由で作ると全見出しが1段深くなるため、作成直後に
// ### → ##・#### → ### へ戻す (#244 項目3)。
// 手書きの入れ子見出しを潰さないため、本文中の全 `#{3,}` 見出しが
// 既知フォームの label と一致する時だけ書き換える（フォーム由来の判定）。
// コードフェンス内は触らない。

// 既知フォームの label（ISSUE_TEMPLATE/*.yml と kouiso/.github 組織既定）。
// フォームを増やす時はここに label を追加する。
const FORM_HEADINGS = new Set([
  // report.yml
  '背景', '今どこまで', '次にやること', '誰の判断待ち', '完了条件',
  // bug.yml
  'なぜ直したいか（必須）', '何が起きたか（必須）', 'どれくらい困っとるか（必須）',
  '手がかり（任意）', 'どうなったら終わりか（必須）', 'その他（任意）',
  // feature.yml
  'なぜ欲しいか（必須）', '急ぎ具合（任意）',
  // sbi.yml
  'メモ（任意）',
  // todo.yml
  '何をしてほしいか（必須）', 'いつまでに（任意）',
]);

const DEEP_HEADING = /^(#{3,6})\s+(.+?)\s*$/;
const FENCE = /^\s*```/;

function normalizeName(raw) {
  return raw.replace(/\s+/g, '');
}

function fixIssueHeadingDepth(rawBody) {
  const body = rawBody || '';
  const lines = body.split('\n');
  let inFence = false;
  const deep = [];
  for (const line of lines) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = line.match(DEEP_HEADING);
    if (m) deep.push(normalizeName(m[2]));
  }
  // WHY: フォーム由来でない（label に無い見出しが1つでもある）本文は手書きと
  // みなして一切触らない。潰すリスクより取りこぼしを選ぶ。
  if (deep.length === 0 || deep.some((name) => !FORM_HEADINGS.has(name))) {
    return { body, changed: false };
  }
  inFence = false;
  const out = lines.map((line) => {
    if (FENCE.test(line)) {
      inFence = !inFence;
      return line;
    }
    if (inFence) return line;
    const m = line.match(DEEP_HEADING);
    if (!m) return line;
    return `${m[1].slice(1)} ${m[2]}`;
  });
  return { body: out.join('\n'), changed: true };
}

module.exports = { fixIssueHeadingDepth, FORM_HEADINGS };
