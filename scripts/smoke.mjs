// ROVERBOOK v2 smoke test
// Renders every screen and the read-only share page inside jsdom against the
// running dev server, then exercises the sharing / QR / wallet API.
//
//   npm run dev      # in another terminal
//   npm run smoke
//
// No login, no session cookie: the book lives in localStorage, exactly like the
// real app.

import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { demoBook, buildSnapshot, DEFAULT_SHARE } from '../shared/book.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BASE = process.env.BASE || 'http://127.0.0.1:3001';

const bundlePath = path.join(ROOT, 'node_modules', '.cache', 'roverbook-smoke.mjs');
await build({
  entryPoints: [path.join(ROOT, 'scripts', 'smoke-entry.jsx')],
  bundle: true,
  outfile: bundlePath,
  platform: 'node',
  format: 'esm',
  jsx: 'automatic',
  loader: { '.css': 'empty' },
  alias: { '@shared': path.join(ROOT, 'shared') },
  logLevel: 'error',
  define: { 'process.env.NODE_ENV': '"development"' },
});

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: `${BASE}/`,
  pretendToBeVisual: true,
});
const { window } = dom;
global.window = window;
global.document = window.document;
Object.defineProperty(global, 'navigator', { value: window.navigator, configurable: true });
global.HTMLElement = window.HTMLElement;
global.Node = window.Node;
global.Event = window.Event;
global.MouseEvent = window.MouseEvent;
global.getComputedStyle = window.getComputedStyle;
global.localStorage = window.localStorage;
global.Blob = window.Blob;
global.FileReader = window.FileReader;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);
window.scrollTo = () => {};
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));
global.IS_REACT_ACT_ENVIRONMENT = false;

// jsdom has no canvas backend; the signature pad needs one, but the smoke test
// never draws — it only checks the empty/signed states. Stub just in case.
window.HTMLCanvasElement.prototype.getContext =
  window.HTMLCanvasElement.prototype.getContext ||
  function getContext() {
    return {
      clearRect() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      stroke() {},
      drawImage() {},
      getImageData: () => ({ data: [] }),
      toDataURL: () => 'data:image/png;base64,',
    };
  };

const nativeFetch = globalThis.fetch;

global.fetch = window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? new URL(input, BASE) : input;
  return nativeFetch(url, init);
};

const errors = [];
const originalError = console.error;
console.error = (...args) => {
  const text = args.map(String).join(' ');
  if (!text.includes('not wrapped in act')) errors.push(text.slice(0, 400));
  originalError(...args);
};

const { renderPath, seed, reset, stored } = await import(bundlePath);

let failures = 0;
let passes = 0;

function report(ok, label, detail = '') {
  if (ok) passes++;
  else failures++;
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
}

const textOf = (html) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

async function screen({ name, path: route, expect = [], book = demoBook(), interact, after }) {
  reset();
  if (book) seed(book);
  errors.length = 0;
  let html = '';
  try {
    html = await renderPath(route, { interact, after, wait: 500 });
  } catch (e) {
    report(false, name, `渲染失敗: ${e.message}`);
    return '';
  }
  const missing = expect.filter((x) => !html.includes(x));
  const text = textOf(html);
  const ok = missing.length === 0 && errors.length === 0 && text.length > 60;
  report(
    ok,
    `${name} ${route} — ${text.length} 字`,
    [missing.length ? `缺少: ${missing.join('、')}` : '', errors.length ? `錯誤: ${errors.slice(0, 2).join(' / ')}` : '']
      .filter(Boolean)
      .join(' | '),
  );
  return html;
}

const api = async (route, init) => {
  const res = await nativeFetch(`${BASE}${route}`, init);
  const type = res.headers.get('content-type') || '';
  const body = type.includes('json') ? await res.json() : await res.text();
  return { res, body, type };
};

// ---------------------------------------------------------------- 1. welcome

await screen({
  name: '新用戶封面',
  path: '/',
  book: null,
  expect: ['這本紀錄冊，是你的', '建立我的紀錄冊', '毋須登入', '用示範資料看看'],
});

// -------------------------------------------------------------- 2. 12 chapters

await screen({ name: '目錄', path: '/p/contents', expect: ['目錄', '使用說明', '訓練進度', '會籍'] });
await screen({ name: '個人資料', path: '/p/particulars', expect: ['個人資料', '林卓瑤', '持有人簽署', '緊急事故聯絡人'] });
await screen({ name: '旅部資料', path: '/p/group', expect: ['旅部資料', '黃埔宣道會', '團集會地點'] });
await screen({ name: '童軍紀錄', path: '/p/scouting', expect: ['童軍紀錄', '小童軍', '金紫荊章'] });
await screen({ name: '會員資格', path: '/p/renewals', expect: ['會員資格', '有效至 2026-12-31', '團長簽署'] });
await screen({ name: '服務紀錄', path: '/p/service', expect: ['服務紀錄', '團秘書', '委任人'] });
await screen({ name: '獎章及獎勵', path: '/p/awards', expect: ['獎章及獎勵', '樂行童軍肩章', '頒授 / 核實簽署'] });
await screen({ name: '訓練計劃', path: '/p/training', expect: ['訓練計劃', '會員章', '主考 / 領袖簽署', '與 ROVERBADGE 互通'] });
await screen({ name: '遠足及海外', path: '/p/expeditions', expect: ['遠足及海外', '台灣陽明山', '32 公里'] });
await screen({ name: '其他經驗', path: '/p/additional', expect: ['其他經驗', '聖約翰急救證書'] });
await screen({ name: '簽署及聲明', path: '/p/signatures', expect: ['簽署及聲明', '本人謹此聲明', '領袖核實', '馬啟明'] });
await screen({ name: '數位附錄', path: '/p/appendix', expect: ['數位附錄', '本機儲存', '與 ROVERBADGE 連動'] });

// ------------------------------------------------------------- 3. interaction

await screen({
  name: '填寫：新增服務並自動儲存',
  path: '/p/service',
  expect: ['加一項服務'],
  interact: async (doc) => {
    const before = stored().service.length;
    doc.querySelector('.addrow').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 400));
    const after = stored().service.length;
    if (after !== before + 1) throw new Error(`服務由 ${before} 變成 ${after}`);
    const blank = stored().service[after - 1];
    doc.querySelectorAll('.entry__grid .field__input')[doc.querySelectorAll('.entry__grid .field__input').length - 3].value = '';
    if (!blank.id) throw new Error('新紀錄沒有 id');
  },
});

await screen({
  name: '訓練：勾選項目會寫入本機',
  path: '/p/training',
  expect: ['訓練進度', 'L3-LEADER-01'],
  interact: async (doc) => {
    const before = Object.values(stored().progress).filter((p) => p?.date).length;
    const box = doc.querySelector('.titem__check');
    if (!box) throw new Error('找不到勾選框');
    box.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 450));
    const after = Object.values(stored().progress).filter((p) => p?.date).length;
    if (after === before) throw new Error(`進度項目數沒有改變（${before}）`);
  },
});

await screen({
  name: '分享對話框：建立連結',
  path: '/p/contents',
  expect: ['分享我的紀錄', '分享內容'],
  after: 900,
  interact: async (doc) => {
    doc.querySelector('.topbar__actions .btn--primary').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 350));
    const publish = doc.querySelector('.form-actions .btn--primary');
    if (!publish) throw new Error('找不到「建立分享連結」按鈕');
    publish.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 900));
    const shares = JSON.parse(localStorage.getItem('roverbook.shares.v2') || '{}');
    const ids = Object.keys(shares);
    if (ids.length !== 1) throw new Error(`分享紀錄數量 ${ids.length}`);
    const share = shares[ids[0]];
    if (!share.deleteToken) throw new Error('分享紀錄缺少刪除金鑰');
    await nativeFetch(`${BASE}/api/share/${share.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleteToken: share.deleteToken }),
    });
  },
});

// ------------------------------------------------------------------ 4. API

const snapshot = buildSnapshot(demoBook(), { ...DEFAULT_SHARE, contact: false });

{
  const { res, body } = await api('/api/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ snapshot }),
  });
  report(
    res.ok && body.id && body.path === `/v/${body.id}` && body.url.includes(`/v/${body.id}`) && body.deleteToken,
    'API POST /api/share',
    res.status,
  );

  const got = await api(`/api/share/${body.id}`);
  report(
    got.res.ok && got.body.snapshot.member.nameZh === '林卓瑤' && got.body.snapshot.member.phone === '',
    'API GET /api/share/:id（私隱欄位已剔除）',
    `views=${got.body.views}`,
  );

  const wrong = await api(`/api/share/${body.id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deleteToken: 'not-the-token' }),
  });
  report(wrong.res.status === 403, 'API DELETE 錯 token 被拒', wrong.res.status);

  // render the public page while the share is still alive
  reset();
  errors.length = 0;
  let sharedHtml = '';
  try {
    sharedHtml = await renderPath(`/v/${body.id}`, { wait: 900 });
  } catch (e) {
    report(false, '分享頁渲染', e.message);
  }
  if (sharedHtml) {
    const text = textOf(sharedHtml);
    const ok =
      sharedHtml.includes('林卓瑤') &&
      sharedHtml.includes('公開分享') &&
      sharedHtml.includes('訓練進度') &&
      sharedHtml.includes('成就') === false &&
      errors.length === 0;
    report(ok, `公開分享頁 /v/:id — ${text.length} 字`, errors.slice(0, 2).join(' / '));
  }

  reset();
  errors.length = 0;
  const deadHtml = await renderPath('/v/definitely-not-a-share', { wait: 800 });
  report(deadHtml.includes('找不到這份紀錄冊'), '失效連結顯示作廢頁');

  const del = await api(`/api/share/${body.id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deleteToken: body.deleteToken }),
  });
  const gone = await api(`/api/share/${body.id}`);
  report(del.res.ok && gone.res.status === 404, 'API DELETE 後連結即時失效', `${del.res.status}/${gone.res.status}`);

  const bad = await api('/api/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  report(bad.res.status === 400, 'API POST 缺內容回 400', bad.res.status);
}

{
  const qr = await api('/api/qr.svg?d=' + encodeURIComponent(`${BASE}/v/abc`));
  report(qr.res.ok && qr.type.includes('svg') && qr.body.includes('<svg'), 'API /api/qr.svg 產生 SVG');

  const status = await api('/api/wallet/status');
  const apple = status.body.apple || {};
  const google = status.body.google || {};
  report(
    status.res.ok && Array.isArray(apple.missing) && apple.configured === false && Array.isArray(google.missing),
    'API /api/wallet/status',
    `apple 缺 ${apple.missing?.length ?? '?'} 項、google 缺 ${google.missing?.length ?? '?'} 項`,
  );

  const created = await api('/api/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ snapshot }),
  });
  const id = created.body.id;

  const applePass = await api('/api/wallet/apple', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  report(
    applePass.res.status === 501 && (applePass.body.missing || []).includes('APPLE_PASS_TYPE_ID'),
    'API Apple pass 未配置回 501 + 缺少清單',
    applePass.res.status,
  );

  const googlePass = await api('/api/wallet/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  report(
    googlePass.res.status === 501 && (googlePass.body.missing || []).includes('GOOGLE_WALLET_ISSUER_ID'),
    'API Google pass 未配置回 501 + 缺少清單',
    googlePass.res.status,
  );

  const preview = await api(`/api/wallet/preview/${id}`);
  report(
    preview.res.ok && preview.body.passJson?.generic?.primaryFields?.[0]?.value,
    'API /api/wallet/preview/:id 產生 pass JSON',
  );

  await api(`/api/share/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deleteToken: created.body.deleteToken }),
  });
}

{
  const health = await api('/healthz');
  report(health.res.ok && health.body.ok, 'GET /healthz');
}

console.log(`\n${passes} 項通過、${failures} 項失敗`);
process.exit(failures === 0 ? 0 : 1);
