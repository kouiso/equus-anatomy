'use strict';

// WHY: PR にブランチ名と変更パスからラベルを付ける (#244 項目5)。
// 既存ラベルは消さない（add のみ）。判定は文字規則のみで AI は使わない。
// 新しいラベルは作らない（オーナーの恒久指示）— 対応する既存ラベルが無い
// 種別はマッピング自体を持たず、付与側でも repo の一覧と照合して落とす。

const BRANCH_LABELS = [
  [/^(feature|feat)\//, 'feature'],
  [/^(bugfix|fix|hotfix)\//, 'bug'],
  [/^docs\//, 'documentation'],
  [/^design\//, 'design'],
];

const PATH_LABELS = [
  [/^(docs\/|.*\.md$)/, 'documentation'],
  [/package\.json$|pnpm-lock\.yaml$/, 'dependencies'],
  [/^\.github\/workflows\//, 'github_actions'],
  [/(^|\/)design\//, 'design'],
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

// WHY: repo のラベルは後から変わり得る。付与前に一覧と照合し、
// 存在しないラベルは作らずスキップする（呼び出し側が skipped を記録する）。
function resolveLabels(wanted, existingNames) {
  const have = new Set(existingNames || []);
  const apply = [];
  const skipped = [];
  for (const label of wanted || []) {
    (have.has(label) ? apply : skipped).push(label);
  }
  return { apply, skipped };
}

module.exports = { labelsFor, resolveLabels, BRANCH_LABELS, PATH_LABELS };
