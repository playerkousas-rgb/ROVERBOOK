/* ==========================================================================
   Vercel Serverless Function — GET/POST /api/embed
   --------------------------------------------------------------------------
   嵌入白名單系統的公開查詢接口（白名單本身就在 CSP 標頭，屬公開資訊，
   零金鑰、零個人資料；管理只經環境變數／部署，不設寫入接口）。

   GET  /api/embed            → 生效白名單 + CSP 值 + iframe allow 契約
   GET  /api/embed?origin=…   → 同上，另附 check（該來源是否獲准嵌入）
   POST /api/embed { origin } → { ok, origin, normalized, allowed, reason }

   平台整合前可先呼叫 check 確認自己已在白名單；未列入者會被 CSP
   frame-ancestors 直接擋下，連 ROVERBOOK 的 JS 都不会載入。
   ========================================================================== */

import { IFRAME_ALLOW, PORTAL_ORIGIN, normalizeEmbedOrigin } from '../shared/embed.js';
import { EMBED_WHITELIST_ENV, resolveEmbedWhitelist } from '../server/whitelist.js';

function sendJson(res, status, obj) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(status).json(obj);
  }
  res.statusCode = status;
  res.end(JSON.stringify(obj));
  return res;
}

function queryOrigin(req) {
  if (req.query && typeof req.query === 'object' && req.query.origin != null) {
    return String(req.query.origin);
  }
  try {
    return new URL(req.url || '/', 'http://localhost').searchParams.get('origin') || '';
  } catch {
    return '';
  }
}

function bodyOrigin(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  return String(body?.origin ?? '').trim();
}

function checkOrigin(raw, wl) {
  const origin = String(raw ?? '').trim();
  const normalized = normalizeEmbedOrigin(origin, { allowLocal: wl.allowLocal });
  if (!normalized) {
    return { origin, normalized: '', allowed: false, reason: 'invalid-origin' };
  }
  const allowed = wl.origins.includes(normalized);
  return { origin, normalized, allowed, reason: allowed ? 'whitelisted' : 'not-whitelisted' };
}

export default function handler(req, res) {
  const wl = resolveEmbedWhitelist();

  if (req.method === 'GET') {
    const payload = {
      ok: true,
      origins: wl.origins,
      defaultOrigins: wl.defaults,
      extraOrigins: wl.extra,
      invalid: wl.invalid,
      frameAncestors: wl.frameAncestors,
      iframeAllow: IFRAME_ALLOW,
      portal: PORTAL_ORIGIN,
      envVar: EMBED_WHITELIST_ENV,
      envHonored: wl.envHonored,
      allowLocal: wl.allowLocal,
      _note: '嵌入白名單（公開資訊）；追加只經 EMBED_WHITELIST（自架）或 shared/embed.js + npm run sync:embed（Vercel）',
    };
    const origin = queryOrigin(req);
    if (origin) payload.check = checkOrigin(origin, wl);
    return sendJson(res, 200, payload);
  }

  if (req.method === 'POST') {
    const origin = bodyOrigin(req);
    if (!origin) return sendJson(res, 400, { error: 'empty', hint: '請提供 { origin: "https://…" }' });
    return sendJson(res, 200, { ok: true, ...checkOrigin(origin, wl) });
  }

  res.setHeader('Allow', 'GET, POST');
  return sendJson(res, 405, { error: '此 API 只接受 GET 與 POST 請求' });
}
