import { defaultClientConditions, defaultServerConditions } from 'vite';
import { defineProject } from 'vitest/config';

/**
 * Workspace packages resolve to their TypeScript source through the `blockletter-source`
 * export condition, so a test never needs `packages/core` built first. Setting `conditions`
 * replaces Vite's defaults rather than adding to them, so the defaults are spelled out after it.
 * Tests that run in the `node` environment resolve as server code, through `ssr.resolve`, so it
 * carries the condition too; without it they would fall back to the built `dist/` and fail on a
 * fresh checkout.
 */
export default defineProject({
  resolve: { conditions: ['blockletter-source', ...defaultClientConditions] },
  ssr: { resolve: { conditions: ['blockletter-source', ...defaultServerConditions] } },
  test: {
    name: 'react',
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
  },
});
