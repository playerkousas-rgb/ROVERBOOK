/**
 * PWA：只在 production 註冊 service worker（開發時避免快取舊程式碼）。
 * 有新版本時會派發 window 事件 `roverbook:update`，由介面提示用戶重新載入。
 */

export const UPDATE_EVENT = 'roverbook:update';

let refreshing = false;

export function registerPwa() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  const announce = () => window.dispatchEvent(new CustomEvent(UPDATE_EVENT));

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      if (registration.waiting && navigator.serviceWorker.controller) announce();

      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) announce();
        });
      });

      // 每次回到前景時檢查一次（露營回來、隔幾日再開都唔會用舊版）
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => {});
      });
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
      return;
    }
  } catch {
    /* ignore */
  }
  window.location.reload();
}
