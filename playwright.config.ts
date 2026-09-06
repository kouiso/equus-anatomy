import { defineConfig, devices } from '@playwright/test'

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
    // この環境には Chromium が焼き込まれとる。@playwright/test の版と番号が合わんので実体を直接指す。
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm preview --port 4173 --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
