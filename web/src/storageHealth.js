import { shrinkInk, shrinkPhoto } from './signature.js';

/** localStorage 大約每個網站 5MB；以 UTF-16 計，字元數 × 2 ≈ 佔用。 */
export const STORAGE_LIMIT = 5 * 1024 * 1024;

const isInk = (v) => !!v && typeof v === 'object' && typeof v.ink === 'string';
const isSignature = (v) => !!v && typeof v === 'object' && typeof v.png === 'string';
const isPhoto = (v) => typeof v === 'string' && v.startsWith('data:image');

const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

function setPath(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  keys.slice(0, -1).forEach((k) => {
    if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = {};
    cur = cur[k];
  });
  cur[keys[keys.length - 1]] = value;
}

function labelOf(path) {
  if (path === 'member.photo') return '近照';
  if (path === 'holderSignature.png') return '持有人簽名';
  if (path === 'endorsement.png') return '團長簽名';
  if (path.startsWith('progress.')) {
    const id = path.split('.')[1];
    return `簽核 · ${id}`;
  }
  if (path.startsWith('pages.')) return `手寫 · ${path.split('.').slice(1, -1).join(' / ')}`;
  return path;
}

/** 找出書中所有圖片資料（墨跡、簽名、相片）及大小。 */
export function scanImages(book) {
  const out = [];
  const walk = (node, path, depth = 0) => {
    if (node == null || depth > 6) return;
    if (isInk(node)) {
      out.push({ path: `${path}.ink`, type: 'ink', data: node.ink, chars: node.ink.length, label: labelOf(path) });
      return;
    }
    if (isSignature(node)) {
      out.push({ path: `${path}.png`, type: 'signature', data: node.png, chars: node.png.length, label: labelOf(`${path}.png`) });
      return;
    }
    if (isPhoto(node)) {
      out.push({ path, type: 'photo', data: node, chars: node.length, label: labelOf(path) });
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, `${path}.${i}`, depth + 1));
      return;
    }
    if (typeof node === 'object') {
      Object.keys(node).forEach((key) => walk(node[key], path ? `${path}.${key}` : key, depth + 1));
    }
  };
  walk(book, '');
  return out.sort((a, b) => b.chars - a.chars);
}

export function storageUsage(book) {
  const chars = JSON.stringify(book || {}).length;
  const bytes = chars * 2;
  return {
    chars,
    bytes,
    ratio: Math.min(1, bytes / STORAGE_LIMIT),
    images: scanImages(book),
  };
}

const formatKB = (chars) => `${Math.round((chars * 2) / 1024)} KB`;

export function imageSizeLabel(chars) {
  return formatKB(chars);
}

/**
 * 把書中偏大的圖片資料重壓一次。
 * - 手寫：<= 640×120、單色
 * - 簽名：<= 420×120、單色
 * - 相片：<= 360px JPEG
 * 只會變細，唔會變大；回傳新書及節省量。
 */
export async function compressBookImages(book) {
  const items = scanImages(book);
  const next = structuredClone(book);
  let before = 0;
  let after = 0;
  let changed = 0;

  for (const item of items) {
    if (item.chars < 1500) continue;
    let shrunk = item.data;
    if (item.type === 'photo') {
      shrunk = await shrinkPhoto(item.data, { maxW: 360, quality: 0.7 });
    } else if (item.type === 'signature') {
      shrunk = await shrinkInk(item.data, { maxW: 420, maxH: 120 });
    } else {
      shrunk = await shrinkInk(item.data, { maxW: 640, maxH: 120 });
    }
    if (shrunk && shrunk.length < item.data.length - 64) {
      setPath(next, item.path, shrunk);
      before += item.data.length;
      after += shrunk.length;
      changed += 1;
    }
  }

  return { book: next, changed, before, after, savedChars: before - after };
}

/** 空間不足時的後備：清除所有「頁面手寫墨跡」，只保留簽名。 */
export function stripFieldInk(book) {
  const next = structuredClone(book);
  let removed = 0;
  const walk = (node, depth = 0) => {
    if (node == null || depth > 6) return;
    if (isInk(node)) {
      if (node.ink) {
        node.ink = '';
        removed += 1;
      }
      return;
    }
    if (Array.isArray(node)) return node.forEach((item) => walk(item, depth + 1));
    if (typeof node === 'object') Object.values(node).forEach((v) => walk(v, depth + 1));
  };
  walk(next);
  return { book: next, removed };
}

export { getPath };
