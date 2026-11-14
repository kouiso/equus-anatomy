import { expect, type Page } from '@playwright/test'

/** 図鑑の絞り込みボタンを開き、選択肢を1つ選ぶ（選ぶと選択肢の画面は閉じる） */
export async function pickCatalogFilter(page: Page, kind: 'layer' | 'area' | 'view', name: string) {
  await page.getByTestId(`catalog-filter-${kind}`).click()
  const sheet = page.getByTestId('catalog-filter-sheet')
  await expect(sheet).toBeVisible()
  await sheet.getByRole('radio', { name, exact: true }).click()
  await expect(sheet).toHaveCount(0)
}
