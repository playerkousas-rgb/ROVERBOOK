// 嵌入白名單系統 — 前端橋接（可選偵測，離線自動退回預設白名單）。
// 與 roverbadgeBridge.js 同一原則：API 唔存在／唔通就靜默降級，絕不阻斷紀錄冊。
// 白名單屬公開資訊（CSP 標頭本身就公開），呢度只讀不寫；管理只經
// EMBED_WHITELIST 環境變數（自架）或 shared/embed.js + npm run sync:embed（Vercel）。

import {
  EMBED_WHITELIST,
  IFRAME_ALLOW,
  PORTAL_ORIGIN,
  buildFrameAncestors,
  isOriginAllowed,
  normalizeEmbedOrigin,
} from '@shared/embed.js';

export const DEFAULT_EMBED_ORIGINS = [...EMBED_WHITELIST];

/** 離線／純靜態部署時用的預設白名單資訊（與 shared/embed.js 同一真相）。 */
export function localWhitelistInfo() {
  return {
    ok: false,
    offline: true,
    origins: [...EMBED_WHITELIST],
    defaultOrigins: [...EMBED_WHITELIST],
    extraOrigins: [],
    invalid: [],
    frameAncestors: buildFrameAncestors(EMBED_WHITELIST),
    iframeAllow: IFRAME_ALLOW,
    portal: PORTAL_ORIGIN,
    envHonored: false,
    allowLocal: false,
  };
}

/** 偵測部署的 /api/embed；失敗（離線／靜態主機）回傳 null，由呼叫端降級。 */
export async function probeEmbedWhitelist() {
  try {
    const res = await fetch('/api/embed', { headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || !Array.isArray(data.origins)) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * 核實某來源是否獲准嵌入。優先用部署 API（權威答案），
 * 離線時退回本地白名單比對；回傳一定帶 source: 'api' | 'local'。
 */
export async function checkEmbedOrigin(origin, info = null) {
  const raw = String(origin ?? '').trim();
  try {
    const res = await fetch(`/api/embed?origin=${encodeURIComponent(raw)}`, {
      headers: { accept: 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.check) return { ...data.check, source: 'api' };
    }
  } catch {
    /* 離線／靜態部署：退回本地比對 */
  }
  const list = info?.origins || EMBED_WHITELIST;
  const normalized = normalizeEmbedOrigin(raw);
  const allowed = !!normalized && isOriginAllowed(normalized, list);
  return {
    origin: raw,
    normalized,
    allowed,
    reason: !normalized ? 'invalid-origin' : allowed ? 'whitelisted' : 'not-whitelisted',
    source: 'local',
  };
}

/** 由 document.referrer 推斷嵌入者來源（CSP 已放行先載得到；只取 origin）。 */
export function embedderOrigin(win = typeof window === 'undefined' ? null : window) {
  try {
    const ref = win?.document?.referrer || '';
    return ref ? normalizeEmbedOrigin(ref) : '';
  } catch {
    return '';
  }
}

/** 平台嵌入用的 iframe 範例（跟 README 契約：allow 委派相機及剪貼簿）。 */
export function iframeSnippet(bookOrigin) {
  const origin = normalizeEmbedOrigin(bookOrigin);
  const src = origin ? `${origin}/` : 'https://roverbook.vercel.app/';
  return `<iframe src="${src}" allow="${IFRAME_ALLOW}"></iframe>`;
}
