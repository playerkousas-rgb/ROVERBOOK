/* ROVERBOOK service worker — 配合 APP_VERSION = v2.2.0
 *
 * 策略：
 *   導航請求（/、/p/…、/forms/…、/scan）→ network-first，失敗時用快取的 index.html
 *   /assets/*（有 hash、永不變）        → cache-first
 *   /api/*、其他網域、非 GET            → 直接放行（唔 cache）
 *
 * 更新：不在 install 階段自動 skipWaiting，等用戶點擊「重新載入」才 postMessage({type:'SKIP_WAITING'})，
 *       activate 時清走舊版本 cache。
 */

const VERSION = 'v5';
const CACHE = `roverbook-${VERSION}`;
const SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon.png',
  '/favicon.svg',
  '/favicon-32.png',
  '/favicon-48.png',
  '/img/badge-membership.png',
  '/img/badge-epaulettes.png',
  '/img/badge-rsa.png',
  '/img/badge-bpa.png',
  '/img/crest-rovers.png',
  '/img/uniform-zh.png',
  '/img/uniform-en.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.allSettled(SHELL.map((url) => cache.add(new Request(url, { cache: 'reload' }))));
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key.startsWith('roverbook-') && key !== CACHE).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

const isAsset = (url) => url.pathname.startsWith('/assets/');
const isApi = (url) => url.pathname.startsWith('/api/');

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(request, { cache: 'no-cache' });
    if (fresh && fresh.ok) {
      cache.put('/index.html', fresh.clone());
    }
    return fresh;
  } catch {
    return (
      (await cache.match('/index.html')) ||
      (await cache.match('/')) ||
      new Response('<h1>ROVERBOOK</h1><p>離線，而且未快取過這個頁面。請先連網開啟一次。</p>', {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    );
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (isApi(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (
    isAsset(url) ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/img/') ||
    url.pathname.startsWith('/favicon') ||
    url.pathname === '/manifest.webmanifest'
  ) {
    event.respondWith(cacheFirstAsset(request));
  }
});
