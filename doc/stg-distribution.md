# STG 配布の回し方（Firebase App Distribution）

issue #240。EQUUS の検証用配布。本番とは別のアプリ（`.stg` サフィックス）として端末に共存インストールできる。

## 構成

| | 本番 (prod) | 検証 (stg) |
|---|---|---|
| Android package / iOS bundle id | `jp.co.ritmo.equusanatomy` | `jp.co.ritmo.equusanatomy.stg` |
| 表示名 | EQUUS 馬体解剖 | EQUUS 馬体解剖 (STG) |
| Firebase プロジェクト | `equus-anatomy`（番号 `318538396032`。両環境とも同じ） | 同じ |
| FAD アプリ | `FIREBASE_ANDROID_APP_ID` / `FIREBASE_IOS_APP_ID`（secrets） | `FIREBASE_ANDROID_APP_ID_STG` / `FIREBASE_IOS_APP_ID_STG`（secrets） |
| FAD テスターグループ | `equus-testers-android` / `equus-testers-ios` | `stg-testers`（iOS・Android 共通） |
| iOS 署名 | match adhoc `jp.co.ritmo.equusanatomy` | match adhoc `jp.co.ritmo.equusanatomy.stg`（同じ証明書・同じ登録端末群） |

仕組み:

- `app.config.ts` が `APP_VARIANT=stg` で id と表示名に `.stg` / `(STG)` を付ける。未設定なら app.json の本番値そのまま
- `fad.yml` の `target` 入力（`prod`/`stg`）が `APP_VARIANT`・FAD app・グループを一括で切り替える
- `scripts/check-fad-config.sh` が各ジョブ先頭で target・ref・secrets を検査し、解決した app id・期待 package・グループを `$GITHUB_ENV` へ出す
- prebuild 後に生成物の `applicationId` / `CFBundleIdentifier` を期待値と照合する（stg ビルドを本番 id のまま出す事故を止める）

## 配布する

GitHub Actions → `FAD Distribution` → Run workflow:

| 入力 | 意味 |
|---|---|
| Use workflow from | 配布したいコードのブランチ。prod は `main` 固定（main 以外で prod を選ぶとガードが落とす）。stg は feature ブランチからも回せる |
| platform | android / ios / both |
| target | `stg` = 検証版。`prod` = 本番（既定） |
| provision_ios | iOS の profile を match で作り直す（stg 初回・端末追加時のみ ON） |
| release_notes | テスターに見せる文面。空なら `<target> <sha>` |

stg 初回（iOS）は `target=stg` + `provision_ios=true` で `.stg` の adhoc profile を作りながら配布する。
以降は `provision_ios=false` でよい。端末を増やす時だけ再度 true にする。

落ち方の見方: `Guard target` が落ちた=secret・ref・target の不一致（誤配布防止）。`Verify applicationId/bundle id` が落ちた=ビルド物の id が target と違う（app.config.ts・prebuild の確認）。

## テスターを stg に入れる

`stg-testers` グループに入れると両 OS の stg リリースが届く。片 OS だけにしたい場合は人数が増えてから prod と同じく OS 別グループに割る（下記「判断」）。
招待・追加は `fad-invite` skill の手順どおり（env=stg、project=EQUUS、OS、人を一人一回答える）。招待した人が FAD の案内から UDID を提出すると端末登録の流れに乗る。

## iOS の端末追加（stg）

`.stg` の adhoc profile は本番と同じ Apple 登録端末群を使う。本番テスターの端末は追加手続きなしで stg も入る。

stg にしか居ないテスターの端末を足す時:

1. `ios-device-sync.yml` は本番アプリ（`FIREBASE_IOS_APP_ID`）の UDID しか拾わん。stg の端末は手で登録する:

   ```bash
   FIREBASE_IOS_APP_ID=<stg の app id> ASC_API_KEY_PATH=<asc key json> \
     bundle exec fastlane ios register_devices_from_firebase
   ```

   （lane は `app:` 引数も取れる。`firebase_app_distribution_get_udids` が stg アプリの端末一覧を取り、`register_devices` が Apple Portal へ登録する）
2. `fad.yml` を `target=stg` + `provision_ios=true` で回すと match が `.stg` profile を新端末込みで作り直してから署名・配布する

## secrets 一覧

| secret | 用途 |
|---|---|
| `FIREBASE_TOKEN` | firebase-tools の CLI token（両環境共通） |
| `FIREBASE_ANDROID_APP_ID` / `FIREBASE_IOS_APP_ID` | 本番 FAD アプリ |
| `FIREBASE_ANDROID_APP_ID_STG` / `FIREBASE_IOS_APP_ID_STG` | stg FAD アプリ（2026-10-11 登録済み） |
| `ANDROID_KEYSTORE_*` | Android 署名（stg も同じ upload key で署名する） |
| `ASC_*` `MATCH_*` | iOS 署名（`ritmo-inc/apple-certificate` の match repo。.stg 用 profile もここに置く） |

## 判断とその理由

- **別 FAD アプリ（`.stg`）にした**: 同一アプリの別グループだと「本番と同じアプリ id の別ビルド」になり端末で見分けがつかん。バリアント分離でホーム画面に2つ並ぶ。2026-10 の develop 運用でも同じ形で実配布できた（iOS 2026-10-11 run 成功）
- **stg グループは `stg-testers` 共通**: 2026-10 に作った既存グループで、当面の名簿は内部のみ。prod は OS 別（#232: 共通だと使わん OS の通知が届く）だが、stg の人数が増えたら `stg-testers-android` / `stg-testers-ios` を作って同じ形に割る
- **prod は main 限定**: 未マージのコードを本番テスターへ出せないようにする。stg は検証用途なので feature ブランチからの試し配布を許す
- **device-sync は本番のみ**: stg の名簿は小さく、端末も本番登録済みのものが主。自動化が要るほど増えたら `ios-device-sync.yml` に target 入力を足す

## 残件（局長待ち）

実装はこの PR で揃った。実行系は資格情報と Firebase コンソールが要るので局長の判断を待つ:

- [ ] `target=stg` の初回 dispatch 実行（iOS は `provision_ios=true` を推奨。secrets は 2026-10-11 に登録済みだが、Android の `FIREBASE_ANDROID_APP_ID_STG` が stg アプリを指すかは実行時のガードでは「空でない・本番と違う」までしか分からん。初回実行で配布先アプリ名を FAD コンソールと照合すること）
- [ ] stg テスターの名簿決め（誰を `stg-testers` に入れるか。現状は kouiso のみ想定）
- [ ] iOS stg 専用端末が出た時の端末登録実行（上記 fastlane 手順）

## 参照

- 先行実装: 削除済み `develop` ブランチ（`7cbc57c` 系。2026-10-11 に stg の iOS 配布が 1 回成功）。本 PR はそれを main の現行構成（run.mjs 経由・OS 別グループ・choice 入力）へ移植したもの
- `fad.yml` / `scripts/check-fad-config.sh` / `app.config.ts` / `fastlane/Fastfile`（`fad`・`match_adhoc`・`register_devices_from_firebase` lanes）
- 検証証跡: `doc/evidence/240/`
