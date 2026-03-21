import { defineConfig } from 'vite';
import { resolve } from 'path';
import vercelApiPlugin from './vite-api-plugin.js';

export default defineConfig({
  plugins: [vercelApiPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      allow: ['.'],
    },
  },
});
