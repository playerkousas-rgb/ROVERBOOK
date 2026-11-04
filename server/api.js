import express from 'express';
import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { createShare, getShare, deleteShare, touchShare } from './store.js';

export const api = express.Router();
api.use(express.json({ limit: '8mb' }));

const baseUrl = (req) =>
  process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;

// ------------------------------------------------------------ 領袖模式閘門

/* 密碼只留在伺服器（環境變數 LEADER_CODE）。本機開發若未設定，用 1234 方便測試；
   production 一定要自己設定，否則領袖模式會關閉。 */
const leaderCode = () => {
  const fromEnv = String(process.env.LEADER_CODE || '').trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'production') return '';
  return '1234';
};

api.get('/leader', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ enabled: leaderCode().length > 0 });
});

api.post('/leader', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const expected = leaderCode();
  if (!expected) return res.status(503).json({ error: 'unset' });
  const given = String(req.body?.code ?? '').trim();
  if (!given) return res.status(400).json({ error: 'empty' });
  const same = given.length === expected.length;
  const ok =
    same &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return res.status(401).json({ error: 'wrong' });
  res.json({ ok: true });
});

// --------------------------------------------------------------- 分享快照

api.post('/share', (req, res) => {
  const { snapshot } = req.body || {};
  if (!snapshot || typeof snapshot !== 'object' || !snapshot.member) {
    return res.status(400).json({ error: '缺少紀錄冊內容' });
  }
  const deleteToken = crypto.randomBytes(18).toString('base64url');
  const share = createShare({ snapshot, deleteToken });
  res.json({
    id: share.id,
    path: `/v/${share.id}`,
    url: `${baseUrl(req)}/v/${share.id}`,
    deleteToken,
    createdAt: share.createdAt,
  });
});

api.get('/share/:id', (req, res) => {
  const share = touchShare(req.params.id);
  if (!share) return res.status(404).json({ error: '連結不存在或已被成員刪除' });
  res.json({ id: share.id, snapshot: share.snapshot, createdAt: share.createdAt, views: share.views });
});

api.delete('/share/:id', (req, res) => {
  const result = deleteShare(req.params.id, req.body?.deleteToken || req.query.token);
  if (!result.ok) {
    return res.status(result.reason === 'not_found' ? 404 : 403).json({
      error: result.reason === 'not_found' ? '連結已經不存在' : '沒有權限刪除（缺少本機金鑰）',
    });
  }
  res.json({ ok: true });
});

// -------------------------------------------------------------------- QR

api.get('/qr.svg', async (req, res) => {
  const data = String(req.query.d || '').slice(0, 800);
  if (!data) return res.status(400).end();
  try {
    const svg = await QRCode.toString(data, {
      type: 'svg',
      margin: 0,
      errorCorrectionLevel: 'M',
      color: { dark: '#123f33', light: '#00000000' },
    });
    res.type('image/svg+xml').set('Cache-Control', 'public, max-age=600').send(svg);
  } catch {
    res.status(500).end();
  }
});

