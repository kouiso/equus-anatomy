# 共通CI入口

このリポジトリはExpo／React Nativeのアプリである。
Node 22、pnpm 10.33.0と固定依存を準備して実行する。

- `task ci:fast`: 型、lint、単体テスト、座標、left再生成差分、Webビルド、secret scan。
- `task ci`: 同じ検査とChromiumの準備・既存Playwright E2E。
- `task ci:native-build VARIANT=android-fad-apk`: 準備済み環境で指定のビルドだけを行う。

クラウドのverifyジョブは`verify-full`を使う。
別ジョブのsecret scanもローカルと同じ`scan.sh`を使う。
派生座標の生成後は従来と同じleft.jsonの差分検査を行う。
失敗すると後続を止めて元の終了コードを返す。

確認済みのPlaywright設定は毎回Webをビルドしてサーバーを起動する。
同じ実行で直前にも行っていたWebビルドを省き、E2E側の1回で検査する。
設定ファイル全体のSHA256と既存のbuild/e2eスクリプトが一致する場合だけ省く。
これは成果物キャッシュではない。設定が不明な場合は明示ビルドも残す。
独立したfast入口は常に明示ビルドする。
デプロイ用ジョブのビルドや環境・secretは共有しない。

nativeの共通入口は次の違いを維持する。

| VARIANT | 既存ビルド |
| --- | --- |
| `android-fad-apk` | FAD用Release APK、arm64のみ |
| `android-store-aab` | Store／Play用Release AAB、ABIを絞らない |
| `android-smoke-apk` | Maestro用Release APK、ABIを絞らない |
| `ios-smoke-build` | 既存SIM_IDのReleaseシミュレータapp |

Expo prebuild、署名パッチ、pod installも個別phaseから呼べる。
SDK、Java、Xcode、CocoaPods、生成済みnative projectは呼出側で準備する。
ローカルnative-buildは署名鍵の作成・取得や配布を自動実行しない。
各workflowが行う採番、署名、privacy manifest検査、FAD送信、TestFlight、
Storeの検証・下書き・承認条件は既存のステップに残す。
Fastlaneの署名付きIPAのlaneも変更しない。
GRADLE_USER_HOMEとGradleの資源設定は変更しない。

secret scanには既存のgitleaks 8.28.0が必要となる。
PRを再現する時はCI_EVENT_NAME=pull_request、CI_PR_BASE_SHA、CI_PR_HEAD_SHAを渡す。
PRのSHAが欠ける場合は失敗する。通常のローカル実行は履歴全体を検査する。
secret scan以外のPR自動処理や依存レビューは変更しない。

`node --test .github/ci/run.test.mjs` は実入口を一時fixtureで動かす。
コマンドの順序・引数・失敗伝播・variantの分離を検査する。
この結果は実アプリのビルド・デバイス試験・署名・配布の成功を意味しない。
