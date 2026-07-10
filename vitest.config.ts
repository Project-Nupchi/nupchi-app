import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit tests target framework-free logic (parsers, grading, adapters), so the
// default node environment is enough — no React Native / Expo runtime needed.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
