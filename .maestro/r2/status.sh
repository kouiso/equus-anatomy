#!/usr/bin/env bash
# r2-gallery の commit に合否（equus/r2-maestro）を付け、PR の画面から結果に辿れるようにする。
# 書けなかった時は理由を warning に出す。確認そのものの合否はこの job の結果で決まる。
# 使い方: status.sh <pending|success|failure> <説明>   環境変数: PAT SHA RUN_URL
set -euo pipefail

body=$(python3 -c 'import json,sys; print(json.dumps({"state": sys.argv[1], "description": sys.argv[2][:140], "context": "equus/r2-maestro", "target_url": sys.argv[3]}))' "$1" "$2" "$RUN_URL")
code=$(curl -s -o /tmp/r2-status.json -w '%{http_code}' -X POST \
  -H "Authorization: Bearer $PAT" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/kouiso/r2-gallery/statuses/$SHA" -d "$body")
if [ "$code" = "201" ]; then
  echo "r2-gallery@$SHA に $1 を付けた"
else
  echo "::warning::r2-gallery の commit に結果を付けられませんでした（HTTP $code）。R2G_PAT に Commit statuses の書き込み権限があるか確認が要ります"
fi
