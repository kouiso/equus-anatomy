/**
 * ひらがなの読みをローマ字に写像する。
 * 図鑑検索で「hone」「kubi」のような読みのローマ字入力を
 * kanaOf の読みデータに届かせるための変換（#71）。
 * 拗音と促音は2文字見て決めるので単純な1文字表には書けない。
 */
const ROMAJI: Readonly<Record<string, string>> = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', を: 'wo', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ゔ: 'vu',
}

const YOON: Readonly<Record<string, string>> = {
  きゃ: 'kya', きゅ: 'kyu', きょ: 'kyo',
  しゃ: 'sha', しゅ: 'shu', しょ: 'sho',
  ちゃ: 'cha', ちゅ: 'chu', ちょ: 'cho',
  にゃ: 'nya', にゅ: 'nyu', にょ: 'nyo',
  ひゃ: 'hya', ひゅ: 'hyu', ひょ: 'hyo',
  みゃ: 'mya', みゅ: 'myu', みょ: 'myo',
  りゃ: 'rya', りゅ: 'ryu', りょ: 'ryo',
  ぎゃ: 'gya', ぎゅ: 'gyu', ぎょ: 'gyo',
  じゃ: 'ja', じゅ: 'ju', じょ: 'jo',
  ぢゃ: 'ja', ぢゅ: 'ju', ぢょ: 'jo',
  びゃ: 'bya', びゅ: 'byu', びょ: 'byo',
  ぴゃ: 'pya', ぴゅ: 'pyu', ぴょ: 'pyo',
}

const SMALL_VOWEL: Readonly<Record<string, string>> = {
  ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o',
}

/**
 * 訓令式・IME 綴りでも引けるよう、Hepburn と綴りの違うモーラだけの対応（#71）。
 * si→shi・tu→tsu・hu→fu・zi→ji の類。カタカナは入口で平仮名に寄せるので
 * ここには平仮名しか並べない。
 */
const ALT_MORA: Readonly<Record<string, string>> = {
  し: 'si', ち: 'ti', つ: 'tu', ふ: 'hu',
  じ: 'zi', ぢ: 'di', づ: 'du',
  しゃ: 'sya', しゅ: 'syu', しょ: 'syo',
  ちゃ: 'tya', ちゅ: 'tyu', ちょ: 'tyo',
  じゃ: 'zya', じゅ: 'zyu', じょ: 'zyo',
  ぢゃ: 'dya', ぢゅ: 'dyu', ぢょ: 'dyo',
}

/**
 * かな1語をローマ字に変換する。
 * 読み揺れ（長音・促音・綴り方）でも引けるよう、別表記の候補も一緒に返す。
 * 例: 'かんぞう' → ['kanzou', 'kanzo', 'kanzou系の揺れ']、'しんぞう' → sinzou も含む
 */
export function kanaToRomaji(input: string): string[] {
  // 索引・入力は平仮名が正本。検索側も同じ揃え方（normalizeQuery）をして
  // いるので、カタカナの読みデータが混ざってもここで畳める
  const kana = input.replace(/[ァ-ヶ]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0x60),
  )
  let primary = ''
  let alt = ''
  for (let i = 0; i < kana.length; i += 1) {
    const c = kana[i]
    if (c === 'っ') {
      const next = moraRomaji(kana, i + 1)
      const nextAlt = moraRomaji(kana, i + 1, ALT_MORA)
      // 促音は次の子音を重ねる。ち行は Hepburn の tch（こっち→kotchi）
      primary += next.startsWith('ch') ? 't' : next.charAt(0) || ''
      alt += nextAlt.charAt(0) || ''
      continue
    }
    const pair = kana.slice(i, i + 2)
    if (YOON[pair]) {
      primary += YOON[pair]
      alt += ALT_MORA[pair] ?? YOON[pair]
      i += 1
      continue
    }
    primary += moraRomaji(kana, i)
    alt += moraRomaji(kana, i, ALT_MORA)
  }
  const variants = new Set<string>()
  for (const head of [primary, alt]) {
    const folded = head.replace(/ou/g, 'o').replace(/uu/g, 'u')
    variants.add(head)
    variants.add(folded)
    variants.add(head.replace(/([a-z])\1/g, '$1'))
    variants.add(folded.replace(/([a-z])\1/g, '$1'))
  }
  variants.delete('')
  return [...variants]
}

function moraRomaji(
  kana: string,
  i: number,
  overrides: Readonly<Record<string, string>> = {},
): string {
  const pair = kana.slice(i, i + 2)
  const c = kana[i] ?? ''
  return (
    overrides[pair] ??
    overrides[c] ??
    YOON[pair] ??
    ROMAJI[c] ??
    SMALL_VOWEL[c] ??
    (c === 'ー' ? '' : c)
  )
}
