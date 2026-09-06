import base from './playwright.config'

/** スクショ取り専用。既定の検証からは外しとる e2e/tools/ を拾うためだけの設定。 */
export default { ...base, testIgnore: [], testMatch: ['**/tools/**/*.spec.ts'], workers: 2 }
