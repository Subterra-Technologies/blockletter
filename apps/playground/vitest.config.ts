import { defaultClientConditions } from 'vite';
import { defineProject } from 'vitest/config';

/** Unit tests for the playground's own code; the browser suites in `e2e/` run under Playwright. */
export default defineProject({
  resolve: {
    conditions: ['blockletter-source', ...defaultClientConditions],
  },
  test: {
    name: 'playground',
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
