import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import roverbadgeHandler from './api/roverbadge.js';

const root = path.dirname(fileURLToPath(import.meta.url));

// 單獨以 `vite` 開發或預覽時，於本地掛載與 Vercel 相同的 `/api/roverbadge` 橋接處理器。
// 正式環境與 `npm run dev` 皆以 `server/api.js` 的 Express 路由處理（不經此 middleware）。
function roverbadgeDevPlugin() {
  const attach = (middlewares) => {
    middlewares.use('/api/roverbadge', (req, res, next) => {
      Promise.resolve(roverbadgeHandler(req, res)).catch(next);
    });
  };

  return {
    name: 'roverbadge-dev-bridge',
    configureServer(server) {
      attach(server.middlewares);
    },
    configurePreviewServer(server) {
      attach(server.middlewares);
    },
  };
}

export default defineConfig({
  root: path.join(root, 'web'),
  plugins: [react(), roverbadgeDevPlugin()],
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
