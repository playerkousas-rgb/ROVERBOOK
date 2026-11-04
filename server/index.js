import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { api } from './api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 3001);
const isProd = process.env.NODE_ENV === 'production';

const app = express();
const server = http.createServer(app);
app.disable('x-powered-by');
app.set('trust proxy', true);

app.get('/healthz', (_req, res) => res.json({ ok: true }));
app.use('/assets/wallet', express.static(path.join(__dirname, 'assets', 'wallet'), { maxAge: '7d' }));
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
  console.log(`ROVERBOOK running on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`);
});
