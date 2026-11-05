/* ==========================================================================
   Vercel Serverless Function — POST/GET /api/roverbadge
   --------------------------------------------------------------------------
   ROVERBOOK ⇄ ROVERBADGE 個人純進度雲端直連橋接（僅本人，零個人資料）。

   所有後端資訊皆由伺服器端環境變數 ROVERBADGE_ORIGIN 決定，絕不透過 VITE_
   前綴洩漏到瀏覽器，亦不在前端公開 Google Sheet URL / API Key。

   動作白名單：login / logout / load / submitPending
   直接寫入動作（save / saveOtherBadge / reviewRequest …）一律 403 Forbidden，
   杜絕成員將自填進度偽裝成已核實。
   ========================================================================== */

const DEFAULT_ORIGIN = 'https://roverbadge.vercel.app';

function origin() {
  return String(process.env.ROVERBADGE_ORIGIN || DEFAULT_ORIGIN).replace(/\/$/, '');
}

function sendJson(res, status, obj) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(status).json(obj);
}

// 讀取請求本體（Vercel 與 Express 皆可能已解析 JSON，也可能是字串 / stream）
async function readBody(req) {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  if (req.body && typeof req.body.pipe === 'function') {
    const chunks = [];
    for await (const chunk of req.body) chunks.push(chunk);
    const buf = Buffer.concat(chunks);
    if (!buf.length) return {};
    try { return JSON.parse(buf.toString('utf8')); } catch { return {}; }
  }
  return {};
}

// 轉發到 ROVERBADGE 的同源 /api/proxy（伺服器對伺服器，無瀏覽器 header 限制）
async function forwardProxy(action, data, troopId) {
  const res = await fetch(`${origin()}/api/proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ action, troopId: String(troopId || '').trim(), data: data || {} }),
  });
  let json = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try { json = await res.json(); } catch { json = null; }
  }
  if (!res.ok) {
    const err = new Error(json && json.error ? json.error : `上游錯誤 (${res.status})`);
    err.status = res.status;
    err.data = json;
    throw err;
  }
  return json || {};
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
    me = members.find((m) => {
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

const WRITE_ACTIONS = new Set(['save', 'saveOtherBadge', 'reviewRequest']);
const ALLOWED_ACTIONS = new Set(['login', 'logout', 'load', 'submitPending']);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'GET') {
    // 公開旅團清單（僅 id + 名稱，零後端 URL / API Key）
    try {
      const up = await fetch(`${origin()}/api/troops`, {
        headers: { accept: 'application/json' },
      });
      let data = { troops: {} };
      if (up.ok) {
        try { data = await up.json(); } catch { data = { troops: {} }; }
      }
      const troops = data && data.troops && typeof data.troops === 'object' ? data.troops : {};
      return sendJson(res, 200, { troops, _note: 'ROVERBOOK ⇄ ROVERBADGE 旅團下拉選單來源' });
    } catch (e) {
      return sendJson(res, 502, { error: '無法讀取旅團清單', troops: {} });
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return sendJson(res, 405, { error: '此 API 只接受 GET 與 POST 請求' });
  }

  const body = await readBody(req);
  const action = String(body.action || '');
  const troopId = String(body.troopId || '').trim();
  const scoutId = String(body.scoutId || '').trim();
  const token = String(body.token || '');

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
      // 剝除姓名與電郵，只回傳身份憑證
      return sendJson(res, 200, {
        success: !!up.success,
        token: up.token || null,
        ymis: user.ymis || user.scoutId || user.memberNo || scoutId || null,
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
        if (!itemId) { results.push({ itemId: '', ok: false, error: '缺少項目代號' }); continue; }
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
