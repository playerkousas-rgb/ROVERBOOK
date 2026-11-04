// ROVERBOOK smoke test (v3 — one printed page per chapter)
// Renders the cover, every page and the read-only share page inside jsdom
// against the running dev server, then exercises the sharing / QR / wallet API.
//
//   npm run dev      # in another terminal
//   npm run smoke

import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { demoBook, buildSnapshot, DEFAULT_SHARE, SECTIONS, PAGE_TOTAL } from '../shared/book.js';

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
global.ResizeObserver =
  window.ResizeObserver ||
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
global.IS_REACT_ACT_ENVIRONMENT = false;

// jsdom has no canvas backend: the signature pad and the text auto-fit do not
// need one, but stub it so a stray call cannot crash a page render.
window.HTMLCanvasElement.prototype.getContext = function getContext() {
  return {
    scale() {},
    clearRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    fill() {},
    stroke() {},
    drawImage() {},
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    toDataURL: () => 'data:image/png;base64,',
  };
};

const nativeFetch = globalThis.fetch;
global.fetch = window.fetch = async (input, init = {}) =>
  nativeFetch(typeof input === 'string' ? new URL(input, BASE) : input, init);

const errors = [];
console.error = (...args) => {
  const text = args.map(String).join(' ');
  if (!text.includes('not wrapped in act')) errors.push(text.slice(0, 400));
};

const { renderPath, seed, reset, stored } = await import(bundlePath);

let failures = 0;
let passes = 0;

const report = (ok, label, detail = '') => {
  ok ? passes++ : failures++;
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
};

const textOf = (html) =>
  html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();

async function screen({ name, path: route, expect = [], empty = false, interact, after, wait = 480 }) {
  reset();
  if (!empty) seed(demoBook());
  errors.length = 0;
  let html = '';
  try {
    html = await renderPath(route, { interact, after, wait });
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
    [
      missing.length ? `缺少: ${missing.join('、')}` : '',
      errors.length ? `錯誤: ${errors.slice(0, 2).join(' / ')}` : '',
    ]
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

// ---------------------------------------------------------------- 1. 封面

await screen({
  name: '新用戶：藍色封面',
  path: '/',
  empty: true,
  expect: ['樂行童軍', '紀　錄　冊', 'RECORD BOOK', '建立我的紀錄冊', '不需要帳號', '香港童軍總會'],
});

await screen({
  name: '已有紀錄冊：整版封面',
  path: '/',
  expect: ['打開紀錄冊', '林卓瑤', '九龍第 145', 'RECORD BOOK'],
});

// ------------------------------------------------- 2. 每一頁（逐頁掃描）

const pageChecks = [
  { id: 'contents', expect: ['目錄', '個人資料', '訓練進度', '綱要'] },
  { id: 'particulars', expect: ['個人資料', '林卓瑤', '持有人簽署', '緊急事故聯絡人', '1 / 15'] },
  { id: 'group', expect: ['旅部資料', '黃埔宣道會', '團集會地點'] },
  { id: 'scouting', expect: ['童軍紀錄', '小童軍', '金紫荊章'] },
  { id: 'renewals', expect: ['會員資格', '2026', '團長簽署'] },
  { id: 'service', expect: ['服務紀錄', '團秘書', '委任人'] },
  { id: 'awards', expect: ['獎章及獎勵', '樂行童軍肩章', '頒授 / 核實簽署'] },
  { id: 'training-1', expect: ['會員章', 'ACT', '簽'] },
  { id: 'training-2', expect: ['樂行童軍肩章', 'INTRO'] },
  { id: 'training-3', expect: ['樂行童軍獎章（一）', '準領袖', '9 / 15'] },
  { id: 'training-4', expect: ['樂行童軍獎章（二）', '國際視野'] },
  { id: 'training-5', expect: ['貝登堡獎章', 'ALL'] },
  { id: 'expeditions', expect: ['遠足及海外活動', '台灣陽明山', '32 公里'] },
  { id: 'additional', expect: ['其他經驗', '聖約翰急救證書'] },
  { id: 'signatures', expect: ['簽署及聲明', '本人謹此聲明', '領袖核實', '馬啟明'] },
  { id: 'appendix', expect: ['數位附錄', '本機儲存', 'ROVERBADGE', '分享'] },
];

for (const check of pageChecks.filter((c) => c.id !== 'contents')) {
  await screen({ name: '頁面', path: `/p/${check.id}`, expect: check.expect });
}

const contents = await screen({
  name: '目錄頁',
  path: '/p/contents',
  expect: pageChecks[0].expect,
});
report(contents.includes('目錄'), '目錄頁顯示「目錄」而非頁碼');

// 每頁都應有頁碼 "n / 15"
{
  const numbers = SECTIONS.filter((s) => s.id !== 'contents').map((s) => s.page);
  report(numbers.length === PAGE_TOTAL, `頁數設定：${numbers.length} / ${PAGE_TOTAL}`, numbers.join(','));
}

// ---------------------------------------------------------------- 3. 互動

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
  },
});

await screen({
  name: '點擊填寫：文字框可直接編輯',
  path: '/p/particulars',
  expect: ['write__input'],
  interact: async (doc) => {
    const box = doc.querySelector('.write');
    if (!box) throw new Error('找不到可填寫欄位');
    box.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 250));
    if (!doc.querySelector('.write__input')) throw new Error('點擊後未出現輸入框');
  },
});

await screen({
  name: '放大填寫：彈出大輸入框並可儲存',
  path: '/p/particulars',
  expect: ['放大填寫'],
  after: 600,
  interact: async (doc) => {
    const zoom = doc.querySelector('.write__zoom');
    if (!zoom) throw new Error('找不到放大按鈕');
    zoom.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));
    const field = doc.querySelector('.zoomfield');
    if (!field) throw new Error('未彈出放大輸入框');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(field, '林卓瑤（測試）');
    field.dispatchEvent(new window.Event('input', { bubbles: true }));
    doc.querySelector('.modal__actions .btn--primary').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 400));
    if (!stored().member.nameZh.includes('測試')) throw new Error('放大輸入未寫入');
  },
});

await screen({
  name: '訓練：勾選項目會寫入本機',
  path: '/p/training-1',
  expect: ['會員章', 'L1-ACT-01', '本頁完成'],
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
  path: '/p/particulars',
  expect: ['分享我的紀錄', '分享內容'],
  after: 900,
  interact: async (doc) => {
    doc.querySelector('.chipbar .chipbtn--gold').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 350));
    const publish = doc.querySelector('.form-actions .btn--primary');
    if (!publish) throw new Error('找不到「建立分享連結」按鈕');
    publish.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 900));
    const shares = JSON.parse(localStorage.getItem('roverbook.shares.v2') || '{}');
    const ids = Object.keys(shares);
    if (ids.length !== 1) throw new Error(`分享紀錄數量 ${ids.length}`);
    await nativeFetch(`${BASE}/api/share/${shares[ids[0]].id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleteToken: shares[ids[0]].deleteToken }),
    });
  },
});

await screen({
  name: '目錄抽屜可開啟',
  path: '/p/awards',
  expect: ['本冊共 15 頁'],
  interact: async (doc) => {
    doc.querySelector('.chipbar__page').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));
    if (!doc.querySelector('.indexlist')) throw new Error('目錄沒有打開');
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
    res.ok && body.id && body.path === `/v/${body.id}` && body.deleteToken,
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

  reset();
  errors.length = 0;
  const sharedHtml = await renderPath(`/v/${body.id}`, { wait: 900 });
  const ok =
    sharedHtml.includes('林卓瑤') &&
    sharedHtml.includes('公開分享') &&
    sharedHtml.includes('訓練進度') &&
    sharedHtml.includes('data:image/svg+xml') &&
    errors.length === 0;
  report(ok, `公開分享頁 /v/:id — ${textOf(sharedHtml).length} 字`, errors.slice(0, 2).join(' / '));

  reset();
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
    `apple 缺 ${apple.missing?.length ?? '?'}、google 缺 ${google.missing?.length ?? '?'}`,
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
  report(preview.res.ok && preview.body.passJson?.generic?.primaryFields?.[0]?.value, 'API /api/wallet/preview/:id');

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
