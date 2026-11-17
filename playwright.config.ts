import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
const BASE = `http://localhost:${PORT}/rus-tili-quiz/`;

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE,
    // Телефон экрани асосий ҳолат
    ...devices['Pixel 7'],
  },
  webServer: {
    command: `npx astro preview --port ${PORT}`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
