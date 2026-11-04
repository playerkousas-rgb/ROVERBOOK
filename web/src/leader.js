/* ==========================================================================
   領袖模式（Leader mode）
   --------------------------------------------------------------------------
   一般成員只可以「出示二維碼」；只有開啟領袖模式之後，才會出現「掃描／讀取
   二維碼」同「核簽」功能。

   密碼**只留在伺服器**：Vercel → Settings → Environment Variables 設定
   `LEADER_CODE`（唔要 VITE_ 前綴，唔會送入瀏覽器），由 `POST /api/leader`
   比對。自架版本由 `server/api.js` 提供同一個接口。
   ========================================================================== */

const KEY = 'roverbook.leader.v1';
const TTL = 12 * 60 * 60 * 1000; // 12 小時後自動失效

const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());

export function isLeader() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!at || Date.now() - at > TTL) {
      localStorage.removeItem(KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** 伺服器有無設定 LEADER_CODE（順便當作「這個部署有無領袖模式」）。 */
export async function leaderAvailable() {
  try {
    const res = await fetch('/api/leader', { headers: { accept: 'application/json' } });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.enabled;
  } catch {
    return false;
  }
}

/**
 * 核對密碼。
 * @returns {Promise<{ok:boolean, reason?:'wrong'|'unset'|'offline'}>}
 */
export async function enterLeaderMode(code) {
  const given = String(code ?? '').trim();
  if (!given) return { ok: false, reason: 'wrong' };

  let res;
  try {
    res = await fetch('/api/leader', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ code: given }),
    });
  } catch {
    return { ok: false, reason: 'offline' };
  }

  if (res.ok) {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* 私人模式：本次仍可用 */
    }
    emit();
    return { ok: true };
  }

  const data = await res.json().catch(() => ({}));
  if (res.status === 503 || data.error === 'unset') return { ok: false, reason: 'unset' };
  return { ok: false, reason: 'wrong' };
}

export function exitLeaderMode() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
  emit();
}

export function onLeaderChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
