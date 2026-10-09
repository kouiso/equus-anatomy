# 解剖図の来歴（PROVENANCE）

このディレクトリの 12 枚（skin/muscle/skeleton/organs × left/front/rear）は **AI 生成**。

## 生成モデル（2026-10 確定）

**xAI「Grok Imagine」で生成**（version 表記 `0.0.0`、署名ライブラリ `org.contentauth.c2pa_rs 0.76.2`）。

一次証拠: `muscle_left.jpg`・`organs_left.jpg`・`skeleton_left.jpg`・`skin_left.jpg` の JPEG APP11 領域に C2PA manifest が埋め込まれ、`claim_generator_info.name = "Grok Imagine"`、`actions[].action = "c2pa.created"`、`softwareAgent = "Grok Imagine"` と記録されている。C2PA は画像の改竄耐性のある署名なので、生成ツールとしての一次情報になる。

- `_left` の4枚にのみ C2PA 署名が残る。`_front`・`_rear`（各 view の正面・背面）は署名が無く、左側望の加工派生か別途生成かはファイルからは確定できない（絵柄は同一系統）
- 生成日時の記録は manifest 内に見当たらない（git 履歴上の初出は 2026-09-07 頃）
- プロンプトの記録は残っていない

## 権利関係（一次情報）

- xAI Consumer Terms of Service（2026-10-08 時点、<https://x.ai/legal/terms-of-service>）: 「You Own Your User Content」「as between you and SpaceXAI, you retain your ownership rights to the User Content」。出力（Output）は利用者に所有権が認められ、商用利用を禁じる文言はない。SpaceXAI の名称・ブランド要素の使用には別途許可と帰属表示が要る
- ただし、AI 生成物に著作権が発生するかは法域によって未確定。ToS は契約上の権利移転であって、著作権の成立自体を保証するものではない

## 結論

**権利関係は「ToS 上は利用者所有」だが、AI 生成物の著作権成立自体が不透明なため、商用化では差替えを推奨**（#54 の商用化方針と #13 の監修と合わせて判断）。現状の学習デモ用途では xAI ToS の範囲内で使用可能と解釈できる。

### 差替え候補

| 候補 | ライセンス根拠 | 備考 |
|---|---|---|
| Ellenberger / Baum『Handbuch der Anatomie der Tiere für Künstler』旧版スキャン | 著作権保護期間満了（著者没後70年超）のパブリックドメイン | 馬の解剖図版が豊富。スキャン元（archive.org 等）の利用条件を確認 |
| Sisson『Anatomy of the Domestic Animals』旧版スキャン | 同上（パブリックドメイン） | 獣医解剖学の定番。図版はモノクロで切り抜き要 |
| 獣医師・イラストレーターへの依頼制作 | 制作契約で権利帰属を明文化 | 最も確実。監修（#13）と同時に進められる |

## assets/brand/

アイコン・スプラッシュ・favicon は `muscle_left.jpg`（上記 Grok Imagine 生成物）の頭頸部を切り出して作った派生物。同じ権利上の注意が適用される。
