#!/usr/bin/env bash
# なぜ: PR差分と履歴全体の検査範囲をローカルでも変えない。
set -euo pipefail
if [ "${CI_EVENT_NAME:-push}" = pull_request ]; then
  : "${CI_PR_BASE_SHA:?PR base SHA is required}" "${CI_PR_HEAD_SHA:?PR head SHA is required}"
  gitleaks git --log-opts="${CI_PR_BASE_SHA}..${CI_PR_HEAD_SHA}" --redact --no-banner --exit-code 1
else
  gitleaks git --redact --no-banner --exit-code 1
fi
