import { defineConfig } from 'vitest/config';

/** Every package and app brings its own `vitest.config.ts`; the root only lists them. */
export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/*'],
  },
});
