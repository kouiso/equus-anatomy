# 単一 HTML のキャリブレータ（Artifact 版）

リポジトリを clone せんでも、スマホのブラウザだけで座標を採れるようにしたもの。
画像 12 枚と解説データを埋め込んだ 1 ファイルで、測った座標は artifact の db に保存される。
Claude 側から `read_db` で読み出して `src/core/data/regions/*.json` に落とす。

`body.html` と `script.js` が原本。`scripts/build-calibrator.ts` で 1 ファイルに組む。
`script.js` の `__IMAGES__` と `__DATA__` がビルド時に差し替わる。

アプリ内の `/calibrate` と役割は同じ。違いは配布の形だけ。
