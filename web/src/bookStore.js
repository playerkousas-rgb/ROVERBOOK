import { STORE_KEY, LEGACY_STORE_KEYS, SHARE_KEY, newBook } from '@shared/book.js';

export function loadBook() {
  try {
    let raw = localStorage.getItem(STORE_KEY);
    if (!raw) {
      for (const key of LEGACY_STORE_KEYS) {
        const legacy = localStorage.getItem(key);
        if (legacy) {
          raw = legacy;
          localStorage.setItem(STORE_KEY, legacy);
          break;
        }
      }
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.member) return null;
    return newBook(parsed);
  } catch {
    return null;
  }
}

/** 寫入本機；成功回 null，失敗回錯誤物件（通常是 QuotaExceededError）。 */
export function persistBook(book) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(book));
    return null;
  } catch (e) {
    return { name: e?.name || 'Error', message: e?.message || '未能儲存' };
  }
}

export function clearBook() {
  localStorage.removeItem(STORE_KEY);
}

export function loadShares() {
  try {
    return JSON.parse(localStorage.getItem(SHARE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveShare(record) {
  const all = loadShares();
  all[record.id] = record;
  localStorage.setItem(SHARE_KEY, JSON.stringify(all));
  return all;
}

export function forgetShare(id) {
  const all = loadShares();
  delete all[id];
  localStorage.setItem(SHARE_KEY, JSON.stringify(all));
  return all;
}

export function latestShare() {
  const all = Object.values(loadShares()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return all[0] || null;
}

export function download(filename, data, type = 'application/json') {
  const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function slugify(text, fallback = 'roverbook') {
  return (
    String(text || '')
      .replace(/[^\w\u4e00-\u9fff-]+/g, '')
      .slice(0, 24) || fallback
  );
}
