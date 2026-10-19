import { expect, type Page } from '@playwright/test'

/**
 * 図の svg の寸法が、図の箱の実寸に追いつくまで待つ。
 *
 * 初回表示では画面の寸法を計ってから面板の置き場所が決まり、図の箱が縮む
 * （900x1000 なら幅 900→580、390x844 なら高さ 660→460）。svg の width/height は
 * 図の箱の onLayout で 1 描画遅れて追いつくので、点は先に古い寸法で描かれる。
 * その隙に測った座標は縮む前の位置を指し、叩くと別の場所に当たる。
 * CI が重い時だけ隙が広がって赤になっていた（main の 39208801661 と 39232921665）。
 * 図の上の座標を測る前に必ず通す。
 */
export async function waitForCanvasLayout(page: Page): Promise<void> {
  await expect
    .poll(
      () =>
        page.getByTestId('anatomy-svg').evaluate((svg) => {
          const box = svg.parentElement?.getBoundingClientRect()
          if (box === undefined) return false
          const width = Number(svg.getAttribute('width'))
          const height = Number(svg.getAttribute('height'))
          return Math.abs(width - box.width) < 1 && Math.abs(height - box.height) < 1
        }),
      { message: '図の svg の寸法が図の箱に追いつかん' },
    )
    .toBe(true)
}
