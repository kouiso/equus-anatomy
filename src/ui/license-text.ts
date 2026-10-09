/**
 * ライセンス本文は 70 桁前後で改行してある。狭い画面でそのまま出すと
 * 折り返しと元の改行が交互に来て読めんので、表示の時だけ段落内の改行を詰める。
 * 罫線（---）の行と段落の区切り（空行）は残す。文言そのものは変えない。
 */
export function reflowLicenseText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => {
      const lines = paragraph.split('\n').map((line) => line.trim())
      if (lines.some((line) => /^-{3,}$/.test(line))) return lines.join('\n')
      return lines.join(' ')
    })
    .join('\n\n')
}
