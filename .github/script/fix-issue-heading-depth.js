'use strict';

// WHY: issue フォーム経由で作ると見出しが1段深くなるため、作成直後に
// ### → ##・#### → ### へ戻す (#244 項目3)。コードフェンス内は触らない。

function fixIssueHeadingDepth(rawBody) {
  const body = rawBody || '';
  const lines = body.split('\n');
  let inFence = false;
  let changed = false;
  const out = lines.map((line) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return line;
    }
    if (inFence) return line;
    const m = line.match(/^(#{3,6})(\s+.*)$/);
    if (!m) return line;
    changed = true;
    return `${m[1].slice(1)}${m[2]}`;
  });
  return { body: out.join('\n'), changed };
}

module.exports = { fixIssueHeadingDepth };
