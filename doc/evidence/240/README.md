# #240 STG 配布の検証証跡（2026-10-29）

資格情報を使う実行（FAD への実配布）は局長ゲートで未実施。ここにあるのは実装の静的・生成物レベルの検証。

| 検証 | 方法 | 結果 | 証跡 |
|---|---|---|---|
| `APP_VARIANT=stg` で id・表示名が .stg 系に切り替わる | `pnpm expo config --type public`（APP_VARIANT 有無の両方） | stg: `jp.co.ritmo.equusanatomy.stg`・`EQUUS 馬体解剖 (STG)`。未設定: 本番値のまま | `expo-config.log` |
| stg prebuild 生成物の `applicationId` が期待値 | `CI=1 APP_VARIANT=stg node .github/ci/run.mjs android-prebuild` → workflow と同じ grep | `applicationId 'jp.co.ritmo.equusanatomy.stg'` で一致 | `prebuild-stg.log` |
| stg iOS の `CFBundleIdentifier` が期待値 | 同上 ios-prebuild → plist の `$(PRODUCT_BUNDLE_IDENTIFIER)` を pbxproj 解決（workflow の照合手順どおり） | `jp.co.ritmo.equusanatomy.stg` で一致。プロジェクト名は `EQUUSSTG`（2026-10-11 の本物の配布と同名） | `prebuild-stg.log` |
| `scripts/check-fad-config.sh` のガード網羅 | 9 ケース実行（prod/stg × android/ios × ref違反・secret空・stg=prod同値・target不正・未設定） | 想定どおり PASS/FAIL。prod は main 以外・secret/group 空で fail closed | `check-fad-config-matrix.log` |
| workflow の静的検査 | `actionlint .github/workflows/fad.yml`（shellcheck 込み） | クリーン | この表 |
| 回帰 | `pnpm type-check` / `pnpm lint` / `pnpm test`（1241 件） / `pnpm validate:coords` / `node scripts/check-agent-entrypoints.mjs` | 全て緑（`import-annotations.test.ts` が 1 回だけタイミング flaky で落ちたが単独・全体再実行で緑） | この表 |

未検証（局長待ち）: FAD への実アップロード（`FIREBASE_TOKEN` 実行権限）、`FIREBASE_ANDROID_APP_ID_STG` の値が stg アプリを指すかの最終確認（ガードは「空でない・本番と違う」まで）、iOS stg の match profile 実作成（2026-10-11 に 1 回作ってあるはずだが certs repo の現物確認はまだ）、`stg-testers` への名簿追加。
