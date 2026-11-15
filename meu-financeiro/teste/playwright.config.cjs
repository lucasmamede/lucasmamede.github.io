const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  timeout: 25000,
  expect: { timeout: 7000 },
  use: {
    baseURL: 'http://127.0.0.1:5173/meu-financeiro/teste/',
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 7'] } }
  ],
  webServer: {
    command: 'python3 -m http.server 5173 --bind 127.0.0.1 --directory ../..',
    url: 'http://127.0.0.1:5173/meu-financeiro/teste/',
    reuseExistingServer: !process.env.CI,
    timeout: 20000
  },
  reporter: [['list']]
});
