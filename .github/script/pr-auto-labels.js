'use strict';

// WHY: PR にブランチ名と変更パスからラベルを付ける (#244 項目5)。
// 既存ラベルは消さない（add のみ）。判定は文字規則のみで AI は使わない。

const BRANCH_LABELS = [
  [/^(feature|feat)\//, 'feature'],
  [/^(bugfix|fix)\//, 'bugfix'],
  [/^hotfix\//, 'hotfix'],
  [/^(chore|refactor)\//, 'chore'],
  [/^docs\//, 'documentation'],
  [/^release\//, 'release'],
];

const PATH_LABELS = [
  [/^(docs\/|.*\.md$)/, 'documentation'],
  [/package\.json$|pnpm-lock\.yaml$/, 'dependencies'],
  [/^\.github\/workflows\//, 'github_actions'],
];

function labelsFor(headRef, files) {
  const labels = new Set();
  for (const [pattern, label] of BRANCH_LABELS) {
    if (pattern.test(headRef || '')) {
      labels.add(label);
      break;
    }
  }
  for (const file of files || []) {
    for (const [pattern, label] of PATH_LABELS) {
      if (pattern.test(file)) labels.add(label);
    }
  }
  return [...labels];
}

module.exports = { labelsFor, BRANCH_LABELS, PATH_LABELS };
