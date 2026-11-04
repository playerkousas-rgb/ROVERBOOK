import { createContext, useCallback, useContext } from 'react';

export const BookCtx = createContext(null);

export function useBook() {
  const ctx = useContext(BookCtx);
  if (!ctx) throw new Error('BookCtx missing');
  return ctx;
}

// --------------------------------------------------------------- path utils
// 以 "pages.p22.comment" / "service.0.post" 這類字串讀寫資料，
// 令每一頁的欄位可以完全由路徑宣告，毋須逐個寫 setter。

export function getPath(obj, path) {
  if (!path) return undefined;
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

export function setPath(obj, path, value) {
  const keys = path.split('.');
  const walk = (node, i) => {
    const key = keys[i];
    const isLast = i === keys.length - 1;
    if (Array.isArray(node)) {
      const copy = node.slice();
      const index = Number(key);
      while (copy.length <= index) copy.push(undefined);
      copy[index] = isLast ? value : walk(copy[index] ?? {}, i + 1);
      return copy;
    }
    const base = node && typeof node === 'object' ? node : {};
    const copy = { ...base };
    copy[key] = isLast ? value : walk(copy[key] ?? {}, i + 1);
    return copy;
  };
  return walk(obj, 0);
}

export function useField(path, fallback = '') {
  const { book, update } = useBook();
  const value = getPath(book, path);
  const set = useCallback(
    (next) => update((b) => setPath(b, path, typeof next === 'function' ? next(getPath(b, path)) : next)),
    [update, path],
  );
  return [value === undefined || value === null ? fallback : value, set];
}

export function useList(path) {
  const [value, set] = useField(path, []);
  const list = Array.isArray(value) ? value : [];
  return [
    list,
    {
      add: (row) => set([...list, { id: `row_${Math.random().toString(36).slice(2, 8)}`, ...row }]),
      remove: (index) => set(list.filter((_, i) => i !== index)),
      set,
    },
  ];
}
