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
        <meta name="description" content="馬体の皮膚・筋肉・骨格・内臓を層ごとに学ぶ解剖図鑑。" />
        <title>EQUUS 馬体解剖</title>
        <ScrollViewStyleReset />
        {/* UA の部品（スクロールバー等）まで暗くする。overscroll はピンチ中にページごと跳ねんように */}
        <style dangerouslySetInnerHTML={{ __html: SHELL_CSS }} />
      </head>
      <body>{children}</body>
    </html>
  )
}

const SHELL_CSS = `
html { color-scheme: dark; background: #0b0c0e; }
body { margin: 0; background: #0b0c0e; overscroll-behavior: none; -webkit-font-smoothing: antialiased; }
:focus-visible { outline: 2px solid #ddcba4; outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
`
