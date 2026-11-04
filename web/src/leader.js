/* ==========================================================================
   領袖模式（Leader mode）
   --------------------------------------------------------------------------
   一般成員只可以「出示二維碼」；只有開啟領袖模式之後，才會出現「掃描／讀取
   二維碼」同「核簽」功能。

   密碼來自部署環境變數：VITE_LEADER_CODE（在 Vercel → Settings →
   Environment Variables 設定，然後重新 Deploy）。
   ========================================================================== */

const KEY = 'roverbook.leader.v1';

/** 部署時設定的領袖密碼；未設定就是空字串。 */
export const LEADER_CODE = String(import.meta.env?.VITE_LEADER_CODE ?? '').trim();

/** 有無設定密碼（未設定就完全唔會出現領袖模式入口）。 */
export const LEADER_ENABLED = LEADER_CODE.length > 0;

const listeners = new Set();

const emit = () => listeners.forEach((fn) => fn());

export function isLeader() {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

/** 核對密碼；正確就記住這個裝置已進入領袖模式。 */
export function enterLeaderMode(code) {
  if (!LEADER_ENABLED) return { ok: false, reason: 'unset' };
  const given = String(code ?? '').trim();
  if (given !== LEADER_CODE) return { ok: false, reason: 'wrong' };
  try {
    localStorage.setItem(KEY, 'on');
  } catch {
    /* 私人模式：仍然可以本次使用 */
  }
  emit();
  return { ok: true };
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
