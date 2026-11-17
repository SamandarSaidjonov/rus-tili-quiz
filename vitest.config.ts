import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Фақат unit тестлар. e2e (Playwright) алоҳида ишга тушади: npm run e2e
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.astro', 'e2e'],
    environment: 'node',
  },
});
