import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROVERBADGE_ORIGIN = 'https://roverbadge.vercel.app';

// 本機開發用：把 /api/roverbadge 代理到 ROVERBADGE_ORIGIN，使單純以 `vite` 開發時
// 也能登入／讀取本人已核實進度。正式環境與 `npm run dev` 皆以 server/api.js 的
// Express 路由處理（不經此 middleware），此處僅供本地開發備援。
function roverbadgeDevProxy() {
  return {
    name: 'roverbadge-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        if (!url.startsWith('/api/roverbadge')) return next();

        const target = (process.env.ROVERBADGE_ORIGIN || DEFAULT_ROVERBADGE_ORIGIN).replace(/\/$/, '') + url;
        try {
          const init = { method: req.method };
          const headers = {};
          if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            const buf = Buffer.concat(chunks);
            init.body = buf;
            if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];
            else headers['content-type'] = 'application/json; charset=utf-8';
          }
          init.headers = headers;

          const upstream = await fetch(target, init);
          res.statusCode = upstream.status;
          res.statusMessage = upstream.statusText || '';
          for (const [key, value] of upstream.headers.entries()) {
            if (key.toLowerCase() === 'connection') continue;
            res.setHeader(key, value);
          }
          res.setHeader('Cache-Control', 'no-store');
          const ab = await upstream.arrayBuffer();
          res.end(Buffer.from(ab));
        } catch {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: 'ROVERBADGE 伺服器不可達' }));
        }
      });
    },
  };
}

export default defineConfig({
  root: path.join(root, 'web'),
  plugins: [react(), roverbadgeDevProxy()],
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
