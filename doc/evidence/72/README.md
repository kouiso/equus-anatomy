# #72 英語UI 実機全画面目視の証跡（2026-10-28）

環境: Pixel 7 Pro（Android 17, 1080x2340）+ Expo Go + Metro。言語はアプリ内トグルで English に切替。全画面を uiautomator の画面ツリーで文言を確認し、missing key（生キー表示）・レイアウト崩れ（はみ出し・重なり）を確認した。エミュレータ代替として実機で実施（実機はエミュレータの証拠より強い）。

| 画面 | 確認した文言（抜粋） | 画像 |
|---|---|---|
| 解剖（Anatomy） | Anatomy / EQUUS / 日本語 / Learning demo — anatomy not yet expert-reviewed / Areas & parts / View options / Choose a general area / Left lateral · Muscles · Superficial muscles | `01-anatomy-en.png` |
| 表示条件モーダル | View: Left/Right lateral, Front, Rear · Layer: Skin/Muscles/Skeleton/Organs · Depth: Superficial/Deep muscles / Depths without an illustration cannot be selected. / Show with these options | `02-view-options-en.png` |
| 場所・部位一覧 | General areas: Head/Neck/Trunk/Forelimb/Hindlimb/Tail · Parts: Masseter/Brachiocephalicus/Trapezius/Triceps/Latissimus dorsi | `03-parts-list-en.png` |
| 部位詳細 | Masseter / M. masseter / 咬筋 · Head / Saved / Mark as learned / Only the summary is translated into English (unreviewed draft)… / Unreviewed — this part's illustration and description have not been checked by a veterinarian / Open in catalog | `04-part-detail-en.png` |
| 図鑑一覧 | 87 parts / Learned 0 / 87 / Search parts / Filters (scroll sideways) · Layer/Area/View 全チップ英語 | `05-catalog-list-en.png` |
| 図鑑検索 | 「liver」→ 1件 Liver / Hepar / Abdominal cavity | `06-catalog-search-en.png` |
| About | Review status: Unreviewed / 全87部位未監修の説明・監修後の表示方針 / Before you use this app / Privacy（通信しない旨） | `07-about-en.png` |
| 保存タブ | 1 saved / Masseter / M. masseter / Show on map / Remove | `08-saved-en.png` |

補足: summary は `[Unreviewed draft]` 接頭辞つきの英訳（PR #201）。詳細 body は日本語のみと明示され、英語未訳を隠さない設計どおり。英訳の獣医監修は #13 の範囲。
