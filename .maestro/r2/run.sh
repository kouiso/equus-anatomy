#!/usr/bin/env bash
# エミュレータに APK を入れ、端末側に選ぶ写真を置いてから Maestro を流す。
# 画面の画像やログは外に出さない（このリポは公開で、r2-gallery は非公開のため）。
# 落ちた時だけ、その時の画面の文字（試験用のファイル名とボタン名だけ）を出して原因を追えるようにする。
# 使い方: run.sh <APK> <作業ディレクトリ>
set -euo pipefail

APK=$1
WORK=$2
HERE=$(cd "$(dirname "$0")" && pwd)

adb wait-for-device
# アプリより先に、エミュレータからホストの手元 Worker に届くかを確かめる（届かん時にアプリの不具合と見分けるため）
echo "エミュレータ → 10.0.2.2:8787/health:"
adb shell 'printf "GET /health HTTP/1.0\r\nHost: 10.0.2.2\r\n\r\n" | toybox nc -w 5 10.0.2.2 8787' | tail -1
adb install -r "$APK"
adb logcat -c
adb push "$WORK/maestro-upload.jpg" /sdcard/Pictures/maestro-upload.jpg
# 端末の選択画面に出すため、置いた写真をメディアの一覧へ載せる
adb shell content call --method scan_volume --uri content://media --arg external_primary
adb shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE \
  -d file:///sdcard/Pictures/maestro-upload.jpg

set +e
maestro test --format junit --output "$WORK/maestro-results.xml" \
  -e WORKER=http://127.0.0.1:8787 -e TOKEN=live-token "$HERE"
status=$?
set -e

if [ "$status" -ne 0 ]; then
  echo "::group::落ちた時の画面の文字"
  maestro hierarchy | python3 "$HERE/hierarchy-text.py"
  echo "::endgroup::"
  # 手元 Worker が受けた要求（メソッド・パス・状態だけ。トークンは出ない）とアプリのログ
  echo "::group::手元 Worker が受けた要求"
  grep -E "^\[wrangler:info\] (GET|PUT|POST|DELETE)" "$WORK/wrangler.log" | sed -E 's/\?[^ ]*//' | tail -50
  echo "::endgroup::"
  echo "::group::アプリのログ"
  adb logcat -d -s flutter:V AndroidRuntime:E | tail -80
  echo "::endgroup::"
fi
exit "$status"
