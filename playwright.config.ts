import { existsSync } from 'node:fs'
import { defineConfig, devices } from '@playwright/test'

/**
 * この開発環境には Chromium が別の場所に焼き込まれとって、@playwright/test の版と
 * ビルド番号が合わん。あるときだけ実体を指し、CI（playwright install 済み）では既定に任せる。
 */
function chromiumPath(): string | undefined {
  const candidates = [process.env.PLAYWRIGHT_CHROMIUM, '/opt/pw-browsers/chromium-1194/chrome-linux/chrome']
  return candidates.find((p): p is string => typeof p === 'string' && existsSync(p))
}

export default defineConfig({
  testDir: './e2e',
  // スクショ取りは検証やのうて道具。既定の実行からは外す（pnpm shots で回す）
  testIgnore: ['**/tools/**'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    launchOptions: { executablePath: chromiumPath() },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
