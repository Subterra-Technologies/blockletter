import { defineConfig } from 'tsup';

/**
 * One ESM bundle and its types; the stylesheet is compiled separately by the Tailwind CLI.
 *
 * Every export renders or drives interactive UI, so the whole bundle is a client module: the
 * `"use client"` banner lets a React Server Components host import it without a wrapper. No
 * Rollup tree-shaking pass (`treeshake`), which would strip that directive; esbuild's own
 * tree-shaking still applies.
 */
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  external: ['react', 'react-dom', '@subterra-technologies/blockletter'],
  banner: { js: '"use client";' },
});
