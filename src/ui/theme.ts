/**
 * デザイントークン。src/styles.css の --color-* / --font-* / --radius-* と同じ値を持つ。
 * RN は CSS 変数が使えんので、ここが唯一の正本になる（styles.css は旧 Web 版の残骸）。
 */
export const color = {
  bg: '#0b0c0e',
  surface: '#14161a',
  raised: '#1e2126',
  line: '#262a30',
  lineStrong: '#3a4048',
  fg: '#ece7dd',
  muted: '#9aa2ac',
  faint: '#6b737d',
  bone: '#ddcba4',
  accentFg: '#17140d',
} as const

/**
 * フォント名は expo-font に渡したキーがそのまま family 名になる。
 * RN は fontWeight で別ファイルの太さを選べんので、太さごとに family 名を分けて持つ。
 */
export const fontSans = 'ZenKakuGothicNew_400Regular'
export const fontSansMedium = 'ZenKakuGothicNew_500Medium'
export const fontSansBold = 'ZenKakuGothicNew_700Bold'
export const fontDisplay = 'CormorantGaramond_500Medium'
export const fontDisplaySemiBold = 'CormorantGaramond_600SemiBold'
export const fontDisplayItalic = 'CormorantGaramond_500Medium_Italic'
export const fontDisplaySemiBoldItalic = 'CormorantGaramond_600SemiBold_Italic'

/** --radius-sheet: 1.25rem = 20px。チップとボタンは pill（高さの半分）。 */
export const radius = {
  sheet: 20,
  pill: 999,
  card: 8,
} as const

/** 旧 Web 版 Tailwind の lg ブレークポイント。ここから上は横並び・広い列にする。 */
export const breakpointLg = 1024

/** --tracking-brand: 0.28em。RN の letterSpacing は px なので使う fontSize を掛けて出す。 */
export const trackingBrand = (fontSize: number) => fontSize * 0.28
