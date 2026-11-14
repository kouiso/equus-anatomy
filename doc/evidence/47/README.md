# #47 Android実機確認の証跡（2026-10-28）

環境: Pixel 7 Pro（Android 17, 1080x2340, USB接続 `2A091FDH300C0J`）+ Expo Go（`host.exp.exponent`）+ Metro（`adb reverse tcp:8081` → `exp://127.0.0.1:8081`）。
dev 実行時の Expo Go シェル経由のため FAD 配布 APK そのものの確認ではない。UIツリー（uiautomator dump）と画面差分で確認。

| 検証 | 結果 | 証跡 |
|---|---|---|
| Expo Go で起動・バンドル | 成功（Metro `Android Bundled 773ms`） | 起動直後の解剖画面（英語切替ボタン・未監修注記表示） |
| 部位タップ選択（左側望・表層筋） | 部位一覧→咬筋を選択、部位シートに名称・summary・解除導線 | `01-part-selected.png` |
| ズーム・パンの追従 | +ボタン2回で画面差分26.5%、ドラッグパンで33.2%（ピンチはadb不可のため+/−で代替） | `02-zoomed.png` `03-panned.png` |
| 保存→強制終了→再起動→永続化 | 「保存」→ `am force-stop` → 再起動後も保存タブに「1件 咬筋 M. masseter」 | `04-saved.png` `05-persisted-after-relaunch.png` |
| TalkBack | 有効化して主要操作の読み上げ対象を確認: `英語表示に切り替える` `このアプリについて` `咬筋 M. masseter の解説を読む` `咬筋 を図で見る` `咬筋 の保存を解除` `解剖/図鑑/保存`。確認後に TalkBack・accessibility 設定を元に戻した | uiautomator の content-desc 一覧（テキスト記録） |

未確認: FAD 経由インストール物の実機起動（経路は #46/#48 の Firebase 再認証待ち）、ピンチジェスチャ自体（adbは二本指注入不可・ズームボタンで代替確認）。
