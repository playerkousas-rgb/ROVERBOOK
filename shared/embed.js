/** 服務平台 iframe 嵌入契約（部署標頭由測試與此單一真相核對）。 */
export const PORTAL_ORIGIN = 'https://member-portal-sigma-swart.vercel.app';
export const FRAME_ANCESTORS = `frame-ancestors 'self' ${PORTAL_ORIGIN}`;
export const IFRAME_ALLOW = 'camera; clipboard-write';
export const EMBED_ACK_KEY = 'roverbook.embed.ack.v1';

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
