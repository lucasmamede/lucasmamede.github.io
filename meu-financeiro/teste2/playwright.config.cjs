const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './e2e',
  timeout: 25000,
  expect: { timeout: 7000 },
  use: { baseURL: 'http://127.0.0.1:5174/meu-financeiro/teste2/', trace: 'on-first-retry' },
  projects: [
    { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 7'] } }
  ],
  webServer: {
    command: 'python3 -m http.server 5174 --bind 127.0.0.1 --directory ../..',
    url: 'http://127.0.0.1:5174/meu-financeiro/teste2/',
    reuseExistingServer: !process.env.CI,
    timeout: 20000
  },
  reporter: [['list']]
});
