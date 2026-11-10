/**
 * 偵測伺服器端 `/api/roverbadge` 橋接是否可用，並提供同步卡與備份分類所需的純函式。
 *
 * ROVERBOOK 的設計前提：**沒有 ROVERBADGE 也要 100% 可用**。因此這裡只做「可選偵測」，
 * 任何失敗（純靜態主機、SPA fallback 回傳 HTML、404、逾時、離線）都必須安靜地
 * 回報 `available: false`，讓介面切換為「獨立模式」，絕不阻塞紀錄冊任何核心功能。
 *
 * 本檔零依賴（不引入 React 或 `@shared`），讓 Node 單元測試可直接導入驗證。
 */

export const BRIDGE_ENDPOINT = '/api/roverbadge';
export const DEFAULT_ROVERBADGE_URL = 'https://roverbadge.vercel.app';
// 旅團選單的「找不到我的旅團」選項值；永遠不會當作旅團編號送出。
export const TROOP_NOT_FOUND = '__NOT_FOUND__';

const asRecord = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

/**
 * 「前往 ROVERBADGE 開戶」外部連結只接受 https 來源（不含帳密），否則一律退回預設網址，
 * 令連結永遠不可能變成 `javascript:`／`data:` 或本機測試位址。
 */
export function safeBadgeOrigin(value) {
  try {
    const u = new URL(String(value ?? '').trim());
    if (u.protocol === 'https:' && !u.username && !u.password) return u.origin;
  } catch {
    /* fallback below */
  }
  return DEFAULT_ROVERBADGE_URL;
}

export async function probeRoverBadgeBridge({
  fetchImpl = globalThis.fetch,
  timeoutMs = 6000,
} = {}) {
  if (typeof fetchImpl !== 'function') return { available: false, reason: 'no-fetch' };

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const res = await fetchImpl(BRIDGE_ENDPOINT, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
      ...(controller ? { signal: controller.signal } : {}),
    });
    if (!res || !res.ok) return { available: false, reason: `http-${res?.status ?? 'error'}` };

    const type = String(res.headers?.get?.('content-type') || '');
    // 靜態主機會把 /api/* 重寫成 index.html（200 text/html）→ 必須當作不可用。
    if (!type.toLowerCase().includes('json')) return { available: false, reason: 'not-json' };

    const data = await res.json().catch(() => null);
    if (!data?.success || !data.troops || typeof data.troops !== 'object' || Array.isArray(data.troops)) {
      return { available: false, reason: 'bad-payload' };
    }
    return {
      available: true,
      troops: data.troops,
      origin: safeBadgeOrigin(data.origin),
      // 舊版橋接沒有此欄位：未明確回報失敗即視為已讀到上游清單。
      upstreamOk: data.upstreamOk !== false,
    };
  } catch (err) {
    return { available: false, reason: err?.name === 'AbortError' ? 'timeout' : 'network' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function compareTroopIds(a, b) {
  const aNum = /^\d+$/.test(a);
  const bNum = /^\d+$/.test(b);
  if (aNum !== bNum) return aNum ? -1 : 1;
  if (aNum) {
    const x = a.replace(/^0+(?=\d)/, '');
    const y = b.replace(/^0+(?=\d)/, '');
    if (x.length !== y.length) return x.length - y.length;
    if (x !== y) return x < y ? -1 : 1;
  }
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * 旅團選單的固定顯示次序：純數字編號按數值由小至大，其後為英數編號按字串排序。
 * 只影響顯示次序；編號本身逐字保留（`0082` 與 `82` 仍是兩個不同旅團）。
 */
export function sortTroopEntries(troops) {
  return Object.entries(asRecord(troops))
    .filter(([, info]) => info && typeof info === 'object' && !Array.isArray(info))
    .sort(([a], [b]) => compareTroopIds(a, b));
}

/**
 * 重新讀取旅團清單後應選取的旅團編號：
 * - 清單為空：保留用戶手動輸入的編號；
 * - 之前的選擇仍在清單內：保留；
 * - 剛選了「找不到我的旅團」：留空，讓用戶在新清單自行選擇；
 * - 清單只有一個旅團：直接選取；
 * - 其餘情況留空，必須由用戶明確選擇，不代為預選第一個旅團。
 */
export function pickTroopId(prev, troops) {
  const ids = sortTroopEntries(troops).map(([id]) => id);
  const current = typeof prev === 'string' ? prev : '';
  if (current === TROOP_NOT_FOUND) return '';
  if (ids.length === 0) return current;
  if (current && ids.includes(current)) return current;
  if (ids.length === 1) return ids[0];
  return '';
}

/** 完整的 ROVERBOOK 紀錄冊備份（「匯出備份 JSON」的輸出）。 */
export function isBookBackupFile(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (
    Array.isArray(data.members) ||
    Array.isArray(data.pendingRequests) ||
    Boolean(data.otherBadges || data.flatProgress || data.pendingProgress) ||
    (typeof data.schema === 'string' && data.schema.toLowerCase().includes('roverbadge'))
  ) {
    return false;
  }
  return Boolean(
    data.member &&
      typeof data.member === 'object' &&
      !Array.isArray(data.member) &&
      data.pages &&
      typeof data.pages === 'object' &&
      !Array.isArray(data.pages),
  );
}

/**
 * ROVERBADGE 進度檔（已核實進度或「待領袖核實」申報檔），而非完整紀錄冊備份。
 * 只用來決定錯誤提示：這類檔案必須先開啟紀錄冊並在「數位附錄」連接 ROVERBADGE 後才可匯入。
 */
export function isBadgeProgressFile(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) || isBookBackupFile(data)) return false;
  return Boolean(
    data.progress ||
      data.progress_mock ||
      data.flatProgress ||
      data.otherBadges ||
      data.pendingProgress ||
      Array.isArray(data.pendingRequests) ||
      Array.isArray(data.members) ||
      (typeof data.schema === 'string' && data.schema.toLowerCase().includes('roverbadge')) ||
      Object.keys(data).some((k) => /^L[1-4]-[A-Z]+-\d{2}$/.test(k)),
  );
}
