/** ==========================================================================
 * 嵌入白名單系統 — 伺服器端解析與安全標頭。
 * --------------------------------------------------------------------------
 * 生效白名單 = shared/embed.js 的預設清單 + 環境變數 EMBED_WHITELIST 追加。
 *
 *   - 自架 Node 伺服器（npm run dev / npm start）：每個回應都带上由白名單
 *     推導的 CSP frame-ancestors 等安全標頭，環境變數即時生效。
 *   - Vercel：靜態標頭在部署時已烤入 vercel.json（npm run sync:embed），
 *     所以 VERCEL=1 時不讀 EMBED_WHITELIST，避免「API 話得、CSP 唔俾」的
 *     不一致；要加平台請改 shared/embed.js → sync:embed → redeploy。
 *   - http://localhost／127.0.0.1 來源只在非 Vercel 的開發環境，或
 *     ROVERBOOK_PROXY_TEST=1 的自架測試環境容許（與 ROVERBADGE 橋接同一門檻）。
 * ========================================================================== */

import {
  EMBED_WHITELIST,
  EMBED_WHITELIST_ENV,
  IFRAME_ALLOW,
  PORTAL_ORIGIN,
  buildFrameAncestors,
  normalizeEmbedOrigin,
  parseEmbedWhitelist,
  splitEmbedTokens,
} from '../shared/embed.js';

export { EMBED_WHITELIST_ENV };

/** 是否容許 http 本機嵌入來源（開發／自架測試）。 */
export function allowLocalEmbedders(env = process.env) {
  return env.VERCEL !== '1' && (env.NODE_ENV !== 'production' || env.ROVERBOOK_PROXY_TEST === '1');
}

/**
 * 解析生效白名單。純函式（env 可注入），方便測試。
 * @returns {{
 *   origins: string[], defaults: string[], extra: string[], invalid: string[],
 *   allowLocal: boolean, envHonored: boolean, portal: string, iframeAllow: string,
 *   frameAncestors: string
 * }}
 */
export function resolveEmbedWhitelist(env = process.env) {
  const allowLocal = allowLocalEmbedders(env);
  const opts = { allowLocal };
  const defaults = parseEmbedWhitelist(EMBED_WHITELIST.join(' '), opts);

  // Vercel 的 CSP 是部署時烤入的靜態標頭，環境變數追加只對自架伺服器生效。
  const envHonored = env.VERCEL !== '1';
  const tokens = envHonored ? splitEmbedTokens(env[EMBED_WHITELIST_ENV]) : [];
  const extra = parseEmbedWhitelist(tokens.join(' '), opts).filter((o) => !defaults.includes(o));
  const invalid = tokens.filter((t) => !normalizeEmbedOrigin(t, opts));
  const origins = [...defaults, ...extra];

  return {
    origins,
    defaults,
    extra,
    invalid,
    allowLocal,
    envHonored,
    portal: PORTAL_ORIGIN,
    iframeAllow: IFRAME_ALLOW,
    frameAncestors: buildFrameAncestors(origins),
  };
}

/** 全站安全標頭（與 vercel.json 的靜態標頭同一套值）。 */
export function embedSecurityHeaders(env = process.env) {
  const wl = resolveEmbedWhitelist(env);
  return {
    'Content-Security-Policy': wl.frameAncestors,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
  };
}

/** Express／connect 中介層：把白名單安全標頭套到每個回應（包括靜態與 Vite dev）。 */
export function securityHeadersMiddleware(env = process.env) {
  const headers = embedSecurityHeaders(env);
  return (_req, res, next) => {
    for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
    next();
  };
}
