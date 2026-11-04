import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.join(root, 'web'),
  plugins: [react()],
  resolve: {
    alias: { '@shared': path.join(root, 'shared') },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    fs: { allow: [root] },
    hmr: { clientPort: 443 },
  },
  build: {
    outDir: path.join(root, 'dist'),
    emptyOutDir: true,
  },
});
