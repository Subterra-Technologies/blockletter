import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    // The editor (with its dialogs, menus and icons) is one chunk of about 700 KB, 200 KB
    // compressed: a working screen, loaded once, rather than a landing page to keep light.
    chunkSizeWarningLimit: 1024,
  },
});
