import { expect, test, type Page } from '@playwright/test'

/**
 * 実データ（src/core/data/regions/left.json）で検証する。
 * 当て物のフィクスチャは捨てた。本物の座標で動かんかったら意味がない。
 *
 * DOM は react-native-web が出す。testID は data-testid、accessibilityRole は role、
 * accessibilityLabel は aria-label に落ちる。当たり判定は core が全部やるので、
 * ここでは「押した点のものが選ばれる」「絵と一緒に動く」「見た目の大きさが変わらん」を見る。
 */
const IMAGE = { w: 1600, h: 1200 }

const markerDot = (id: string) => `[data-testid="marker-dot-${id}"]`
const partPath = (id: string) => `path[data-testid="part-${id}"]`
/**
 * 部位の解説の見出しはページ全体で唯一の h2。ヘッダは h1 なので混ざらん。
 * part-sheet の中に絞ると、シートごと消えとる時に「0件」が空振りで通ってしまう。
 */
const sheetHeading = (page: Page) => page.getByRole('heading', { level: 2 })

async function rectOf(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox()
  if (!box) throw new Error(`${selector} の矩形が取れん`)
  return box
}

async function clickCenter(page: Page, selector: string) {
  const box = await rectOf(page, selector)
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

/** 大まかな場所のマーカーをタップして、その場所へ寄る。 */
async function pickArea(page: Page, id: string) {
  await page.locator(markerDot(id)).waitFor()
  await clickCenter(page, markerDot(id))
  await page.waitForTimeout(700)
}

/** 出とる部位の id 一覧。testID の part- を剥がして比べる */
async function shownPartIds(page: Page) {
  return page
    .locator('path[data-testid^="part-"]')
    .evaluateAll((nodes) => nodes.map((n) => (n.getAttribute('data-testid') ?? '').replace(/^part-/, '')).sort())
}

test.describe('大まかな場所', () => {
  test('6つの場所が馬体の上に出て、選ぶとその場所の部位だけになる', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/')
    for (const n of ['頭部', '頸部', '体幹', '前肢', '後肢', '尾']) {
      await expect(page.locator('svg text').filter({ hasText: n }).first()).toBeVisible()
    }
    await pickArea(page, 'fore')
    await expect(page.getByRole('button', { name: '大まかな場所を選び直す' })).toBeVisible()
    // 前肢に属する筋だけが出とる。体幹の筋は出とらん
    await expect(page.locator(partPath('muscle-triceps'))).toHaveCount(1)
    await expect(page.locator(partPath('muscle-oblique'))).toHaveCount(0)
  })

  /**
   * 見えとる点を押したら、その点のものが選ばれること。
   *
   * 実際に踏んだ不具合: 正面の「前肢」は胸から蹄まで枠が伸びるので、
   * 重心が「体幹」の枠の内側に落ちる。多角形だけで当たり判定しとった頃は
   * 点は見えとるのに押すと体幹が選ばれ、前肢の筋には一生たどり着けんかった。
   *
   * 「何かが選ばれた」では通ってしまうので、出た部位の顔ぶれまで見る。
   * 別の場所が選ばれたら顔ぶれが変わって落ちる。
   */
  test('どの向きでも、見えとる場所の点を押したらその場所の部位が出る', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 900, height: 1000 })
    const cases = [
      { view: '正面', area: 'fore', parts: ['muscle-deltoid', 'muscle-ecr', 'muscle-pectoral', 'muscle-triceps'] },
      { view: '正面', area: 'head', parts: ['muscle-masseter'] },
      { view: '正面', area: 'trunk', parts: [] },
      { view: '後面', area: 'hind', parts: ['muscle-biceps-femoris', 'muscle-gastrocnemius', 'muscle-gluteus'] },
      // 尾は L字の輪郭で重心が自分の外へ出る。点だけが頼りになる場所
      { view: '左側望', area: 'tail', parts: [] },
      { view: '左側望', area: 'neck', parts: ['muscle-brachiocephalicus', 'muscle-splenius'] },
    ] as const
    for (const c of cases) {
      await page.goto('/')
      await page.getByRole('radio', { name: c.view }).click()
      await page.waitForTimeout(400)
      await pickArea(page, c.area)
      await expect(
        page.getByRole('button', { name: '大まかな場所を選び直す' }),
        `${c.view}/${c.area} で場所が選ばれてへん`,
      ).toBeVisible()
      expect(await shownPartIds(page), `${c.view}/${c.area} で出た部位が違う（別の場所が選ばれとる）`).toEqual([...c.parts])
    }
  })

  test('場所ごとの部位数が region の対応どおり', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/')
    await pickArea(page, 'hind')
    await expect(page.locator('path[data-testid^="part-"]')).toHaveCount(3) // 中臀筋・大腿二頭筋・腓腹筋
  })
})

test.describe('マーカーのズレ', () => {
  const viewports = [
    { name: 'phone', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 },
  ]

  test('端末幅が変わってもマーカーの画像内相対位置は一定', async ({ page }) => {
    await page.setViewportSize(viewports[0]!)
    await page.goto('/')
    await page.locator(markerDot('trunk')).waitFor()

    const relatives: Record<string, { rx: number; ry: number }> = {}
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.waitForFunction((w) => Math.abs(document.documentElement.clientWidth - (w as number)) < 2, vp.width)
      // onLayout → setState → 再描画の一拍を待つ。直後に測ると前の幅の svg を掴む
      await page.waitForTimeout(300)
      const img = await rectOf(page, '[data-testid="anatomy-image"]')
      const marker = await rectOf(page, markerDot('trunk'))
      relatives[vp.name] = {
        rx: (marker.x + marker.width / 2 - img.x) / img.width,
        ry: (marker.y + marker.height / 2 - img.y) / img.height,
      }
    }
    const base = relatives.phone!
    for (const vp of viewports) {
      const r = relatives[vp.name]!
      expect(Math.abs(r.rx - base.rx), `${vp.name} の x ズレ`).toBeLessThan(0.002)
      expect(Math.abs(r.ry - base.ry), `${vp.name} の y ズレ`).toBeLessThan(0.002)
    }
  })

  test('体幹のマーカーは実データの重心 (865,480) に出る', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/')
    await page.locator(markerDot('trunk')).waitFor()
    const img = await rectOf(page, '[data-testid="anatomy-image"]')
    const box = await rectOf(page, markerDot('trunk'))
    expect((box.x + box.width / 2 - img.x) / img.width).toBeCloseTo(865 / IMAGE.w, 2)
    expect((box.y + box.height / 2 - img.y) / img.height).toBeCloseTo(480 / IMAGE.h, 2)
  })
})

test.describe('タップ', () => {
  test('筋をタップすると、その筋の解説が出る', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/')
    await pickArea(page, 'fore')
    for (const [id, ja] of [
      ['muscle-triceps', '上腕三頭筋'],
      ['muscle-pectoral', '胸筋'],
      ['muscle-ecr', '橈側手根伸筋'],
    ] as const) {
      await clickCenter(page, partPath(id))
      await expect(sheetHeading(page)).toHaveText(ja)
      await page.getByTestId('close-sheet').click()
    }
  })

  /** 旧スパイク検証の吸収分。点を押したら選ばれ、別の点で切り替わる（古いレンダーを見とるだけやと通らん） */
  for (const vp of [
    { w: 390, h: 844 },
    { w: 1280, h: 800 },
  ]) {
    test(`${vp.w}x${vp.h}: 点を押したらその部位が選ばれ、別の点で切り替わる`, async ({ page }) => {
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await page.goto('/')
      await pickArea(page, 'hind')
      await expect(sheetHeading(page)).toHaveCount(0)

      await clickCenter(page, markerDot('muscle-gluteus'))
      await expect(sheetHeading(page)).toHaveText('中臀筋')

      await clickCenter(page, markerDot('muscle-biceps-femoris'))
      await expect(sheetHeading(page)).toHaveText('大腿二頭筋')
    })
  }

  test('馬体の外をタップしても誤爆せん', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/')
    await pickArea(page, 'trunk')
    const img = await rectOf(page, '[data-testid="anatomy-image"]')
    await page.mouse.click(img.x + 6, img.y + 6)
    await expect(sheetHeading(page)).toHaveCount(0)
  })

  test('馬の外（背景の隅）を押したら選択が消える', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    await pickArea(page, 'trunk')
    await clickCenter(page, markerDot('muscle-latissimus'))
    await expect(sheetHeading(page)).toHaveText('広背筋')

    // 1280x800 やと横に余白が出る（xMidYMid meet）。左上の隅は絵の外
    const svg = await rectOf(page, '[data-testid="anatomy-svg"]')
    await page.mouse.click(svg.x + 4, svg.y + 4)
    await expect(sheetHeading(page)).toHaveCount(0)
  })

  test('下書きの座標は破線で描いて、確定済みと見分けられる', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/')
    await pickArea(page, 'trunk')
    await expect(page.locator('path[data-testid^="part-"][stroke-dasharray]').first()).toBeVisible()
  })
})

/**
 * 旧 calibrate.spec.ts の吸収分。アプリ内 /calibrate は無くなった（tools/calibrator/ に一本化）ので
 * 「なぞって確定する」前半は載せられんが、「置いた座標がそのまま本番の絵に出て、右側望では
 * 左右反転する」後半は実データ（left.json の広背筋、下書き）で同じ強さのまま見る。
 */
test.describe('座標の往復', () => {
  // left.json の muscle-latissimus（source: draft）の外接矩形の中心
  const LATISSIMUS = { cx: 828, cy: 396 }

  /** 画像に対する広背筋パスの中心の相対位置 */
  async function latissimusRel(page: Page) {
    await page.locator(partPath('muscle-latissimus')).waitFor()
    const img = await rectOf(page, '[data-testid="anatomy-image"]')
    const box = await rectOf(page, partPath('muscle-latissimus'))
    return {
      box,
      rx: (box.x + box.width / 2 - img.x) / img.width,
      ry: (box.y + box.height / 2 - img.y) / img.height,
    }
  }

  test('データに置いた下書きの座標が、そのまま解剖画面に出てタップで解説が出る', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/')
    await pickArea(page, 'trunk')
    const { box, rx, ry } = await latissimusRel(page)
    expect(rx).toBeCloseTo(LATISSIMUS.cx / IMAGE.w, 2)
    expect(ry).toBeCloseTo(LATISSIMUS.cy / IMAGE.h, 2)

    // タップしたら広背筋の解説が出る
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await expect(sheetHeading(page)).toHaveText('広背筋')
  })

  test('右側望では左側望の座標が左右反転して出る', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/')
    await pickArea(page, 'trunk')
    const leftRel = (await latissimusRel(page)).rx
    await page.getByRole('radio', { name: '右側望' }).click()
    await pickArea(page, 'trunk')
    const rightRel = (await latissimusRel(page)).rx

    expect(leftRel).toBeCloseTo(LATISSIMUS.cx / IMAGE.w, 2)
    expect(rightRel).toBeCloseTo(1 - LATISSIMUS.cx / IMAGE.w, 2)
  })
})

test.describe('ズーム', () => {
  test('拡大してもマーカーとラベルの見た目サイズは変わらん', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/')
    await pickArea(page, 'hind')
    await clickCenter(page, partPath('muscle-gluteus'))
    const label = page.locator('[data-testid="marker-label-muscle-gluteus"] text')
    await label.waitFor()
    const dot = page.locator(markerDot('muscle-gluteus'))
    const before = { label: (await label.boundingBox())!, dot: (await dot.boundingBox())! }
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '拡大' }).click()
    await page.waitForTimeout(250)
    const after = { label: (await label.boundingBox())!, dot: (await dot.boundingBox())! }
    expect(Math.abs(after.label.height - before.label.height), 'ラベル高さ').toBeLessThanOrEqual(1)
    expect(Math.abs(after.label.width - before.label.width), 'ラベル幅').toBeLessThanOrEqual(1)
    expect(Math.abs(after.dot.width - before.dot.width), '点の直径').toBeLessThanOrEqual(1)
  })

  /** 旧スパイク検証の吸収分。逆スケールで点の大きさは据え置き、位置は絵と一緒に動く */
  test('＋で2段寄っても点の見た目の大きさは変わらん（逆スケール）', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    await page.locator(markerDot('head')).waitFor()
    const before = await rectOf(page, markerDot('head'))
    await page.getByTestId('zoom-in').click()
    await page.getByTestId('zoom-in').click()
    // viewBox 更新は state 経由なので1フレーム待つ
    await page.waitForTimeout(200)
    const after = await rectOf(page, markerDot('head'))
    expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(1)
    expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(1)
    // 寄っとる証拠: 画面上の位置が動いとる（中心固定ズームなので端の点ほど外へ出る）
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeGreaterThan(5)
  })

  test('拡大するとマーカーは離れる（絵と一緒に拡大されとる証拠）', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/')
    await page.locator(markerDot('head')).waitFor()
    const gap = async () => {
      const a = await rectOf(page, markerDot('head'))
      const b = await rectOf(page, markerDot('hind'))
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    const before = await gap()
    await page.getByRole('button', { name: '拡大' }).click()
    await page.waitForTimeout(250)
    expect(await gap()).toBeGreaterThan(before * 1.2)
  })
})

test.describe('画面まわり', () => {
  test('図鑑に52件出て、詳細へ行ける', async ({ page }) => {
    await page.goto('/catalog')
    // 件数は「正しい文言」かつ「見えとる」の両方。隠れた数字で通したらあかん
    await expect(page.getByTestId('catalog-count')).toHaveText('52 部位')
    await expect(page.getByTestId('catalog-count')).toBeVisible()
    await page.getByRole('link', { name: /咬筋/ }).first().click()
    // 旧版と同じ h2 の一意性まで見る。strict mode なので h2 が複数あれば落ちる
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('咬筋')
  })

  test('保存が空のとき、行き止まりにならん', async ({ page }) => {
    await page.goto('/saved')
    await expect(page.getByText('保存した部位はまだありません。')).toBeVisible()
    await page.getByRole('link', { name: '解剖図を開く' }).click()
    await expect(page.locator('[data-testid="anatomy-svg"]')).toBeVisible()
  })

  test('座標が無い層では「未配置」を隠さず出す', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('radio', { name: '骨格' }).click()
    await expect(page.getByTestId('placement-status')).toContainText('未配置')
  })
})

test.describe('図鑑の検索と図へのジャンプ', () => {
  test('読み仮名で引ける（かんぞう → 肝臓）', async ({ page }) => {
    await page.goto('/catalog')
    await page.getByTestId('catalog-search').fill('かんぞう')
    await expect(page.getByTestId('catalog-count')).toHaveText('1 部位')
    await expect(page.getByTestId('catalog-row-organ-liver')).toBeVisible()
  })

  test('場所と向きのチップで絞れる（後面は10件）', async ({ page }) => {
    await page.goto('/catalog')
    await page.getByRole('radio', { name: '後面' }).click()
    await expect(page.getByTestId('catalog-count')).toHaveText('10 部位')
    await expect(page.getByTestId('catalog-row-muscle-gluteus')).toBeVisible()
    await expect(page.getByTestId('catalog-row-muscle-masseter')).toHaveCount(0)
  })

  test('図ボタンで解剖図のその部位へ飛ぶ', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/catalog')
    await page.getByTestId('map-muscle-latissimus').click()
    // 部位が選択されて解説が出とり、その場所の範囲に寄っとる（点が見えとる）
    await expect(sheetHeading(page)).toHaveText('広背筋')
    await expect(page.locator(partPath('muscle-latissimus'))).toBeVisible()
  })

  test('詳細で「覚えた」を付けると閉じても残り、図鑑の印と数が変わる', async ({ page }) => {
    await page.goto('/catalog/muscle-masseter')
    await page.getByRole('button', { name: 'まだ' }).click()
    await expect(page.getByRole('button', { name: '覚えた' })).toBeVisible()
    // リロードしても残る（localStorage 実測）
    await page.reload()
    await expect(page.getByRole('button', { name: '覚えた' })).toBeVisible()
    await page.goto('/catalog')
    await expect(page.getByTestId('mastery-count')).toContainText('覚えた 1 / 52')
    // 覚えた印は骨色（#ddcba4）。透明なら「付いてへん」やから色まで見る
    await expect(page.getByTestId('learned-mark-muscle-masseter')).toHaveCSS('background-color', 'rgb(221, 203, 164)')
    // もう一度押すと「まだ」に戻る
    await page.goto('/catalog/muscle-masseter')
    await page.getByRole('button', { name: '覚えた' }).click()
    await expect(page.getByRole('button', { name: 'まだ' })).toBeVisible()
  })

  test('同じ部位へもう一度ジャンプしても、手動で変えた向きが戻る', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 1000 })
    await page.goto('/catalog')
    await page.getByTestId('map-muscle-latissimus').click()
    await expect(sheetHeading(page)).toHaveText('広背筋')
    // ユーザーが向きを変えて（シートも閉じる）から、同じ部位へもう一度跳ぶ
    await page.getByRole('radio', { name: '正面' }).click()
    await page.getByTestId('tab-catalog').click()
    await page.getByTestId('map-muscle-latissimus').click()
    // 広背筋は正面に置いてへんので左側望へ戻り、解説が出直す
    await expect(sheetHeading(page)).toHaveText('広背筋')
    await expect(page.locator(partPath('muscle-latissimus'))).toBeVisible()
  })
})
