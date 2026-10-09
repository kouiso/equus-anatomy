# App Store「App のプライバシー」— 回答ドラフト

提出時（#55）に App Store Connect の「App のプライバシー」へ転記する下書き。
最終回答は人が ASC 上の質問文を確認してから行う。

## 根拠

- アプリは通信機能を持たない。サーバー・API・アカウント登録は無い
- 解析・広告・クラッシュ報告・課金の SDK は入っていない
- 端末内に保存するのは「覚えた」印と保存（ブックマーク）だけで、AsyncStorage（iOS では UserDefaults / ファイル）に置く。開発者や第三者へは送らない
- iOS の iCloud バックアップに含まれることはあるが、これは OS の標準動作で、開発者がデータへアクセスできるわけではない（プライバシーポリシーで開示済み）
- プライバシーポリシー: `doc/privacy-policy.md`（公開 URL は #45 の解消後に `https://equus-anatomy-84f.pages.dev/privacy-policy.html`）

Apple の定義では「収集」は「端末の外へ送信され、開発者や提携先が一定期間以上アクセスできる状態になること」。
端末内でのみ処理されるデータは収集に当たらない。

## 回答

| 質問 | 回答 |
|---|---|
| お客様または他社は、この App からデータを収集しますか？ | **いいえ、この App からデータを収集しません** |

これで製品ページの表示は「データの収集なし」になる。

## 関連する申告

| 項目 | 状態 |
|---|---|
| App Tracking Transparency | 不要（トラッキングしない。`NSUserTrackingUsageDescription` も無い） |
| プライバシーマニフェスト（PrivacyInfo.xcprivacy） | アプリのコードは required-reason API を直接使っていない。AsyncStorage は pod 同梱の manifest で UserDefaults を宣言しており、CI（`fad.yml` / `ios-testflight.yml` / `store-build.yml`）で存在を確認している。ASC から ITMS-91053 などの警告が来たらアプリ側の manifest を足す |
| 輸出コンプライアンス | `ITSAppUsesNonExemptEncryption=false`（app.json） |

## 回答を変える必要が出る変更

次のどれかを入れたら、このドラフトとプライバシーポリシーを先に直してから提出する。

- クラッシュ報告（Sentry 等）・解析・広告 SDK の追加（「診断」「使用状況データ」などの申告が要る）
- 通信を伴う機能（同期・ログイン・OTA 更新等）の追加
