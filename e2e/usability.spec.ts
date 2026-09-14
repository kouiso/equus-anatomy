import { expect, test } from '@playwright/test'

for (const [width,height] of [[320,568],[390,600],[390,844],[768,1024],[1280,800]]) {
  test(`${width}×${height}: 図から詳細を読み、図の位置を保って戻れる`, async ({page})=>{
    await page.setViewportSize({width:width!,height:height!})
    await page.goto('/?part=muscle-brachiocephalicus')
    const svg=page.getByTestId('anatomy-svg')
    await expect(page.getByRole('heading',{level:2})).toHaveText('腕頭筋')
    const before=await svg.boundingBox()
    const vb=await svg.getAttribute('viewBox')
    const panel=await page.getByTestId('anatomy-panel').boundingBox()
    expect(before!.height/(before!.height+(width!<height!?panel!.height:0))).toBeGreaterThanOrEqual(.6)
    const read=page.getByRole('button',{name:'詳しく読む'})
    const button=await read.boundingBox()
    expect(button!.height).toBeGreaterThanOrEqual(44)
    expect(button!.y+button!.height).toBeLessThanOrEqual(height!-60)
    await read.click()
    await expect(page.getByTestId('part-sheet')).toBeVisible()
    await page.getByRole('button',{name:'閉じる',exact:true}).click()
    await expect(svg).toHaveAttribute('viewBox',vb!)
    expect(await svg.boundingBox()).toEqual(before)
  })
}

test('部位一覧の選択が対応する点に反映し、図は移動しない',async({page})=>{
  await page.setViewportSize({width:390,height:600})
  await page.goto('/')
  const svg=page.getByTestId('anatomy-svg')
  await expect(svg).toBeVisible()
  const vb=await svg.getAttribute('viewBox')
  await page.getByRole('button',{name:'場所・部位一覧',exact:true}).click()
  await page.getByRole('button',{name:'腕頭筋',exact:true}).click()
  await expect(page.getByRole('heading',{level:2})).toHaveText('腕頭筋')
  await expect(page.getByTestId('marker-dot-muscle-brachiocephalicus')).toBeVisible()
  await expect(svg).toHaveAttribute('viewBox',vb!)
})

test('モーダルを連打しても一度戻れば閉じ、ブラウザ進むで再表示できる',async({page})=>{
  await page.goto('/')
  await page.getByRole('button',{name:'表示条件',exact:true}).dblclick()
  await expect(page.getByRole('button',{name:'この条件で表示'})).toBeVisible()
  await page.goBack()
  await expect(page.getByTestId('anatomy-svg')).toBeVisible()
  await expect(page.getByRole('button',{name:'この条件で表示'})).toHaveCount(0)
  await page.goForward()
  await expect(page.getByRole('button',{name:'この条件で表示'})).toBeVisible()
  await page.getByRole('button',{name:'閉じる',exact:true}).click()
  await expect(page.getByTestId('anatomy-svg')).toBeVisible()
})

test('直接開いた部位詳細を閉じると解剖図へ戻れる',async({page})=>{
  await page.goto('/overlay?kind=detail&id=muscle-brachiocephalicus')
  await expect(page.getByTestId('part-sheet')).toBeVisible()
  await page.getByRole('button',{name:'閉じる',exact:true}).click()
  await expect(page.getByTestId('anatomy-svg')).toBeVisible()
})

test('未配置の部位を図で開くと位置未登録の理由を示す',async({page})=>{
  await page.goto('/?part=organ-bladder')
  await expect(page.getByRole('heading',{level:2})).toHaveText('膀胱')
  await expect(page.getByText('この部位は現在の図では位置が未登録です。')).toBeVisible()
  await expect(page.getByTestId('marker-dot-organ-bladder')).toHaveCount(0)
})
