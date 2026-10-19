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
adb install -r "$APK"
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
fi
exit "$status"
