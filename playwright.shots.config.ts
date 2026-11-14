import base from './playwright.config'

/** スクショ取り専用。既定の検証からは外しとる e2e/tools/ を拾うのに加えて、V02 の通し試験も回して証跡画像を撮り直す設定。 */
// V02 の通し試験は既定の実行に入っとる。ここでは画像を撮り直すために回すので、書き出しを有効にする
process.env.EQUUS_V02_EVIDENCE = '1'

export default { ...base, testIgnore: [], testMatch: ['**/tools/**/*.spec.ts', '**/v02-web-run.spec.ts'], workers: 2 }
