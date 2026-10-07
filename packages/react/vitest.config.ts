import { defineProject } from 'vitest/config';

/**
 * Workspace packages resolve to their TypeScript source through the `blockletter-source`
 * export condition, so a test never needs `packages/core` built first. Setting `conditions`
 * replaces Vite's defaults rather than adding to them, so the defaults are spelled out after it.
 */
const SOURCE_FIRST = ['blockletter-source', 'module', 'browser', 'development|production'];

export default defineProject({
  resolve: { conditions: SOURCE_FIRST },
  test: {
    name: 'react',
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
