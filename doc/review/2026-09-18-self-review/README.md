# 自己レビュー記録（2026-09-18）

これまでの全作業（環境整備・クイズ削除・座標修正・FADグループ化）をプレモーテムで検証し、
見つかった問題の対処と、敵対レビューの討議記録。

## プレモーテム：想定失敗シナリオと検証結果

| # | 失敗シナリオ | 影響 | 検証方法 | 結果 |
|---|---|---|---|---|
| F1 | `--groups beta-testers` が実配布で動かない（CI未経路・権限不足・alias typo） | 配布失敗 | **実配布を実行**（workflow_dispatch android） | 潰した: run 35325034159 で "distributed to testers/groups successfully"。iOSは 35327811429 で検証中 |
| F2 | グループ名・メンバーが違う | 届かない | Firebase CLIでグループとメンバー2名を再確認 | 潰した: beta-testers に管理者 + テスター1名が所属（アドレスは公開リポジトリのため伏字） |
| F3 | FAD_TESTERS 削除後に参照残り | CI失敗 | 全ワークフロー・doc・README grep | 潰した: 参照ゼロ、secret削除済み |
| F4 | iOS新テスターがアプリを入れられない | 招待は届くがインストール不可 | Fastfile確認 | **実在する制約**: FADがUDIDを収集→Apple portalへデバイス登録→`provision_ios:true` で profile 再生成が必要。手順として残課題（PBI化） |
| F5 | クイズ削除の残存参照（画面/リンク/表示） | 404・クラッシュ | src/e2e/設定を grep | 潰した: quiz/クイズ 0件 |
| F6 | 永続化済みのクイズ成績（correct/wrong/streak）が UI で化ける | 変な表示 | mastery-store と表示経路を確認 | 潰した: フィールドは読み込み互換だが表示・更新経路なし。「覚えた」のみ生きている |
| F7 | skin-hoof のズレが他viewにもある | 修正漏れ | front の skin-hoof 監査画像を再目視 | 潰した: frontは蹄を正しく覆っている。rearには蹄なし |
| F8 | 獣医学的誤りが獣医に見せる段階で残る | 商用レベル未達 | 全52部位の術語・左右性・本文を監査 | **7件の誤りを発見・修正**（板状筋誤字・Cannon非ラテン・脾/胃/盲腸の左右・膀胱区分・尾根の語義）。10件を獣医判断へ送った（doc/review/2026-09-18-vet-audit） |
| F9 | 右側望=左反転で右側解剖が嘘になる | 解剖学的誤情報 | 臓器の左右性を全件監査 | 脾・胃・盲腸を存在側に固定（F8）。肝臓は両側維持＋獣医確認へ。骨格・筋・皮膚は左右対称で問題なし |
| F10 | draft座標を「確認済み」と誤認させる | 獣医が下書きを正と読む | coverage.test で measured/draft を固定済み | 潰した: テストで 6 measured / 40 draft を固定。レビュー資料にも明記 |
| F11 | 独立AIによる敵対レビュー不能 | レビューの独立性が担保できない | codex/claude/grok/opencode を順に試行 | **BLOCKED**: codex quota（9/19解除）・claude OAuth切れ・grok上限・opencode認証情報なし。代替として検察/採用の二役討議を実施（下記）。独立レビューは quota 回復後に再実施する課題 |

## 敵対討議（検察 vs 採用）

独立AIが全滅のため、同一セッション内で役割を分離して実施。独立モデルによる反論は未実施である点を明記する。

### R1 胃・脾臓を左のみへ（採用）

- 検: 胃の幽門部は正中を越え右に達する。left限定は右側情報の欠落では
- 採: ポリゴンは胃全体の形状。反転した右側望に全体を描くのは誤り。標準図譜は左側望で描く。本文も「主に左側」
- 結: 採用。幽門部が右に達する件は獣医確認項目に明記

### R2 盲腸を右のみへ（採用）

- 検: 左から一切見えなくなる。盲腸基部は正中に近いのでは
- 採: 盲腸は右側臓器。左側望に出す根拠が無い。本文も「右側の腹腔に位置」
- 結: 採用。右側望の図が無いので位置は未登録のまま（誠実な表示）

### R3 肝臓を左右維持（採用・要確認へ送出）

- 検: 肝臓は右優位。左側望に描くと「左にある臓器」と誤学習させる
- 採: 左葉は正中を越え左に達する。脾・盲腸と違い片側限定にできない
- 結: 両側維持。ただし「左側望での描画範囲が妥当か」を獣医確認の最上位に

### R4 管の nameLa を Metacarpus に（採用・留保付き）

- 検: 体表部位名としては Regio metacarpalis が正しいのでは。Metacarpus は骨格部位名で置換しただけでは
- 採: Cannon（英語）よりは Metacarpus の方がラテン語として正しい
- 結: 採用するが獣医確認項目#3として残す

### R5 板状筋の誤字修正（採用・反論なし）

- 検: 「脾状筋」は俗用の可能性
- 採: 日本語獣医解剖で M. splenius = 板状筋。「脾状筋」は単純な誤字
- 結: 採用

### R6 膀胱 region を骨盤腔へ（採用）

- 検: 膀胱は充満時に尾側腹腔へ進出する。腹腔も誤りではないのでは
- 採: 本文自身が「骨盤腔の腹側に位置」と記述。メタデータと本文の矛盾解消を優先
- 結: 採用。area-map へ 骨盤腔→trunk を追加済み

### R7 鬐甲・尻の nameLa を英語のまま放置（採用）

- 検: ラテン語欄に英語は獣医に指摘されるのでは
- 採: NAVに対応術語が存在しない部位。捏造するより英語のまま＋獣医確認項目に上げる方が誠実
- 結: 現状維持、確認項目#1#2へ

### R8 右側望=反転という構造自体（留保 → PBI化）

- 検: 左右対称の骨格・筋でも形状は左側の反転（右腎は左腎より頭側など細部が違う）。商用獣医レビューで通用するか
- 採: 完全には通用しない。ただし右側専用図の作成は資産追加の大仕事で、今回の範囲ではない
- 結: アプリ内の反転明記は既存（index.tsx:55）。右側専用図の整備をPBIの最重要項目へ

### R9 draft座標のまま獣医に出す（採用・資料で明記）

- 検: draftが実測に見えて誤審される危険
- 採: レビュー資料に measured/draft 内訳を明記。アプリ画面にも「AI計測の下書き」表示の余地はあるが今回は資料で担保
- 結: 採用。画面上のdraft可視化はSBI候補へ

### R10 FAD iOS は未実走（実配布で潰す）

- 検: Androidしか実配布してない。iOSの --groups 経路は未証明
- 採: フラグは同一だが実配布が証拠。iOSも workflow_dispatch で実配布する
- 結: iOS FAD run 35327811429 を実施。結果確認まで完了としない

## 残る BLOCKED

~~BLOCKED: 独立AIモデルによる敵対レビュー~~ → **2026-09-19 解消**

`.claude-ang`（復活した claude アカウント）でFable盲目監査を実施済み。
確定誤り14件・要確認11件の一次見解を取得し、採否裁定のうえ commit `d1b1bf1` として反映。
結果は `doc/review/2026-09-18-vet-audit/README.md`（第2版）に統合した。
特筆: Fableの監査で `views` が描画に効いていない設計上の欠陥が発覚し、表示フィルタ自体を修正した。

## ラウンド3: 商用準備の棚卸し + 盲目的敵対レビュー（2026-09-19）

### 自分側の棚卸しで潰した穴

| 穴 | 対応 |
|---|---|
| アイコン・スプラッシュ・favicon が無かった | `assets/brand/` 生成（看板アートの頭頸部クロップ）+ app.json 配線。iOS AppIcon・Android adaptive icon・splash drawable を prebuild で実生成確認 |
| iOS 暗号化申告が無い | `ITSAppUsesNonExemptEncryption=false` |
| Android 権限が Expo 既定で storage/overlay/vibrate 混入 | `blockedPermissions` で剥奪。INTERNET のみ |
| versionCode/CFBundleVersion が毎回 1 | `github.run_number` 自動採番（fad.yml + patch-android-signing.ts） |
| 描画例外で真っ暗のまま落ちる | `src/ui/error-boundary.tsx` を Stack ラップに追加 |
| プライバシーポリシー・ライセンス未整備 | `doc/privacy-policy.md` + `public/privacy-policy.html`（Pages公開URL化）+ LICENSE(ARR) + NOTICE.md + OFL本文収録 |

### 敵対レビュー（盲目・読取専用サブエージェント）の採否

| 指摘 | 判定 | 対応 |
|---|---|---|
| B1 OSバックアップがポリシー「外部送信なし」と矛盾 | **採用** | `allowBackup:false`（Android）+ iOS iCloud は OS 標準動作としてポリシーへ開示 |
| B2 テスター個人メール・CFアカウントIDが公開リポジトリに | **採用** | 伏字化。git履歴への残存は書き換えが破壊的なため記録のみ（要望あれば履歴 scrub） |
| B3 AI生成図の来歴・権利未記録でARR主張は危うい | **採用** | `assets/anatomy/PROVENANCE.md` で未記録を正直に明記し、商用化前の差替え/ライセンス確認を必須化 |
| B4 ストア提出経路が無い | **採用だが現スコープ外** | FAD配布が現在の要件。appstore lane/AAB/Data Safety/サポートURLは商用化決定時のPBIとして handoff に記録 |
| B5 iOS PrivacyInfo が未検証 | **採用** | fad.yml に pod 同梱 manifest の UserDefaults 宣言を断言するステップ追加 |
| M1 クラッシュ報告なし・About無し | **一部採用** | overlay にバージョン表示。Sentry 等の依存追加はユーザー判断へ（新規SDKは課金・プライバシー影響があるため未導入） |
| M2 run_number はストア提出に使えん | **採用** | 仕様として handoff 記録（FAD 用としては正しい） |
| M4 OFL 本文未同梱 | **採用** | `assets/licenses/` に OFL 収録 + NOTICE.md |
| M5 reanimated/worklets 未使用のまま同梱 | **採用** | package.json から除去 |
| M6 `accessibilityRole=alert` は Android で無効 | **採用** | `accessibilityLiveRegion="polite"` 追加（banner/undo） |
| M7 LICENSE ファイル無し | **採用** | LICENSE 追加 |
| m1 bottom-nav が role=link | **採用** | role=tab へ |
| m3 デッドコード（use-window-dimensions・styles.hints） | **採用** | 削除。**ただし `source` パラメータの指摘は棄却** — detail-source.ts で読まれており使用済み |
| m6 配布ワークフローが cancel-in-progress | **採用** | false へ |
| m9 フォント待ちが暗転 | **採用** | SplashScreen.preventAutoHideAsync で OS スプラッシュ保持 |
| m10 ツール内の VIA html に GA 混入 | **不採用（dev専用）** | 配布物に入らない。記録のみ |
| m11 iPad が横向きにもなる | **確認済** | 1280×800 の e2e で wide layout 済 |

### 検証証拠

- type-check / lint / 単体195 / 座標ゲート78 / e2e59: 全緑
- `expo prebuild` 実走: `allowBackup=false`・blockedPermissions・versionCode注入・AppIcon・ITSAppUsesNonExemptEncryption を生成物で確認
- 実写: overlay のバージョン表示・ホーム描画を目視
- `pnpm audit`: 脆弱性ゼロ
