import type { Page } from '@playwright/test'

export async function installTwoTimesTextScale(page: Page) {
  await page.addInitScript(() => {
    const scaleElement = (element: Element) => {
      if (!(element instanceof HTMLElement || element instanceof SVGElement)) return
      if (element.getAttribute('data-e2e-text-scale') === '2') return
      const hasDirectText = Array.from(element.childNodes).some(
        (node) => node.nodeType === Node.TEXT_NODE && (node.textContent?.trim().length ?? 0) > 0,
      )
      if (!hasDirectText && !(element instanceof HTMLInputElement) && !(element instanceof HTMLTextAreaElement)) return

      const computed = getComputedStyle(element)
      const fontSize = Number.parseFloat(computed.fontSize)
      if (!Number.isFinite(fontSize) || fontSize <= 0) return
      const parsedLineHeight = Number.parseFloat(computed.lineHeight)
      const lineHeight = Number.isFinite(parsedLineHeight) ? parsedLineHeight : fontSize * 1.2
      element.setAttribute('data-e2e-text-scale', '2')
      ;(element as HTMLElement).style.fontSize = `${fontSize * 2}px`
      ;(element as HTMLElement).style.lineHeight = `${lineHeight * 2}px`
    }

    const scaleTree = (root: ParentNode) => {
      if (root instanceof Element) scaleElement(root)
      root.querySelectorAll('*').forEach(scaleElement)
    }
    const start = () => {
      scaleTree(document)
      new MutationObserver((records) => {
        for (const record of records) {
          if (record.type === 'characterData' && record.target.parentElement) scaleElement(record.target.parentElement)
          for (const node of Array.from(record.addedNodes)) {
            if (node instanceof Element) scaleTree(node)
          }
        }
      }).observe(document.documentElement, { childList: true, characterData: true, subtree: true })
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
    else start()
  })
}

