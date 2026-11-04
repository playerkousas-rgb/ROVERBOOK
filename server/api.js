import express from 'express';
import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { createShare, getShare, deleteShare, touchShare } from './store.js';
import { walletStatus, buildApplePass, buildGoogleSaveUrl, buildPassJson } from './wallet.js';

export const api = express.Router();
api.use(express.json({ limit: '8mb' }));

const baseUrl = (req) =>
  process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;

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

// ------------------------------------------------------------------ wallet

api.get('/wallet/status', (_req, res) => {
  res.json(walletStatus());
});

api.get('/wallet/preview/:id', (req, res) => {
  const share = getShare(req.params.id);
  if (!share) return res.status(404).json({ error: '找不到分享紀錄' });
  res.json({
    passJson: buildPassJson({
      snapshot: share.snapshot,
      shareUrl: `${baseUrl(req)}/v/${share.id}`,
      serial: share.id,
    }),
    status: walletStatus(),
  });
});

api.post('/wallet/apple', async (req, res) => {
  const share = getShare(req.body?.id);
  if (!share) return res.status(404).json({ error: '找不到分享紀錄，請先建立分享連結' });
  const status = walletStatus();
  if (!status.apple.configured) {
    return res.status(501).json({
      error: 'Apple Wallet 未連接簽署憑證',
      missing: status.apple.missing,
      steps: status.apple.steps,
    });
  }
  try {
    const buffer = await buildApplePass({
      snapshot: share.snapshot,
      shareUrl: `${baseUrl(req)}/v/${share.id}`,
      serial: share.id,
    });
    res
      .type('application/vnd.apple.pkpass')
      .set('Content-Disposition', `attachment; filename="roverbook-${share.id}.pkpass"`)
      .send(buffer);
  } catch (err) {
    console.error('apple pass failed', err);
    res.status(500).json({ error: '產生 Apple Wallet 卡片失敗', detail: String(err.message || err) });
  }
});

api.post('/wallet/google', (req, res) => {
  const share = getShare(req.body?.id);
  if (!share) return res.status(404).json({ error: '找不到分享紀錄，請先建立分享連結' });
  const status = walletStatus();
  if (!status.google.configured) {
    return res.status(501).json({
      error: 'Google Wallet 未連接簽發者帳戶',
      missing: status.google.missing,
      steps: status.google.steps,
    });
  }
  try {
    const { saveUrl } = buildGoogleSaveUrl({
      snapshot: share.snapshot,
      shareUrl: `${baseUrl(req)}/v/${share.id}`,
      serial: share.id,
    });
    res.json({ saveUrl });
  } catch (err) {
    console.error('google pass failed', err);
    res.status(500).json({ error: '產生 Google Wallet 連結失敗', detail: String(err.message || err) });
  }
});
