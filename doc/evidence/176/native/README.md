# #176 native 証跡（2026-10-26）

current main `5719bcb` の debug APK (`:app:assembleDebug`) を接続済みの
Pixel 7 Pro へ `adb install` し、Metro bundle で起動して操作した。

## 画像 SHA 照合

- `assets/anatomy/muscle_left.jpg` → `sha256:b630557e745588f677831315507a2664db5dd5d5c3bc9718424592354d218b90`
- web 配布物 `dist/assets/.../muscle_left.26fdfdf7....jpg` も同一 SHA。
- `src/core/data/regions/left.json` の `muscle-superficial` hash と一致。
- debug APK は bundle を Metro から読むため、描画される原画はこのリポジトリの
  `assets/anatomy/muscle_left.jpg` そのもの。

## 操作証跡

| 画像 | 確かめたこと |
|---|---|
| `native-01-launch.png` | アプリ起動 |
| `native-02-loaded.png` | 解剖ホーム。注記「学習デモ — 解剖学的正確性は未監修」を表示 |
| `native-03-part-selected.png` | 部位一覧から腕頭筋を選択。ガイドと解説「頭を引き、前肢を前へ出す筋。」が出る |
| `native-04-back.png` | 戻る操作で全体図へ復帰。「点・ラベル・部位一覧から選べます」に戻った |

アクセシビリティダンプ（uiautomator）で各遷移のラベルを確認した:
部位一覧の開閉 → 部位選択（説明文表示）→ 「1つ戻る」で全体図へ復帰。

## web 側（再実行）

`e2e/tools/part-selection-evidence.spec.ts` を current main `5719bcb` の
ローカル build (`pnpm build` → `serve dist`) に向けて実行し 1/1 PASS。
証跡一式は `doc/evidence/176/`（web 版）と同構成で
`/private/tmp/devin-w5s/evidence/equus-176/` に保存。

## 既知の限界

- Android エミュレータ `w5-equus` は system image 破損で起動不可。
  代替として接続済みの実機 Pixel 7 Pro で debug build を検証した。
- debug build のためリリース署名済み配布物（FAD）ではない。
- ズーム後の再選択・右側望の反転選択は web 側証跡で確認済み。
  native では未実施（同一コードパス・同一原画）。
