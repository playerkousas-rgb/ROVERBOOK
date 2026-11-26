/** ==========================================================================
 * 服務平台 iframe 嵌入白名單系統 — 單一真相（single source of truth）。
 * --------------------------------------------------------------------------
 * 部署標頭（vercel.json 的 CSP frame-ancestors）、自架 Node 伺服器的安全標頭、
 * /api/embed 回應與前端顯示，全部由這裏的 EMBED_WHITELIST 推導：
 *
 *   1. 預設白名單：EMBED_WHITELIST（正式服務平台永遠在列）。
 *      修改後執行 `npm run sync:embed` 把 vercel.json 烤同步，再 redeploy。
 *   2. 自架 Node 伺服器可用環境變數 EMBED_WHITELIST 即時追加（見 server/whitelist.js）。
 *   3. 純函式、零 process.env 依賴：瀏覽器與伺服器共用同一套驗證規則。
 *
 * 白名單只接受「來源」（scheme + host + port）：
 *   - 必須是 https（本機開發／測試先容許 http://localhost、http://127.0.0.1）；
 *   - 不接受萬用字元 *、帳號密碼、javascript: 等任何非 http(s) scheme；
 *   - 路徑／查詢／片段會被剝除（CSP frame-ancestors 本身只比對來源）。
 * ========================================================================== */

export const PORTAL_ORIGIN = 'https://member-portal-sigma-swart.vercel.app';

/** 預設嵌入白名單（部署時烤入 vercel.json；測試守住同步）。 */
export const EMBED_WHITELIST = [PORTAL_ORIGIN];

/** 自架伺服器追加白名單用的環境變數名稱（嚴禁 VITE_ 前綴）。 */
export const EMBED_WHITELIST_ENV = 'EMBED_WHITELIST';

export const IFRAME_ALLOW = 'camera; clipboard-write';
export const EMBED_ACK_KEY = 'roverbook.embed.ack.v1';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * 正規化單一嵌入來源；不合格一律回傳空字串。
 * @param {unknown} value 原始輸入（可含路徑，會剝到只剩 origin）
 * @param {{ allowLocal?: boolean }} opts allowLocal：容許 http 本機來源（僅非 Vercel 開發／測試）
 * @returns {string} 例如 'https://portal.example.com'；不合格回 ''
 */
export function normalizeEmbedOrigin(value, { allowLocal = false } = {}) {
  const raw = String(value ?? '').trim();
  if (!raw || raw.length > 200) return '';
  if (/[\s*,;'"`<>]/.test(raw)) return '';
  let u;
  try {
    u = new URL(raw);
  } catch {
    return '';
  }
  if (u.username || u.password) return '';
  const host = u.hostname.toLowerCase();
  if (!host || host.includes('*')) return '';
  if (u.protocol === 'https:') return u.origin;
  if (allowLocal && u.protocol === 'http:' && LOCAL_HOSTS.has(host)) return u.origin;
  return '';
}

/** 把環境變數／輸入字串切成 token（容許逗號、分號、空白、換行分隔）。 */
export function splitEmbedTokens(raw) {
  return String(raw ?? '')
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** 解析整段白名單字串：逐項正規化、剔走不合格、去重（保留順序）。 */
export function parseEmbedWhitelist(raw, opts = {}) {
  const out = [];
  for (const token of splitEmbedTokens(raw)) {
    const origin = normalizeEmbedOrigin(token, opts);
    if (origin && !out.includes(origin)) out.push(origin);
  }
  return out;
}

/** 由已驗證的來源清單產生 CSP frame-ancestors 值（'self' 永遠在首）。 */
export function buildFrameAncestors(origins) {
  const list = [...new Set((origins || []).filter(Boolean))];
  return `frame-ancestors 'self'${list.length ? ` ${list.join(' ')}` : ''}`;
}

/** 判斷某來源是否在白名單內（先正規化再比對）。 */
export function isOriginAllowed(origin, list = EMBED_WHITELIST, opts = {}) {
  const normalized = normalizeEmbedOrigin(origin, opts);
  if (!normalized) return false;
  return (list || []).some((entry) => normalizeEmbedOrigin(entry, opts) === normalized);
}

/** 預設白名單的 CSP 值（vercel.json 全站標頭與此一致）。 */
export const FRAME_ANCESTORS = buildFrameAncestors(EMBED_WHITELIST);

const currentWindow = () => (typeof window === 'undefined' ? null : window);

export function isEmbedded(win = currentWindow()) {
  if (!win) return false;
  try {
    return win.self !== win.top;
  } catch {
    return true;
  }
}

export function standaloneUrl(win = currentWindow()) {
  const origin = win?.location?.origin;
  return origin && origin !== 'null' ? `${origin}/` : '/';
}

export function standaloneHost(win = currentWindow()) {
  return win?.location?.host || '';
}
