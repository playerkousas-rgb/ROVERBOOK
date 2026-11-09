/**
 * PWA：只在 production 註冊 service worker（開發時避免快取舊程式碼）。
 * 有新版本時會派發 window 事件 `roverbook:update`，由介面提示用戶重新載入。
 */

export const UPDATE_EVENT = 'roverbook:update';

let refreshing = false;
let updatePending = false;

export function hasPendingPwaUpdate() {
  return updatePending;
}

export function registerPwa() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  const announce = () => {
    updatePending = true;
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  };

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      const checkNow = () => {
        if (registration.waiting && navigator.serviceWorker.controller) announce();
        registration.update().catch(() => {});
      };

      if (registration.waiting && navigator.serviceWorker.controller) announce();

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) announce();
        });
      });

      // 每次從背景切回前景時檢查一次（加到主畫面 / iOS / Android 都適用）
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkNow();
      });
      window.addEventListener('pageshow', checkNow);
      window.addEventListener('focus', checkNow);
    } catch {
      /* 註冊失敗（例如 http://）就照常用，只係冇離線 */
    }
  });
}

export async function applyPwaUpdate() {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.setTimeout(() => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      }, 1500);
      return;
    }
  } catch {
    /* ignore */
  }
  window.location.reload();
}
