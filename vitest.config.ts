import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/test/**/*.test.ts'],
    hookTimeout: 120_000,
    testTimeout: 120_000,
  },
});
