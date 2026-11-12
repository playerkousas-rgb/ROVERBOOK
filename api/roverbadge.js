/* ==========================================================================
   Vercel Serverless Function — POST/GET /api/roverbadge
   --------------------------------------------------------------------------
   ROVERBOOK ⇄ ROVERBADGE 個人純進度雲端直連橋接（僅本人，零個人資料）。

   所有後端資訊皆由伺服器端環境變數 ROVERBADGE_ORIGIN 決定，絕不透過 VITE_
   前綴洩漏到瀏覽器，亦不在前端公開 Google Sheet URL / API Key。

   動作白名單：login / logout / load / submitPending
   直接寫入動作（save / saveOtherBadge / reviewRequest …）一律 403 Forbidden，
   杜絕成員將自填進度偽裝成已核實。

   已登記旅團清單（GET）：
   - 回傳 `upstreamOk` 供前端區分「清單真的為空」與「暫時讀不到清單」；
   - 略過 `connected === false` 的未接通項目；
   - 略過帶有 `_aliasOf` 且主鍵（`json.troops[info._aliasOf]`）有效存在的別名項目
     （避免下拉選單同時出現例如 `0082` 與 `82`）。
   ========================================================================== */

export const DEFAULT_BADGE_ORIGIN = 'https://roverbadge.vercel.app';
const EXEC_URL_RE = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{10,}\/exec\/?$/i;
const TEST_LOCAL_RE = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/[A-Za-z0-9._~\-/?=&%]*)?$/;
const ALLOWED_ACTIONS = new Set(['login', 'logout', 'load', 'submitPending']);
const MAX_BODY_BYTES = 512 * 1024;
const TIMEOUT_MS = 30000;
const TROOPS_TIMEOUT_MS = 10000;

export function resolveBadgeOrigin() {
  const raw = String(
    process.env.ROVERBADGE_ORIGIN || process.env.ROVERBADGE_URL || DEFAULT_BADGE_ORIGIN,
  ).trim();
  try {
    const u = new URL(raw);
    if (u.username || u.password) return DEFAULT_BADGE_ORIGIN;
    if (u.protocol === 'https:') return u.origin;
    if (
      process.env.ROVERBOOK_PROXY_TEST === '1' &&
      process.env.VERCEL !== '1' &&
      (u.hostname === '127.0.0.1' || u.hostname === 'localhost')
    ) {
      return u.origin;
    }
  } catch {
    /* fallback below */
  }
  return DEFAULT_BADGE_ORIGIN;
}

function normalizeGasUrl(url) {
  const raw = String(url ?? '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    if (
      u.protocol !== 'https:' ||
      u.hostname !== 'script.google.com' ||
      u.search ||
      u.hash ||
      u.username ||
      u.password ||
      u.port
    ) {
      return raw;
    }
    const m = u.pathname.match(/^\/a\/[^/]+\/macros\/s\/([A-Za-z0-9_-]+)\/exec\/?$/);
    return m ? `https://script.google.com/macros/s/${m[1]}/exec` : raw;
  } catch {
    return raw;
  }
}

function isTrustedGasUrl(url) {
  if (typeof url !== 'string' || url.length > 300) return false;
  if (EXEC_URL_RE.test(normalizeGasUrl(url))) return true;
  if (
    process.env.ROVERBOOK_PROXY_TEST === '1' &&
    process.env.VERCEL !== '1' &&
    TEST_LOCAL_RE.test(url.trim())
  ) {
    return true;
  }
  return false;
}

function getLocalTroopRegistry() {
  const ids = new Set();
  for (const key of Object.keys(process.env)) {
    const m = key.match(/^TROOP_([0-9A-Za-z_-]{1,32})_(NAME|EN|BACKEND|APIKEY)$/);
    if (m) ids.add(m[1]);
  }
  const out = Object.create(null);
  for (const id of ids) {
    const name = String(process.env[`TROOP_${id}_NAME`] || '').trim();
    const en = String(process.env[`TROOP_${id}_EN`] || '').trim();
    const backend = normalizeGasUrl(process.env[`TROOP_${id}_BACKEND`] || '');
    const apikey = String(process.env[`TROOP_${id}_APIKEY`] || '').trim();
    if (name && apikey && backend && isTrustedGasUrl(backend)) {
      out[id] = { id, name, en, backend: backend.replace(/\/$/, ''), apikey };
    }
  }
  return out;
}

function isListableTroop(info) {
  return Boolean(
    info &&
      typeof info === 'object' &&
      !Array.isArray(info) &&
      info.name &&
      info.connected !== false,
  );
}

function aliasTargetOf(id, info) {
  const raw = info && typeof info === 'object' ? info._aliasOf : '';
  const target = typeof raw === 'string' || typeof raw === 'number' ? String(raw).trim() : '';
  return target && target !== id ? target : '';
}

function isDuplicateAlias(id, info, list) {
  const primaryId = aliasTargetOf(id, info);
  if (!primaryId || !Object.prototype.hasOwnProperty.call(list, primaryId)) return false;
  const primary = list[primaryId];
  return isListableTroop(primary) && !aliasTargetOf(primaryId, primary);
}

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

// 讀取請求本體（Vercel、Express 與原生 Node stream 皆相容）
async function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  const stream =
    req.body && typeof req.body.pipe === 'function'
      ? req.body
      : typeof req.pipe === 'function'
        ? req
        : null;
  if (!stream) return {};
  const chunks = [];
  let total = 0;
  for await (const chunk of stream) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > MAX_BODY_BYTES) return null;
    chunks.push(buf);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

// 轉發到 ROVERBADGE 的同源 /api/proxy（或個別旅團覆寫 GAS 後端）
async function forwardProxy(action, data, troopId) {
  const cleanTroop = String(troopId || '').trim();
  const localRegistry = getLocalTroopRegistry();
  const localTroop = localRegistry[cleanTroop];
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;

  try {
    const target = localTroop ? localTroop.backend : `${resolveBadgeOrigin()}/api/proxy`;
    const payload = localTroop
      ? { ...(data || {}), action, apiKey: localTroop.apikey }
      : { action, troopId: cleanTroop, data: data || {} };
    const res = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      ...(controller ? { signal: controller.signal } : {}),
    });
    let json = null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      try {
        json = await res.json();
      } catch {
        json = null;
      }
    }
    if (!res.ok) {
      const err = new Error(json && json.error ? json.error : `上游錯誤 (${res.status})`);
      err.status = res.status;
      err.data = json;
      throw err;
    }
    return json || {};
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * 伺服器端過濾：只抽取「該成員本人」的已核實進度，
 * 徹底剝除 members 名單與所有其他團員資料。
 * @param {object} json ROVERBADGE /api/proxy action load 的完整回應
 * @param {string} scoutId 本機 SCOUT ID（已正規化）
 * @returns {{ progress: object, otherBadges: object|array, pendingRequests: array, ymis: string }}
 */
function filterPersonalConfirmedLoad(json, scoutId) {
  const sid = String(scoutId || '');
  const out = { progress: {}, otherBadges: {}, pendingRequests: [], ymis: sid };

  const members = Array.isArray(json?.members) ? json.members : [];
  let me = null;

  // 1. 優先在 members 名單中以 SCOUT ID / ymis 找到本人
  if (members.length) {
    me =
      members.find((m) => {
        const msid = normalizeScoutIdInFn(m.scoutId || m.ymis || m.memberNo);
        return msid && msid === sid;
      }) || null;
  }

  // 2. 否則嘗試頂層 progress / progress_mock 以 sid 取單一成員進度
  if (!me && sid) {
    for (const key of ['progress', 'progress_mock']) {
      const container = json && json[key] && typeof json[key] === 'object' ? json[key] : null;
      if (container && container[sid] && typeof container[sid] === 'object') {
        me = { scoutId: sid, ...container[sid] };
        break;
      }
    }
  }

  if (!me) return out; // 沒有本人資料，回傳空集合（不洩漏他人）

  out.ymis = me.scoutId || me.ymis || me.memberNo || sid;

  // 已核實進度：progress / flatProgress，僅取 date 字串（已由上游保證為領袖核實）
  const confirmed = me.progress || me.flatProgress || {};
  if (confirmed && typeof confirmed === 'object') {
    Object.entries(confirmed).forEach(([itemId, value]) => {
      const date = typeof value === 'string' ? value : value && value.date ? value.date : '';
      if (date) out.progress[itemId] = date;
    });
  }

  // 其他獎章
  if (me.otherBadges && typeof me.otherBadges === 'object') {
    out.otherBadges = { ...me.otherBadges };
  }

  // 本人待批請求（不包含已核實，供前端顯示「等待領袖 CONFIRM」數量）
  const pending = Array.isArray(me.pendingRequests) ? me.pendingRequests : [];
  out.pendingRequests = pending.map((p) => ({
    itemId: p.itemId || p.id || '',
    date: p.date || '',
    status: p.status || 'pending',
  }));

  return out;
}

// 小幫手：此模組內用的正規化（避免跨模組相依）
function normalizeScoutIdInFn(id) {
  const raw = String(id === undefined || id === null ? '' : id).trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return raw;
  if (/^\d{1,10}$/.test(digits)) return digits.padStart(10, '0');
  return digits;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'GET') {
    // 公開旅團清單（僅 id + 名稱，零後端 URL / API Key）
    const origin = resolveBadgeOrigin();
    const localRegistry = getLocalTroopRegistry();
    const troops = Object.create(null);
    for (const [id, t] of Object.entries(localRegistry)) {
      troops[id] = { name: t.name, ...(t.en ? { en: t.en } : {}) };
    }
    let upstreamOk = false;
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), TROOPS_TIMEOUT_MS) : null;
    try {
      const up = await fetch(`${origin}/api/troops`, {
        method: 'GET',
        headers: { accept: 'application/json' },
        ...(controller ? { signal: controller.signal } : {}),
      });
      if (up.ok) {
        const data = await up.json().catch(() => null);
        const list = data?.troops;
        if (list && typeof list === 'object' && !Array.isArray(list)) {
          upstreamOk = true;
          for (const [id, info] of Object.entries(list)) {
            if (!isListableTroop(info)) continue;
            if (isDuplicateAlias(id, info, list)) continue;
            if (!troops[id]) {
              troops[id] = {
                name: String(info.name),
                ...(info.en ? { en: String(info.en) } : {}),
              };
            }
          }
        }
      }
    } catch {
      /* 上游暫時不可達時仍回傳 200 與 upstreamOk: false，讓前端顯示重試與開戶引導 */
    } finally {
      if (timer) clearTimeout(timer);
    }
    return sendJson(res, 200, {
      success: true,
      origin,
      privacy: 'progress-only',
      upstreamOk,
      troops,
      _note: 'ROVERBOOK ⇄ ROVERBADGE 旅團下拉選單來源',
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return sendJson(res, 405, { error: '此 API 只接受 GET 與 POST 請求' });
  }

  const body = await readBody(req);
  if (body === null) {
    return sendJson(res, 413, { error: '請求內容過大' });
  }
  const action = String(body.action || '');
  const troopId = String(body.troopId || '').trim();
  const scoutId = String(body.scoutId || '').trim();
  const token = String(body.token || '');

  // 示範樣本（或明顯無效的 0000000000 成員編號）不得接觸正式系統的任何寫入路徑。
  const demoPayload =
    body.demo === true ||
    (scoutId && /^0+$/.test(normalizeScoutIdInFn(scoutId))) ||
    (Array.isArray(body.items) && body.items.some((x) => x && x.demo === true));
  if (demoPayload && (action === 'login' || action === 'submitPending')) {
    return sendJson(res, 403, {
      success: false,
      error: '示範樣本只供測試，不可送交 ROVERBADGE 正式系統',
      code: 'DEMO_BLOCKED',
    });
  }

  // 嚴格單向信任：只允許四個動作，其餘（含 save / saveOtherBadge / reviewRequest）一律 403
  if (!ALLOWED_ACTIONS.has(action)) {
    return sendJson(res, 403, {
      error: '不支援或禁止的操作',
      action,
      hint: 'ROVERBOOK 僅允許 login / logout / load / submitPending；直接寫入動作一律拒絕',
    });
  }

  try {
    // ------------------------------------------------------------ login
    if (action === 'login') {
      const password = String(body.password || '');
      if (!troopId || !scoutId || !password) {
        return sendJson(res, 400, { error: '缺少旅團／成員編號／密碼' });
      }
      const up = await forwardProxy('login', { login_id: scoutId, password }, troopId);
      const user = up && up.user ? up.user : {};
      const rawYmis = user.ymis || user.scoutId || user.memberNo || scoutId || '';
      // 剝除姓名與電郵，只回傳身份憑證
      return sendJson(res, 200, {
        success: !!up.success,
        token: up.token || null,
        ymis: normalizeScoutIdInFn(rawYmis) || null,
      });
    }

    // ------------------------------------------------------------ logout
    if (action === 'logout') {
      const up = await forwardProxy('logout', { token }, troopId);
      return sendJson(res, 200, { success: !!up.success });
    }

    // ------------------------------------------------------------ load
    if (action === 'load') {
      if (!troopId || !scoutId || !token) {
        return sendJson(res, 400, { error: '缺少旅團／成員編號／登入憑證' });
      }
      const up = await forwardProxy('load', { token }, troopId);
      const filtered = filterPersonalConfirmedLoad(up, normalizeScoutIdInFn(scoutId));
      return sendJson(res, 200, {
        success: true,
        ymis: filtered.ymis,
        progress: filtered.progress,
        otherBadges: filtered.otherBadges,
        pendingRequests: filtered.pendingRequests,
        _note: '僅回傳本人已核實進度與本人待批請求，已剝除 members 與所有其他團員資料',
      });
    }

    // ------------------------------------------------------------ submitPending
    if (action === 'submitPending') {
      if (!troopId || !scoutId || !token) {
        return sendJson(res, 400, { error: '缺少旅團／成員編號／登入憑證' });
      }
      const items = Array.isArray(body.items) ? body.items : [];
      if (!items.length) {
        return sendJson(res, 400, { error: '沒有待送交項目' });
      }
      // 逐項硬性轉發為 ROVERBADGE action: 'requestComplete'（status: 'pending'），
      // 領袖仍須在 ROVERBADGE 內按 CONFIRM 方為完成；成員無法自行扮已完成。
      const results = [];
      for (const it of items) {
        const itemId = String(it.itemId || it.id || '');
        const date = String(it.date || '');
        if (!itemId) {
          results.push({ itemId: '', ok: false, error: '缺少項目代號' });
          continue;
        }
        try {
          const up = await forwardProxy('requestComplete', { token, itemId, date }, troopId);
          results.push({ itemId, date, ok: !!up.success, status: 'pending', data: up });
        } catch (e) {
          results.push({ itemId, date, ok: false, error: e.message });
        }
      }
      const okCount = results.filter((r) => r.ok).length;
      return sendJson(res, 200, {
        success: okCount > 0,
        total: results.length,
        ok: okCount,
        failed: results.length - okCount,
        results,
        _note: '已轉交為 ROVERBADGE 待領袖核實（requestComplete / status pending），仍須領袖 CONFIRM',
      });
    }

    return sendJson(res, 403, { error: '不支援的操作', action });
  } catch (e) {
    const status = e.status || 502;
    return sendJson(res, status, {
      success: false,
      error: e.message || 'ROVERBADGE 伺服器錯誤',
      data: e.data || null,
    });
  }
}
