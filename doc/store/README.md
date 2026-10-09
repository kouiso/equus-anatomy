# ストア提出パイプライン（App Store / Google Play）

提出の**仕組みと雛形**だけを置く場所。実際の提出（審査提出・公開）は #55 で人が判断してやる。
このディレクトリと `store-build.yml` は「いつでも提出物を作れる・検証できる」状態を保つためのもの。

| ファイル | 中身 |
|---|---|
| [README.md](README.md) | この文書。経路・secrets・人が埋める値の一覧 |
| [data-safety.md](data-safety.md) | Google Play「データセーフティ」フォームの回答ドラフト |
| [app-privacy.md](app-privacy.md) | App Store「App のプライバシー」質問票の回答ドラフト |
| [screenshots.md](screenshots.md) | ストアスクショ・グラフィックの仕様メモ |
| `fastlane/metadata/` | ストア文言（ja / en-US）。`ja`・`en-US` が App Store（deliver）、`android/ja-JP`・`android/en-US` が Play（supply） |

バージョン番号の採番は [doc/handoff.md](../handoff.md) の「ストア提出時のバージョン運用」。

## 経路

| 経路 | ワークフロー | 何をするか | 外へ送るか |
|---|---|---|---|
| FAD（社内テスター） | `fad.yml` | APK / AdHoc IPA を作って FAD へ | FAD へ配布 |
| TestFlight | `ios-testflight.yml` | App Store 署名 IPA を作って TestFlight へ | TestFlight へアップロード（Beta App Review 提出は入力で明示した時だけ） |
| **ストア用ビルド** | **`store-build.yml`** | AAB / App Store 署名 IPA を作る | **既定は送らない**（下表） |

### store-build.yml の入力

`workflow_dispatch` のみ（Actions 画面から手動）。既定値のまま流すと **Android の AAB を作って artifact に置くだけ**。

| 入力 | 既定 | 意味 |
|---|---|---|
| `platform` | `android` | `android` / `ios` / `both` |
| `android_play` | `none` | `none`: Play に送らない。`validate`: Play API で edit を作って検証するだけ（commit しない＝Console 上に何も残らない）。`internal-draft`: **内部テストトラックに下書き**として登録（テスターへの公開・本番・審査提出はしない） |
| `ios_verify` | `false` | `true` で App Store Connect のパッケージ検証（`deliver verify_only`）まで。アップロードはしない |
| `build_number` | 空 | versionCode / CFBundleVersion を明示。空なら `100000 + run_number` |

- secrets が揃っていない時は、送信や iOS ビルドを **warning を出して飛ばす**（失敗にはしない）。
- debug 署名の AAB は Play へは送らない（upload key の secrets が無ければ送信を飛ばす）。
- PR でも `fastlane/`・`app.json`・依存（`package.json`/`pnpm-lock.yaml`）・`patches/`・署名パッチを触った時は Android の AAB ビルドだけ走る。PR では secrets を使わず debug 署名で、どこにも送らない。
- Play の track は `internal`、release_status は `draft` に lane 側で固定している。production や段階公開へ進めるのは Play Console で人がやる。

### fastlane lane

| lane | 中身 | 外へ送るか |
|---|---|---|
| `ios appstore_ipa` | match(appstore) + gym(app-store) で IPA を作る | 送らない |
| `ios store_dry_run` | `appstore_ipa` → `verify:true` なら ASC のパッケージ検証 | 送らない |
| `ios beta` | `appstore_ipa` → TestFlight アップロード | TestFlight |
| `android play_internal` | AAB を内部テストトラックへ下書き（`validate_only:true` で検証のみ） | Play（下書き） |

`bundle exec fastlane lanes` で一覧が出る。メタデータ・スクショをストアへ上げる lane は**置いていない**（文言・スクショの確定は提出時の判断なので、#55 で `deliver` / `supply` を手で流す）。

## 必要な GitHub secrets

secrets の値はリポジトリに置かない。作成・更新はリポジトリ管理者が GitHub の Settings → Secrets and variables → Actions で行う。

| secret | 使う所 | 状態 |
|---|---|---|
| `ANDROID_KEYSTORE_BASE64` | upload key（`.jks` を base64） | 既存（`fad.yml` で使用中） |
| `ANDROID_KEYSTORE_PASSWORD` | 同上 | 既存 |
| `ANDROID_KEY_ALIAS` | 同上 | 既存 |
| `ANDROID_KEY_PASSWORD` | 同上 | 既存 |
| `PLAY_SERVICE_ACCOUNT_JSON` | Google Play Developer API のサービスアカウント鍵（JSON 本文そのまま） | **新規。Play へ送る時だけ要る** |
| `ASC_KEY_ID` / `ASC_ISSUER_ID` / `ASC_KEY_P8` | App Store Connect API キー | 既存（`fad.yml` / `ios-testflight.yml`） |
| `MATCH_PASSWORD` / `MATCH_SSH_KEY` | match の証明書リポジトリ（`ritmo-inc/apple-certificate`） | 既存 |

`PLAY_SERVICE_ACCOUNT_JSON` を作る手順の要点:

1. Google Cloud でサービスアカウントを作り、JSON 鍵を発行する（Google Play Android Developer API を有効化）
2. Play Console →「ユーザーと権限」でそのサービスアカウントを招待し、このアプリに「リリースの管理（テストトラック）」相当の権限だけを付ける（本番リリース権限は付けない方が安全）
3. JSON の中身をそのまま secret に入れる

## Google Play の初回だけ人がやること

- Play Console でアプリ（`jp.co.ritmo.equusanatomy`）を作成する。API ではアプリを作れない
- **最初の 1 本の AAB は Play Console から手でアップロードする**。Play API は「一度も AAB が上がっていないアプリ」への送信を受け付けない。`store-build.yml` を `android_play=none` で流し、artifact の AAB を落として Console の内部テストに上げる
- Play App Signing の登録（下記）

### Play App Signing（提出時に決めること）

今の `ANDROID_KEYSTORE_*` は **upload key** として扱う。AAB は upload key で署名して Play へ送り、Play が配信用のアプリ署名鍵で署名し直す。
初回アップロード時に Console でどちらかを選ぶ:

- **(推奨) Google にアプリ署名鍵を生成させる**。鍵を失くしても upload key のリセットで復旧できる。ただし Play 経由の APK と FAD の APK（upload key 署名）は**署名が違う**ので、FAD 版を入れた端末は Play 版へ上書きできない（一度アンインストールが要る）
- 今の鍵をアプリ署名鍵として Play へ預ける（PEPK）。FAD 版と Play 版の署名が揃うが、その鍵を Google に渡すことになる

どちらにするかは提出時（#55）に決めて、ここに結果を書く。

## 提出時に人が埋める値（一覧）

### 共通

| 項目 | 値 / 状態 |
|---|---|
| プライバシーポリシー URL | `https://equus-anatomy-84f.pages.dev/privacy-policy.html`（**#45 で 404 を解消してから**。`fastlane/metadata/*/privacy_url.txt` に仮置き） |
| サポート URL | 仮に GitHub Issues（`fastlane/metadata/*/support_url.txt`）。独自のサポートページ・連絡先メールにするかは要判断 |
| 連絡先メール | 未定（審査・Play のデベロッパー連絡先に要る） |
| 画像の権利 | `assets/anatomy/PROVENANCE.md` の確認（#42）が済むまで提出不可 |
| 獣医監修 | #13 の結果に合わせて説明文の【ご注意】を更新する |
| ストア文言 | `fastlane/metadata/` は下書き。最終化は人 |
| 価格・配信国 | 未定（無料想定なら課金設定は不要） |

### App Store Connect

| 項目 | 値 / 状態 |
|---|---|
| Apple Developer Program / ASC のアプリレコード | TestFlight 経路があるので作成済みの前提（`jp.co.ritmo.equusanatomy`） |
| ASC API キー | 既存 secrets（上表） |
| カテゴリ | 下書き: プライマリ `EDUCATION`、セカンダリ `REFERENCE`（`fastlane/metadata/*_category.txt`） |
| 著作権表記 | 下書き: `2026 kouiso / ritmo`（`fastlane/metadata/copyright.txt`） |
| 年齢制限（Age Rating） | 質問票は人が回答。暴力・性的表現・課金・UGC・Web 閲覧はいずれも「なし」。「医療・治療情報」は解剖図・解説を含むので頻度の答え方を要判断 |
| App のプライバシー | [app-privacy.md](app-privacy.md) のとおり「データの収集なし」 |
| 輸出コンプライアンス | `ITSAppUsesNonExemptEncryption=false`（app.json）で申告済み |
| App Review 用の連絡先 | 氏名・電話番号・メール（未定） |
| デモアカウント | 不要（ログイン機能なし） |
| レビューメモ | 「通信なし・ログインなし・学習用教材。解剖学的正確性は未監修である旨をアプリ内に表示」程度 |
| iPad スクショ | `supportsTablet: true` なので必須（[screenshots.md](screenshots.md)） |

### Google Play Console

| 項目 | 値 / 状態 |
|---|---|
| デベロッパーアカウント | 未確認（登録料・本人確認が要る） |
| サービスアカウント | `PLAY_SERVICE_ACCOUNT_JSON`（新規） |
| アプリのアクセス権 | 全機能がログイン不要で使える |
| 広告 | 含まない |
| コンテンツのレーティング（IARC） | 人が回答。暴力・性・薬物・ギャンブル・UGC はいずれも「なし」。解剖図（内臓を含む）の扱いは質問の文言を見て判断 |
| ターゲット層 | 要判断（子ども向けにしない場合は 13 歳以上などを選ぶ。ファミリー向けにするとポリシーが増える） |
| データセーフティ | [data-safety.md](data-safety.md) のとおり「収集・共有なし」 |
| 健康アプリ申告 | 学習用の教材で、診断・治療機能は無い旨で回答する想定（要確認） |
| ストアの掲載情報 | `fastlane/metadata/android/` の下書き。アイコン 512×512・フィーチャーグラフィック 1024×500・スクショは [screenshots.md](screenshots.md) |
