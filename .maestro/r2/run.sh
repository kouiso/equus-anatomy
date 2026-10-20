#!/usr/bin/env bash
# エミュレータに APK を入れ、端末側に選ぶ写真を置いてから Maestro を流す。
# 画面の画像やログは外に出さない（このリポは公開で、r2-gallery は非公開のため）。
# 落ちた時だけ、その時の画面の文字（試験用のファイル名とボタン名だけ）を出して原因を追えるようにする。
# 使い方: run.sh <APK> <作業ディレクトリ>
# 環境変数 KMP_APK に KMP 版の APK を渡すと、先に KMP 版を入れて開き、その上に APK を上書きして開けるかも確かめる
set -euo pipefail

APK=$1
WORK=$2
HERE=$(cd "$(dirname "$0")" && pwd)

# 落ちた時だけ、その時の画面の文字・手元 Worker が受けた要求・アプリのログを出す
dump_diag() {
  echo "::group::落ちた時の画面の文字"
  maestro hierarchy | python3 "$HERE/hierarchy-text.py" || true
  echo "::endgroup::"
  # 手元 Worker が受けた要求（メソッド・パス・状態だけ。トークンは出ない）とアプリのログ
  echo "::group::手元 Worker が受けた要求"
  grep -E "^\[wrangler:info\] (GET|PUT|POST|DELETE)" "$WORK/wrangler.log" | sed -E 's/\?[^ ]*//' | tail -50 || true
  echo "::endgroup::"
  echo "::group::アプリのログ"
  adb logcat -d -s flutter:V AndroidRuntime:E | tail -80
  echo "::endgroup::"
}

# firstInstallTime は「日付 時刻」で空白を含むので、行の残り全部を取る
version_code() {
  adb shell dumpsys package app.r2gallery | sed -n 's/^ *versionCode=\([0-9]*\).*/\1/p' | head -1
}
first_install() {
  adb shell dumpsys package app.r2gallery | sed -n 's/^ *firstInstallTime=\(.*\)$/\1/p' | tr -d '\r' | head -1
}

# 磯貝さんの端末は KMP 版から FAD で Flutter 版へ上書き更新する。署名か versionCode が合わんと
# 「アプリをインストールできません」になり、消して入れ直すと端末の設定が飛ぶ。その経路をここで通す
upgrade_from_kmp() {
  row() { echo "| $1 | $2 |" >> "$WORK/upgrade.md"; }
  printf '\n## KMP 版からの上書き更新\n\n| 段 | 結果 |\n| --- | --- |\n' > "$WORK/upgrade.md"
  adb install "$KMP_APK"
  local first_before code_before
  first_before=$(first_install)
  code_before=$(version_code)
  echo "KMP 版: versionCode=$code_before firstInstallTime=$first_before"
  if ! maestro test --format junit --output "$WORK/maestro-upgrade-kmp.xml" "$HERE/upgrade/kmp-before.yaml"; then
    row "KMP 版を開いて一覧を出す（versionCode $code_before）" "失敗"
    dump_diag
    exit 1
  fi
  row "KMP 版を開いて一覧を出す（versionCode $code_before）" "成功"
  # -r だけで入れる（-d で下げたり、消してから入れたりはしない）。端末で起きる上書き更新と同じ条件
  if ! adb install -r "$APK"; then
    row "Flutter 版を上書き（署名と versionCode）" "失敗"
    # 署名の証明書の指紋は公開情報だが、このリポは公開なので先頭 12 桁だけ出して一致かどうかを見る
    local apksigner cert
    apksigner=$(ls "$ANDROID_HOME"/build-tools/*/apksigner | tail -1)
    for f in "$KMP_APK" "$APK"; do
      cert=$("$apksigner" verify --print-certs "$f" | sed -n 's/.*certificate SHA-256 digest: \(.\{12\}\).*/\1/p' | head -1)
      echo "署名の指紋（先頭 12 桁）: $(basename "$f") $cert"
    done
    echo "::error::KMP 版の上に Flutter 版を上書きできません（署名の不一致か versionCode の逆転）"
    exit 1
  fi
  local first_after code_after
  first_after=$(first_install)
  code_after=$(version_code)
  echo "Flutter 版: versionCode=$code_after firstInstallTime=$first_after"
  # 入れ直しになっていれば firstInstallTime が変わる。同じなら上書き更新でデータを持ち越している
  if [ "$first_after" != "$first_before" ] || [ "$code_after" -le "$code_before" ]; then
    row "Flutter 版を上書き（versionCode $code_before → $code_after）" "失敗"
    echo "::error::上書き更新になっていません（firstInstallTime $first_before → $first_after）"
    exit 1
  fi
  row "Flutter 版を上書き（versionCode $code_before → $code_after・入れ直しなし）" "成功"
  if ! maestro test --format junit --output "$WORK/maestro-upgrade-flutter.xml" "$HERE/upgrade/flutter-after.yaml"; then
    row "上書き後に Flutter 版を開いて一覧を出す" "失敗"
    dump_diag
    exit 1
  fi
  row "上書き後に Flutter 版を開いて一覧を出す" "成功"
}

adb wait-for-device
# エミュレータの仮想ネットワークは起動直後に繋がっていないことがある（10.0.2.2 が unreachable）。
# adb の転送でホストの手元 Worker を端末の 127.0.0.1:8787 に見せ、ネットワークの状態に左右されんようにする
adb reverse tcp:8787 tcp:8787
# アプリより先に、端末から手元 Worker に届くかを確かめる（届かん時にアプリの不具合と見分けるため）
echo "端末 → 127.0.0.1:8787/health:"
adb shell 'printf "GET /health HTTP/1.0\r\nHost: 127.0.0.1\r\n\r\n" | toybox nc -w 5 127.0.0.1 8787' | tail -1
if [ -n "${KMP_APK:-}" ]; then
  upgrade_from_kmp
else
  adb install -r "$APK"
fi
# リリース版の manifest に INTERNET が無いと、どの接続先にも繋がらん（debug 版には Flutter の雛形が足すので気づきにくい）
perms=$(adb shell dumpsys package app.r2gallery | sed -n '/requested permissions:/,/install permissions:/p')
echo "$perms"
if ! grep -q 'android.permission.INTERNET' <<<"$perms"; then
  echo "::error::APK が android.permission.INTERNET を要求していません。リリース版はネットに繋がりません"
  exit 1
fi
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
  dump_diag
fi
exit "$status"
