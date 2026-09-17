'use strict';

const CLOSING_KEYWORD_PATTERN =
  /\b(close[sd]?|fix(e[sd])?|resolve[sd]?)\b\s*:?\s+(?:[\w.-]+\/[\w.-]+)?#\d+/i;

const NO_CLOSE_OPT_OUT_PATTERN = /^\s*No-Close:\s*(\S.*)$/im;

function hasValidReference(rawBody) {
  const body = (rawBody || '').replace(/<!--[\s\S]*?-->/g, '');
  return CLOSING_KEYWORD_PATTERN.test(body) || NO_CLOSE_OPT_OUT_PATTERN.test(body);
}

module.exports = { hasValidReference, CLOSING_KEYWORD_PATTERN, NO_CLOSE_OPT_OUT_PATTERN };
