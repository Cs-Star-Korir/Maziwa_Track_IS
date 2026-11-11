// Automated tests (Vitest). Run with:  npm test
// Three groups ("projects"), all in the __tests__ folder:
//   unit – small pieces of logic (formatting, translations, sample-data rules, email helpers)
//   ui   – React screens rendered in a simulated browser (jsdom)
//   api  – the real Express API against a separate test database (skipped without TEST_DATABASE_URL)
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['__tests__/unit/**/*.test.{js,jsx}'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          include: ['__tests__/ui/**/*.test.jsx'],
          environment: 'jsdom',
          setupFiles: ['__tests__/setup/ui.js'],
        },
      },
      {
        extends: true,
        test: {
          name: 'api',
          include: ['__tests__/api/**/*.test.js'],
          environment: 'node',
          globalSetup: ['__tests__/setup/api-global.js'],
          setupFiles: ['__tests__/setup/api.js'],
          // the API test files share one database, so they run one after another
          fileParallelism: false,
          testTimeout: 20000,
          hookTimeout: 30000,
        },
      },
    ],
  },
});
