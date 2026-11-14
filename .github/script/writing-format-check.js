'use strict';

// WHY: issue/PR の書き方を文字の規則だけで検査する (#244 項目2)。
// AI は使わない — 見出しの有無と「中身が書いてあるか」だけを見る。
// 判定に使うのは本文テキストのみ。PR のコードは一切取り出さない。

const ISSUE_SECTIONS = ['背景', '今どこまで', '次にやること', '誰の判断待ち', '完了条件'];
const PR_SECTIONS = ['概要', '変更内容', '関連Issue'];

const HEADING = /^(#{2,6})\s*(.+?)\s*$/gm;
const COMMENT = /<!--[\s\S]*?-->/g;
// 中身判定から外す行: 空行・HTMLコメント・文字の無い箇条書きの器だけ
const PLACEHOLDER_LINE = /^\s*(?:[-*+]|\d+[.)])?\s*(?:\[[ xX]\])?\s*$/;
// 「関連Issue」節で受理する参照形式。No-Close はこのリポの確立した免除形式。
const ISSUE_REFERENCE = /\b(close[sd]?|fix(e[sd])?|resolve[sd]?)\b\s*:?\s+(?:[\w.-]+\/[\w.-]+)?#\d+|^\s*Refs:?\s*#?\d+|^\s*No-Close:\s*\S/im;

function normalizeName(raw) {
  return raw.replace(/\s+/g, '');
}

function sections(body) {
  const text = (body || '').replace(COMMENT, '');
  const found = [];
  const re = new RegExp(HEADING);
  let match;
  while ((match = re.exec(text))) {
    found.push({ name: normalizeName(match[2]), start: match.index, contentStart: match.index + match[0].length });
  }
  const result = {};
  for (let i = 0; i < found.length; i++) {
    const end = i + 1 < found.length ? found[i + 1].start : text.length;
    result[found[i].name] = text.slice(found[i].contentStart, end);
  }
  return result;
}

function hasContent(text) {
  return text.split('\n').some((line) => !PLACEHOLDER_LINE.test(line));
}

function checkBody(kind, body) {
  const required = kind === 'pr' ? PR_SECTIONS : ISSUE_SECTIONS;
  const map = sections(body);
  const missing = required.filter((name) => !(name in map) || !hasContent(map[name]));
  const reasons = missing.map((name) => `「${name}」が無いか中身が空`);
  if (kind === 'pr' && !missing.includes('関連Issue') && !ISSUE_REFERENCE.test(map['関連Issue'])) {
    reasons.push('「関連Issue」に `Closes #番号`・`Refs #番号`・`No-Close: <理由>` のいずれかが無い');
  }
  return { ok: reasons.length === 0, reasons };
}

module.exports = { checkBody, ISSUE_SECTIONS, PR_SECTIONS };
