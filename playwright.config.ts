import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
loadEnv(); // loads ADMIN_PASSWORD and other vars from .env

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const isLive = !BASE_URL.includes('localhost') && !BASE_URL.includes('127.0.0.1');

export default defineConfig({
  testDir: './tests',
  globalSetup: './tests/global-setup.ts',
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: false,  // sequential — tests share Supabase state
  retries: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    headless: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  ...(isLive ? {} : {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:8080',
      reuseExistingServer: true,
      timeout: 30000,
    },
  }),
});
