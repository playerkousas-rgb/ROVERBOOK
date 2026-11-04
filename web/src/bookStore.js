import { STORE_KEY, SHARE_KEY, newBook } from '@shared/book.js';

export function loadBook() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.member) return null;
    return newBook(parsed);
  } catch {
    return null;
  }
}

export function persistBook(book) {
  localStorage.setItem(STORE_KEY, JSON.stringify(book));
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
