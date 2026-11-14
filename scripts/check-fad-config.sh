#!/usr/bin/env bash
# fad.yml の配布前ガード。target・ref・Firebase app id を検査し、
# 解決した app id・期待 package/bundle id・配布グループを $GITHUB_ENV へ出す。
# ローカル検証時は env を直接渡せば GitHub Actions なしで動く（副作用なし）。
#
# usage: GITHUB_REF_NAME=main FAD_TARGET=prod \
#          FIREBASE_ANDROID_APP_ID=... FAD_GROUP_ANDROID=... \
#          bash scripts/check-fad-config.sh android
set -euo pipefail

PLATFORM="${1:?android|ios を指定}"
case "$PLATFORM" in
  android | ios) ;;
  *)
    echo "platform が不正: $PLATFORM" >&2
    exit 1
    ;;
esac

TARGET="${FAD_TARGET:?FAD_TARGET=stg|prod を指定}"
REF="${GITHUB_REF_NAME:-}"

if [ "$PLATFORM" = "android" ]; then
  STG_APP_ID="${FIREBASE_ANDROID_APP_ID_STG:-}"
  PROD_APP_ID="${FIREBASE_ANDROID_APP_ID:-}"
  APP_ID_ENV="FIREBASE_ANDROID_APP_ID"
  PROD_GROUP="${FAD_GROUP_ANDROID:-}"
else
  STG_APP_ID="${FIREBASE_IOS_APP_ID_STG:-}"
  PROD_APP_ID="${FIREBASE_IOS_APP_ID:-}"
  APP_ID_ENV="FIREBASE_IOS_APP_ID"
  PROD_GROUP="${FAD_GROUP_IOS:-}"
fi

case "$TARGET" in
  stg)
    # stg はブランチを問わず回せる（feature ブランチの検証配布も許す）。
    # 誤配布の防止は STG app id の存在・本番との非一致・prebuild 後の package 照合で担保する
    [ -n "$STG_APP_ID" ] || {
      echo "STG 用 secret ${APP_ID_ENV}_STG が未設定/空。本番 app への誤配布を防ぐため中止" >&2
      exit 1
    }
    [ "$STG_APP_ID" != "$PROD_APP_ID" ] || {
      echo "STG 用 secret に本番 app id と同値が設定されている（誤設定）。中止" >&2
      exit 1
    }
    RESOLVED_APP_ID="$STG_APP_ID"
    EXPECTED_PACKAGE="jp.co.ritmo.equusanatomy.stg"
    EXPECTED_GROUP="${FAD_GROUP_STG:-stg-testers}"
    ;;
  prod)
    # 本番配布は main からのみ。未マージのコードをテスターへ出せないようにする
    [ "$REF" = "main" ] || {
      echo "本番配布は main ブランチからのみ (ref=$REF)" >&2
      exit 1
    }
    [ -n "$PROD_APP_ID" ] || {
      echo "本番用 secret ${APP_ID_ENV} が未設定/空" >&2
      exit 1
    }
    [ -n "$PROD_GROUP" ] || {
      echo "本番グループの env が未設定/空" >&2
      exit 1
    }
    RESOLVED_APP_ID="$PROD_APP_ID"
    EXPECTED_PACKAGE="jp.co.ritmo.equusanatomy"
    EXPECTED_GROUP="$PROD_GROUP"
    ;;
  *)
    echo "target が不正: '$TARGET' (stg|prod)" >&2
    exit 1
    ;;
esac

echo "target=$TARGET ref=$REF group=$EXPECTED_GROUP package=$EXPECTED_PACKAGE" >&2

if [ -n "${GITHUB_ENV:-}" ]; then
  {
    echo "${APP_ID_ENV}=${RESOLVED_APP_ID}"
    echo "EXPECTED_PACKAGE=${EXPECTED_PACKAGE}"
    echo "FAD_GROUP=${EXPECTED_GROUP}"
  } >>"$GITHUB_ENV"
fi

# ローカル検証用に値を標準出力でも返す
echo "$RESOLVED_APP_ID"
