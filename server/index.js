import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { api } from './api.js';
import { resolveEmbedWhitelist, securityHeadersMiddleware } from './whitelist.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 3001);
const isProd = process.env.NODE_ENV === 'production';

const app = express();
const server = http.createServer(app);
app.disable('x-powered-by');
app.set('trust proxy', true);

// 嵌入白名單系統：全站安全標頭（CSP frame-ancestors 由白名單推導），
// 必須在 /api、靜態檔與 Vite dev middleware 之前掛載，先覆蓋每一個回應。
app.use(securityHeadersMiddleware());

app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.use('/api', api);

if (isProd) {
  const dist = path.join(ROOT, 'dist');
  if (!fs.existsSync(dist)) {
    console.error('找不到 dist/，請先執行 npm run build');
    process.exit(1);
  }
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    configFile: path.join(ROOT, 'vite.config.js'),
    server: { middlewareMode: true, hmr: { server } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: '伺服器發生錯誤' });
});

server.listen(PORT, '0.0.0.0', () => {
  const wl = resolveEmbedWhitelist();
  console.log(`ROVERBOOK running on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`);
  console.log(`嵌入白名單 ${wl.frameAncestors}${wl.extra.length ? `（環境變數追加 ${wl.extra.length} 項）` : ''}`);
  if (wl.invalid.length) console.warn(`EMBED_WHITELIST 有 ${wl.invalid.length} 項不合格已忽略：${wl.invalid.join(', ')}`);
});
