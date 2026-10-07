import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defaultClientConditions, defineConfig } from 'vite';

/**
 * The playground runs the packages from source (the `blockletter-source` export condition), so
 * editing a package reloads here with no build step. `@tailwindcss/vite` compiles the editor's
 * source stylesheet the same way its own build does.
 *
 * To open the dev server from another device, set `HOST=0.0.0.0` and list the hostnames it will
 * be reached by in `ALLOWED_HOSTS` (comma-separated); Vite rejects unknown Host headers.
 *
 * `BASE_PATH` sets the public path for a build served from a sub-directory, such as the GitHub
 * Pages demo at `/blockletter/`.
 */
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    conditions: ['blockletter-source', ...defaultClientConditions],
  },
  server: {
    host: process.env.HOST ?? 'localhost',
    port: Number(process.env.PORT ?? 5173),
    allowedHosts: (process.env.ALLOWED_HOSTS ?? '').split(',').filter(Boolean),
  },
  preview: {
    host: process.env.HOST ?? 'localhost',
    allowedHosts: (process.env.ALLOWED_HOSTS ?? '').split(',').filter(Boolean),
  },
});
