import { ScrollViewStyleReset } from 'expo-router/html'
import type { PropsWithChildren } from 'react'

/**
 * 静的書き出しの HTML の殻。Web にしか無い物（lang・title・theme-color・color-scheme）はここだけに置く。
 * 旧 Web 版の index.html と styles.css の html/body 相当。アプリの中身には Web 専用の物を書かん。
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0b0c0e" />
        <meta name="description" content={DESCRIPTION} />
        <title>{TITLE}</title>
        {/* SNS のクローラは相対 URL を解決せんので og:image / og:url は絶対 URL。画像は public/ から dist 直下に載る */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={TITLE} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={`${SITE_URL}/`} />
        <meta property="og:locale" content="ja_JP" />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={TITLE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <ScrollViewStyleReset />
        {/* UA の部品（スクロールバー等）まで暗くする。overscroll はピンチ中にページごと跳ねんように */}
        <style dangerouslySetInnerHTML={{ __html: SHELL_CSS }} />
      </head>
      <body>{children}</body>
    </html>
  )
}

const SITE_URL = 'https://equus-anatomy-84f.pages.dev'
const TITLE = 'EQUUS 馬体解剖'
const DESCRIPTION = '馬体の皮膚・筋肉・骨格・内臓を層ごとに学ぶ解剖図鑑。'
const OG_IMAGE = `${SITE_URL}/og-image.jpg`

const SHELL_CSS = `
html { color-scheme: dark; background: #0b0c0e; }
body { margin: 0; background: #0b0c0e; overscroll-behavior: none; -webkit-font-smoothing: antialiased; }
:focus-visible { outline: 2px solid #ddcba4; outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
`
