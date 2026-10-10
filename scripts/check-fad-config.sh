#!/usr/bin/env bash
# fad.yml の配布前ガード。STG/PROD の target・ref・Firebase app id を検査し、
# 解決した app id と期待 package/bundle id を $GITHUB_ENV へ出す。
# ローカル検証時は env を直接渡せば GitHub Actions なしで動く（副作用なし）。
#
# usage: GITHUB_REF_NAME=develop FAD_TARGET=stg \
#          FIREBASE_ANDROID_APP_ID_STG=... FIREBASE_ANDROID_APP_ID=... \
#          bash scripts/check-fad-config.sh android
set -euo pipefail

PLATFORM="${1:?android|ios を指定}"
case "$PLATFORM" in
  android) ;;
  ios) ;;
  *) echo "platform が不正: $PLATFORM" >&2; exit 1 ;;
esac

TARGET="${FAD_TARGET:-}"
REF="${GITHUB_REF_NAME:-}"

if [ "$PLATFORM" = "android" ]; then
  STG_APP_ID="${FIREBASE_ANDROID_APP_ID_STG:-}"
  PROD_APP_ID="${FIREBASE_ANDROID_APP_ID:-}"
  APP_ID_ENV="FIREBASE_ANDROID_APP_ID"
else
  STG_APP_ID="${FIREBASE_IOS_APP_ID_STG:-}"
  PROD_APP_ID="${FIREBASE_IOS_APP_ID:-}"
  APP_ID_ENV="FIREBASE_IOS_APP_ID"
fi

case "$TARGET" in
  stg)
    [ "$REF" = "develop" ] || { echo "STG 配布は develop ブランチからのみ (ref=$REF)" >&2; exit 1; }
    [ -n "$STG_APP_ID" ] || { echo "STG 用 secret ${APP_ID_ENV}_STG が未設定/空。PROD app への誤配布を防ぐため中止" >&2; exit 1; }
    [ "$STG_APP_ID" != "$PROD_APP_ID" ] || { echo "STG 用 secret に PROD app id と同値が設定されている（誤設定）。中止" >&2; exit 1; }
    RESOLVED_APP_ID="$STG_APP_ID"
    EXPECTED_PACKAGE="jp.co.ritmo.equusanatomy.stg"
    EXPECTED_GROUP="stg-testers"
    ;;
  prod)
    [ "$REF" = "main" ] || { echo "PROD 配布は main ブランチからのみ (ref=$REF)" >&2; exit 1; }
    [ -n "$PROD_APP_ID" ] || { echo "PROD 用 secret ${APP_ID_ENV} が未設定/空" >&2; exit 1; }
    RESOLVED_APP_ID="$PROD_APP_ID"
    EXPECTED_PACKAGE="jp.co.ritmo.equusanatomy"
    EXPECTED_GROUP="beta-testers"
    ;;
  *)
    echo "target が不正: '$TARGET' (stg|prod)" >&2
    exit 1
    ;;
esac

echo "target=$TARGET ref=$REF group=$EXPECTED_GROUP package=$EXPECTED_PACKAGE app_id=$RESOLVED_APP_ID" >&2

if [ -n "${GITHUB_ENV:-}" ]; then
  {
    echo "${APP_ID_ENV}=${RESOLVED_APP_ID}"
    echo "EXPECTED_PACKAGE=${EXPECTED_PACKAGE}"
    echo "FAD_GROUP=${EXPECTED_GROUP}"
  } >> "$GITHUB_ENV"
fi

# ローカル検証用に値を標準出力でも返す
echo "$RESOLVED_APP_ID"
