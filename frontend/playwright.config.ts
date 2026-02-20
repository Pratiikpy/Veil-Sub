import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000, // 2 min per test — Aleo txns are slow
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'on',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  // Don't use the default projects — we launch with extension manually
  projects: [
    {
      name: 'dapp-with-wallet',
      testDir: './e2e',
    },
  ],
})
