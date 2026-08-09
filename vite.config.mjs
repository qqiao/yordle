import { resolve } from 'node:path';

import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        admin: resolve(import.meta.dirname, 'admin.html'),
        main: resolve(import.meta.dirname, 'index.html'),
      },
    },
  },
});
