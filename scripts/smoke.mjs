// ROVERBOOK smoke test (v3 — one printed page per chapter)
// Renders the cover, every page and the read-only share page inside jsdom
// against the running dev server, then exercises the sharing / QR API.
//
//   npm run dev      # in another terminal
//   npm run smoke

import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { demoBook, buildSnapshot, DEFAULT_SHARE, SECTIONS, PAGE_TOTAL } from '../shared/book.js';
import { scanImages, storageUsage, stripFieldInk } from '../web/src/storageHealth.js';
import {
  encodeTransfer,
  decodeTransfer,
  encodeSignoff,
  decodePayload,
  applySignoff,
  QR_LIMIT,
} from '../shared/transfer.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const LEADER_TEST_CODE = '1234';
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
  define: {
    'process.env.NODE_ENV': '"development"',
    'import.meta.env': JSON.stringify({ MODE: 'test', DEV: true, PROD: false }),
  },
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
global.sessionStorage = window.sessionStorage;
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

async function screen({ name, path: route, expect = [], empty = false, leader = false, interact, after, wait = 480 }) {
  reset();
  if (!empty) seed(demoBook());
  if (leader) localStorage.setItem('roverbook.leader.v1', String(Date.now()));
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

// ------------------------------------------- 2. 逐頁掃描（紙本 41 頁 + 附錄）

const PAGE_TEXT = {
  cover: '樂行童軍紀錄冊',
  contents: '本電子版逐頁對應',
  colophon: '九龍柯士甸道',
  'particulars-1': '林卓瑤',
  'particulars-2': '持有人簽署',
  group: '黃埔宣道會',
  scouting: '深資童軍',
  changes: '遷移地址',
  'renewals-1': '旅印及簽署',
  'renewals-2': '十二月三十一日',
  'service-awards': '獎章及獎勵記錄',
  scheme: '銘言',
  plan: '訓練計劃共分為四個階段',
  'mb-intro': '管理委員會',
  'mb-activities': '參與最少三次團活動',
  'mb-understanding': '(2.1)',
  'mb-commitment': '保護童軍成員',
  'mb-presented': '頒發日期',
  'ep-intro': '啟導班',
  'ep-presented': '頒發日期',
  'rsa-intro': '考核流程',
  'rsa-awards': '貝登堡獎章',
  dedication: '準領袖培訓',
  scoutcraft: '傳統童軍技能',
  volunteerism: '急救證書',
  'global-vision': '國際視野',
  tenacity: '興趣及技能',
  'wellness-1': '精神健康',
  'wellness-2': '體育運動',
  intrepidity: '挑戰',
  'rsa-presented': '樂行童軍獎章',
  'interview-district': '區總監',
  'interview-region': '地域總監',
  'bpa-presented': '貝登堡獎章',
  wosm: '世界童軍組織',
  'other-badges-1': '其他獎章',
  'other-badges-2': '其他獎章',
  'additional-1': '其他經驗',
  'additional-2': '其他經驗',
  'expeditions-1': '遠足',
  'expeditions-2': '遠足',
  uniform: '制服',
  promise: '童軍誓詞與規律',
  crest: null,
  appendix: '數位附錄',
};

report(SECTIONS.length === Object.keys(PAGE_TEXT).length, `章節數目 ${SECTIONS.length}`, Object.keys(PAGE_TEXT).join(','));

for (const section of SECTIONS) {
  const expect = [PAGE_TEXT[section.id]].filter(Boolean);
  if (typeof section.page === 'number') expect.push(`第 ${section.page} 頁`, `${section.page} / 43`);
  await screen({ name: '頁面', path: `/p/${section.id}`, expect, wait: 340 });
}

// ---------------------------------------------------------------- 2a. 二維碼傳送

const qrSample = await encodeTransfer(demoBook(), ['particulars', 'progress', 'summaries']);
report(
  qrSample.chars < QR_LIMIT && qrSample.compressed,
  'QR：資料可壓縮至一隻二維碼',
  `${qrSample.chars} 字元（上限 ${QR_LIMIT}）`,
);
const qrBack = await decodeTransfer(qrSample.value);
report(
  qrBack.member?.nameZh === '林卓瑤' && Object.keys(qrBack.progress || {}).length > 10,
  'QR：內容可解碼還原',
  `${Object.keys(qrBack.progress || {}).length} 項進度`,
);
const qrEmpty = await encodeTransfer(demoBook(), []);
report(
  !qrEmpty.payload.member && !qrEmpty.payload.contact && !qrEmpty.payload.progress,
  'QR：預設不傳任何個人資料',
);
const bigBook = demoBook();
bigBook.member.photo = `data:image/jpeg;base64,${'A'.repeat(2600)}`;
const qrAll = await encodeTransfer(
  bigBook,
  ['particulars', 'progress', 'summaries', 'signatures', 'holderSignature', 'photo'],
);
report(qrAll.tooBig, 'QR：超出容量會標示 tooBig', `${qrAll.chars} 字元`);

await screen({
  name: '領袖掃描頁',
  leader: true,
  path: '/scan',
  expect: ['掃描成員的紀錄冊', '貼上二維碼內容'],
  wait: 520,
});

await screen({
  name: '未收到紀錄冊',
  leader: true,
  path: '/scan/view',
  expect: ['未收到紀錄冊', '去掃描'],
  wait: 420,
});

{
  reset();
  seed(demoBook());
  localStorage.setItem('roverbook.leader.v1', String(Date.now()));
  const html = await renderPath('/scan', {
    wait: 520,
    interact: async (doc) => {
      const manualBtn = [...doc.querySelectorAll('button')].find((b) =>
        b.textContent.includes('貼上二維碼內容'),
      );
      if (!manualBtn) throw new Error('找不到貼上按鈕');
      manualBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 220));
      const area = doc.querySelector('.scanmanual textarea');
      if (!area) throw new Error('找不到貼上欄');
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(
        area,
        qrSample.value,
      );
      area.dispatchEvent(new window.Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 200));
      const read = [...doc.querySelectorAll('button')].find((b) => b.textContent.trim() === '讀取');
      if (!read) throw new Error('找不到讀取按鈕');
      read.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 900));
    },
  });
  report(
    html.includes('二維碼接收') && html.includes('林卓瑤'),
    '掃描（貼上內容）→ 讀到成員的紀錄冊',
  );
}

// ---------------------------------------------------------------- 領袖模式

{
  const good = await fetch(`${BASE}/api/leader`);
  const enabled = (await good.json()).enabled;
  const ok = await fetch(`${BASE}/api/leader`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code: process.env.LEADER_CODE || '1234' }),
  });
  const bad = await fetch(`${BASE}/api/leader`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code: '000000' }),
  });
  report(
    enabled === true && ok.ok && bad.status === 401,
    '領袖密碼只在伺服器比對（GET 開關、POST 正確／錯誤）',
    `enabled=${enabled} ok=${ok.status} wrong=${bad.status}`,
  );
}

{
  reset();
  seed(demoBook());
  const html = await renderPath('/scan', { wait: 460 });
  report(
    html.includes('領袖模式') && html.includes('成員只可以出示自己的二維碼') && !html.includes('貼上二維碼內容'),
    '普通模式：掃描頁被擋，只見到領袖模式入口',
  );
}

{
  reset();
  seed(demoBook());
  const html = await renderPath('/p/particulars-1', {
    wait: 480,
    interact: async (doc) => {
      doc.querySelector('button[aria-label="更多"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 240));
    },
  });
  report(
    html.includes('出示二維碼') && !html.includes('掃描二維碼（領袖）') && html.includes('領袖模式'),
    '普通模式選單：只有出示二維碼，另見領袖模式入口',
  );
}

{
  reset();
  seed(demoBook());
  const html = await renderPath('/leader', {
    wait: 480,
    interact: async (doc) => {
      const input = doc.querySelector('#leader-code');
      if (!input) throw new Error('找不到密碼欄');
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(
        input,
        LEADER_TEST_CODE,
      );
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 120));
      const go = [...doc.querySelectorAll('button')].find((b) => b.textContent.includes('進入領袖模式'));
      if (!go) throw new Error('找不到進入按鈕');
      go.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 700));
    },
  });
  report(
    !!localStorage.getItem('roverbook.leader.v1') && html.includes('掃描成員的紀錄冊'),
    '領袖模式：輸入正確密碼後直接去掃描頁',
  );
}

{
  reset();
  seed(demoBook());
  const html = await renderPath('/leader', {
    wait: 460,
    interact: async (doc) => {
      const input = doc.querySelector('#leader-code');
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, '9999');
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 120));
      [...doc.querySelectorAll('button')]
        .find((b) => b.textContent.includes('進入領袖模式'))
        .dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 400));
    },
  });
  report(
    localStorage.getItem('roverbook.leader.v1') === null && html.includes('密碼不正確'),
    '領袖模式：密碼錯誤會提示，唔會開啟',
  );
}

{
  reset();
  seed(demoBook());
  localStorage.setItem('roverbook.leader.v1', String(Date.now()));
  const html = await renderPath('/p/particulars-1', {
    wait: 480,
    interact: async (doc) => {
      doc.querySelector('button[aria-label="更多"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 240));
    },
  });
  report(
    html.includes('掃描二維碼（領袖）') && html.includes('退出領袖模式'),
    '領袖模式選單：出現掃描及退出',
  );
}

{
  reset();
  seed(demoBook());
  const html = await renderPath('/p/particulars-1', {
    wait: 520,
    interact: async (doc) => {
      const menu = doc.querySelector('button[aria-label="更多"]');
      if (!menu) throw new Error('找不到選單');
      menu.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 260));
      const item = [...doc.querySelectorAll('button')].find((b) => b.textContent.includes('出示二維碼'));
      if (!item) throw new Error('找不到出示二維碼');
      item.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 300));
      const box = doc.querySelector('.qropt input');
      if (!box) throw new Error('找不到揀選項目');
      box.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 700));
    },
  });
  report(
    html.includes('出示二維碼') && html.includes('qrpanel__code') && html.includes('<svg'),
    '成員出示二維碼：逐項剔選後即時產生 QR',
  );
}

// 領袖核簽單
{
  const book = demoBook();
  const items = Object.entries(book.progress)
    .filter(([, v]) => v.date)
    .slice(0, 6)
    .map(([id, v]) => ({ id, date: v.date }));
  const signoff = await encodeSignoff({
    member: book.member,
    leader: { name: '馬啟明', title: '樂行童軍團長', at: '2026-11-04', png: book.endorsement.png },
    items,
  });
  report(
    signoff.chars < QR_LIMIT,
    '核簽單：一張簽名＋項目清單放得入一隻 QR',
    `${signoff.chars} 字元 / ${items.length} 項`,
  );

  const decoded = await decodePayload(signoff.value);
  report(
    decoded.t === 'roverbook/signoff' && decoded.items.length === items.length && !!decoded.leader.png,
    '核簽單：可解碼，含簽名及項目',
  );

  const target = demoBook();
  delete target.progress['L1-ACT-01'].assessor;
  const { book: merged, changes } = applySignoff(target, decoded);
  report(
    changes.length === items.length &&
      merged.progress['L1-ACT-01'].assessor === '馬啟明' &&
      !!merged.progress['L1-ACT-01'].signature,
    '核簽單：寫入紀錄冊後有審核員及簽名',
  );
  report(
    merged.progress['L3-LEADER-01'].signature?.name === '馬啟明',
    '核簽單：只改有核簽的項目',
  );
}

await screen({
  name: '未收到核簽單',
  leader: true,
  path: '/scan/signoff',
  expect: ['未收到核簽單', '去掃描'],
  wait: 420,
});

{
  reset();
  const book = demoBook();
  delete book.progress['L1-ACT-01'].assessor;
  seed(book);
  const items = [{ id: 'L1-ACT-01', date: '2024-10-05' }];
  const signoff = await encodeSignoff({
    member: book.member,
    leader: { name: '馬啟明', title: '樂行童軍團長', at: '2026-11-04', png: book.endorsement.png },
    items,
  });
  window.sessionStorage.clear();
  window.sessionStorage.setItem('roverbook.signoff.v1', JSON.stringify(signoff.payload));
  localStorage.setItem('roverbook.leader.v1', String(Date.now()));
  const html = await renderPath('/scan/signoff', {
    wait: 520,
    interact: async (doc) => {
      const btn = [...doc.querySelectorAll('button')].find((b) =>
        b.textContent.includes('寫入我的紀錄冊'),
      );
      if (!btn) throw new Error('找不到寫入按鈕');
      btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 700));
    },
  });
  const storedBook = JSON.parse(localStorage.getItem('roverbook.book.v3'));
  report(
    html.includes('已寫入') && storedBook.progress['L1-ACT-01'].assessor === '馬啟明',
    '成員端：掃入核簽單後寫入紀錄冊',
  );
  window.sessionStorage.clear();
}

{
  reset();
  seed(demoBook());
  const memberPayload = (await encodeTransfer(demoBook(), ['particulars', 'progress'])).payload;
  localStorage.setItem('roverbook.leader.v1', String(Date.now()));
  window.sessionStorage.setItem('roverbook.scan.v1', JSON.stringify(memberPayload));
  const html = await renderPath('/scan/view', {
    wait: 560,
    interact: async (doc) => {
      const btn = [...doc.querySelectorAll('button')].find((b) =>
        b.textContent.includes('以領袖身分簽名'),
      );
      if (!btn) throw new Error('找不到核簽按鈕');
      btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 350));
      if (!doc.querySelector('.modal--sign')) throw new Error('簽名板沒有打開');
      const close = doc.querySelector('.modal__head .icon-btn');
      close?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 200));
    },
  });
  report(
    html.includes('領袖核簽') && html.includes('待核簽'),
    '領袖檢視：顯示核簽面板及待簽項目',
  );
  window.sessionStorage.clear();
}

// 儲存健康
{
  const book = demoBook();
  const usage = storageUsage(book);
  report(
    usage.images.length > 0 && usage.ratio > 0 && usage.ratio < 1,
    '儲存健康：計出已用比例及圖片清單',
    `${usage.images.length} 張圖 · ${Math.round(usage.ratio * 100)}%`,
  );
  const labels = scanImages(book).map((i) => i.label);
  report(
    labels.some((l) => l.includes('簽名')) || labels.some((l) => l.includes('簽核')),
    '儲存健康：可辨認簽名項目',
    labels.slice(0, 3).join(' / '),
  );
}

await screen({
  name: '附錄：儲存健康卡',
  path: '/p/appendix',
  expect: ['儲存健康', '已用約', '壓縮圖片／墨跡', '只保留簽名'],
  wait: 480,
});

{
  reset();
  seed(demoBook());
  const storageProto = window.Storage.prototype;
  const original = Object.getOwnPropertyDescriptor(storageProto, 'setItem');
  const html = await renderPath('/p/particulars-1', {
    wait: 460,
    interact: async (doc) => {
      Object.defineProperty(window.Storage.prototype, 'setItem', {
        configurable: true,
        writable: true,
        value: () => {
          const err = new Error('quota');
          err.name = 'QuotaExceededError';
          throw err;
        },
      });
      const box = doc.querySelector('.write');
      box.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 250));
      const input = doc.querySelector('.write__input');
      if (!input) throw new Error('找不到輸入框');
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(
        input,
        '測試儲存失敗',
      );
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 900));
    },
  });
  Object.defineProperty(window.Storage.prototype, 'setItem', original);
  report(html.includes('儲存空間不足'), '儲存失敗：即時顯示警告，不再靜靜失效');
}

{
  const withInk = demoBook();
  withInk.pages.tenacity.summary = { ink: 'data:image/png;base64,AAAA' };
  const stripped = stripFieldInk(withInk);
  report(
    stripped.removed === 1 &&
      !stripped.book.pages.tenacity.summary.ink &&
      !!stripped.book.endorsement.png,
    '只保留簽名：可清除手寫而保留全部簽名',
  );
}

// PWA：離線與更新
{
  const swPath = path.join(ROOT, 'dist', 'sw.js');
  const sw = fs.existsSync(swPath) ? fs.readFileSync(swPath, 'utf8') : '';
  report(
    sw.includes('SKIP_WAITING') && sw.includes('roverbook-') && sw.includes("request.mode === 'navigate'"),
    '離線：service worker 已輸出並有導航快取',
    sw ? `${Math.round(sw.length / 1024)} KB` : '缺少 dist/sw.js',
  );
}

{
  reset();
  seed(demoBook());
  const html = await renderPath('/p/particulars-1', {
    wait: 480,
    interact: async (doc) => {
      window.dispatchEvent(new window.Event('offline'));
      await new Promise((r) => setTimeout(r, 260));
      if (!doc.body.textContent.includes('離線模式')) throw new Error('未顯示離線提示');
    },
  });
  report(html.includes('離線模式'), '離線：顯示「離線模式」提示，可繼續使用');
}

{
  reset();
  seed(demoBook());
  const html = await renderPath('/p/particulars-1', {
    wait: 480,
    interact: async (doc) => {
      window.dispatchEvent(new window.CustomEvent('roverbook:update'));
      await new Promise((r) => setTimeout(r, 260));
      if (!doc.body.textContent.includes('有新版本')) throw new Error('未顯示更新提示');
    },
  });
  report(html.includes('有新版本') && html.includes('重新載入'), '更新：有新版本時提示重新載入');
}

// ---------------------------------------------------------------- 2b. 官方表格

await screen({
  name: '表格首頁',
  path: '/forms',
  expect: ['一鍵生成', 'PT/69', 'PT/21', 'PT/22', '補充資料'],
  wait: 520,
});

const form21 = await screen({
  name: 'PT/21 樂行童軍獎章申請表',
  path: '/forms/pt21',
  expect: ['樂行童軍獎章及證書申請表', '林卓瑤', '準領袖培訓', '申請者簽署', '提名', '回郵地址'],
  wait: 520,
});
report(
  (form21.match(/☑/g) || []).length >= 4,
  'PT/21 自動剔選四個已完成項目',
  `${(form21.match(/☑/g) || []).length} 個剔號`,
);

await screen({
  name: 'PT/69 考試申請表',
  path: '/forms/pt69',
  expect: ['考試申請', '考試計劃', 'Assessment Planning', '個人摘要', '確認及批核'],
  wait: 520,
});

await screen({
  name: 'PT/22 貝登堡獎章申請表',
  path: '/forms/pt22',
  expect: ['貝登堡獎章及證書申請表', '有效急救證書編號', '樂行童軍獎章'],
  wait: 520,
});

{
  reset();
  seed(demoBook());
  await renderPath('/forms/pt21', {
    wait: 520,
    interact: async (doc) => {
      const btn = [...doc.querySelectorAll('button')].find((b) => b.textContent.includes('預覽'));
      if (!btn) throw new Error('找不到預覽按鈕');
      btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 220));
      if (!doc.body.classList.contains('preview-print')) throw new Error('未進入列印預覽');
    },
  });
  report(true, '列印預覽：隱藏介面、原尺寸顯示文件');
}

{
  reset();
  seed(demoBook());
  await renderPath('/forms/pt69', {
    wait: 520,
    interact: async (doc) => {
      const cell = doc.querySelector('.fd-tbl--plan tbody .write');
      if (!cell) throw new Error('找不到計劃簡述欄位');
      cell.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 220));
      const input = doc.querySelector('.fd-tbl--plan .write__input');
      if (!input) throw new Error('點擊後未出現輸入框');
      const proto =
        input.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(input, '木章第一階段 1A／1B 已完成');
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 700));
      const stored = JSON.parse(localStorage.getItem('roverbook.book.v3'));
      if (!stored.forms?.pt69?.plans?.dedication) throw new Error('補寫內容未存入紀錄冊');
    },
  });
  report(true, '表格內補寫的計劃簡述會存檔並可列印');
}

{
  reset();
  seed(demoBook());
  const all = await renderPath('/forms/all', { wait: 620 });
  const docs = (all.match(/class="formdoc/g) || []).length;
  report(
    all.includes('列印全部') && all.includes('FORM PT/69') && all.includes('FORM PT/21') && all.includes('FORM PT/22'),
    '一次列印三張：三份文件同頁',
  );
  report(docs === 3, '全部列印：文件數目', `${docs} 份`);
}

{
  const assets = path.join(ROOT, 'dist', 'assets');
  const css = fs.existsSync(assets)
    ? fs
        .readdirSync(assets)
        .filter((f) => f.endsWith('.css'))
        .map((f) => fs.readFileSync(path.join(assets, f), 'utf8'))
        .join('\n')
    : '';
  const hasPrint = css.includes('@media print') && css.includes('.app--forms .formbar');
  const hasBreak = css.includes('break-before') || css.includes('page-break-before');
  report(hasPrint && hasBreak, '列印樣式：只印文件、逐張分頁', hasPrint ? '' : '缺少列印規則');
}

{
  reset();
  const inkBook = demoBook();
  inkBook.pages.tenacity.summary = { ink: 'data:image/png;base64,iVBORw0KGgo=' };
  seed(inkBook);
  const html = await renderPath('/p/tenacity', { wait: 420 });
  report(html.includes('write__ink'), '手寫墨跡存為圖片，按格線等比縮放');
}

// ---------------------------------------------------------------- 3. 互動

await screen({
  name: '紙本固定行數：表單不再提供「加一行」',
  path: '/p/service-awards',
  interact: async (doc) => {
    if (doc.querySelector('.addrow')) throw new Error('仍出現「加一行」按鈕（紙本表格行數固定）');
  },
});

await screen({
  name: '填寫：服務紀錄第一行即時儲存',
  path: '/p/service-awards',
  interact: async (doc) => {
    const rows = [...doc.querySelectorAll('.pgtable__row')].slice(1);
    const blank = rows[1] || rows[0];
    if (!blank) throw new Error('找不到資料行');
    const box = blank.querySelector('.write');
    if (!box) throw new Error('找不到可填寫的表格欄位');
    box.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 200));
    const input = blank.querySelector('.write__input');
    if (!input) throw new Error('點擊後未出現輸入框');
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setValue.call(input, '副團長');
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 400));
    const after = JSON.parse(localStorage.getItem('roverbook.book.v3')).service || [];
    if (!after.some((r) => r.post === '副團長')) throw new Error(`未寫入：${JSON.stringify(after)}`);
  },
});

await screen({
  name: '點擊即寫：底線變輸入框',
  path: '/p/particulars-1',
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
  path: '/p/particulars-1',
  expect: ['放大填寫'],
  after: 600,
  interact: async (doc) => {
    const target = doc.querySelector('.write[aria-label="姓名（中文）"]');
    const zoom = target && target.querySelector('.write__zoom');
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
    if (!JSON.parse(localStorage.getItem('roverbook.book.v3')).member.nameZh.includes('測試')) throw new Error('放大輸入未寫入');
  },
});

await screen({
  name: '訓練細項：填寫審核日期會寫入進度',
  path: '/p/mb-commitment',
  expect: ['Safe From Harm'],
  interact: async (doc) => {
    const field = doc.querySelector('.prow .write__date');
    if (!field) throw new Error('找不到審核日期欄');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(field, '2026-05-01');
    field.dispatchEvent(new window.Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 450));
    const progress = JSON.parse(localStorage.getItem('roverbook.book.v3')).progress || {};
    if (!Object.values(progress).some((p) => p?.date === '2026-05-01')) throw new Error('審核日期未寫入進度');
  },
});

await screen({
  name: '簽名：可以開啟簽名板',
  path: '/p/particulars-2',
  expect: ['持有人簽署'],
  interact: async (doc) => {
    const btn = doc.querySelector('.sigblock__actions .linkbtn') || doc.querySelector('.sigblock__empty');
    if (!btn) throw new Error('找不到簽名控制');
    btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));
    if (!doc.querySelector('.pad__canvas')) throw new Error('未開啟簽名板');
  },
});

await screen({
  name: '分享對話框：建立連結',
  path: '/p/particulars-1',
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
  path: '/p/uniform',
  wait: 300,
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

  const created = await api('/api/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ snapshot }),
  });
  const id = created.body.id;

  await api(`/api/share/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deleteToken: created.body.deleteToken }),
  });
}

// ------------------------------------------------------------- v11 版面 · 語言 · 身份

{
  // 主舞台曾被「訓練計劃」的 .stage 網格樣式搶走，整個紀錄冊壓成 20 餘 px 闊。
  const css = await (await nativeFetch(`${BASE}/src/styles.css`)).text();
  const shell = css.match(/\.stage\s*\{[^}]*\}/);
  const plan = css.match(/\.pstage\s*\{[^}]*\}/);
  report(
    !!shell && /display:\s*flex/.test(shell[0]) && !/grid-template-columns/.test(shell[0]) && !!plan && /grid-template-columns/.test(plan[0]),
    '版面：主舞台與訓練計劃樣式已分家（.stage / .pstage）',
    shell ? shell[0].replace(/\s+/g, ' ').slice(0, 60) : '找不到 .stage',
  );
}

{
  const book = demoBook();
  report(
    book.member.scoutId === '24010001' && book.member.memberNo === book.member.scoutId && !('ymis' in book.member),
    '身份：紀錄冊編號 ＝ 童軍成員編號 SCOUT ID（舊 YMIS 欄位已淘汰）',
  );
}

await screen({
  name: '身份：改紀錄冊編號會同步 SCOUT ID',
  path: '/p/particulars-1',
  expect: ['紀錄冊編號', 'SCOUT ID'],
  interact: async (doc) => {
    const wrap = doc.querySelector('.write[aria-label="紀錄冊編號"]');
    if (!wrap) throw new Error('找不到紀錄冊編號欄位');
    wrap.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 200));
    const input = wrap.querySelector('.write__input') || doc.querySelector('.write__input');
    if (!input) throw new Error('找不到紀錄冊編號輸入框');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, '24019999');
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 500));
    const saved = JSON.parse(localStorage.getItem('roverbook.book.v3'));
    if (saved.member.memberNo !== '24019999') throw new Error(`紀錄冊編號未寫入（${saved.member.memberNo}）`);
    if (saved.member.scoutId !== '24019999') throw new Error(`SCOUT ID 未同步（${saved.member.scoutId}）`);
  },
});

await screen({
  name: '語言：一按切換全英文',
  path: '/p/particulars-1',
  expect: ['PERSONAL PARTICULARS'],
  interact: async (doc) => {
    const btn = doc.querySelector('.chipbtn--lang');
    if (!btn) throw new Error('找不到語言切換按鈕');
    btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 350));
    if (document.documentElement.dataset.lang !== 'en') throw new Error('html data-lang 沒有變成 en');
    if (localStorage.getItem('roverbook.lang') !== 'en') throw new Error('語言選擇沒有記住');
    const title = doc.querySelector('.pghead__title')?.textContent || '';
    if (!title.includes('PERSONAL PARTICULARS')) throw new Error(`頁目標題沒有轉英文（${title}）`);
    const label = doc.querySelector('.frow__label')?.textContent || '';
    if (/[\u4e00-\u9fff]/.test(label)) throw new Error(`欄位標籤仍是中文（${label}）`);
    if (!/Record Book No/.test(label)) throw new Error(`欄位標籤不是英文（${label}）`);
  },
});

{
  // 切換後重新載入仍然記得
  reset();
  seed(demoBook());
  localStorage.setItem('roverbook.lang', 'en');
  const html = await renderPath('/p/particulars-1', {});
  report(html.includes('PAGE 3') && html.includes('PERSONAL PARTICULARS'), '語言：重新載入後仍為英文');
  localStorage.removeItem('roverbook.lang');
}

// --------------------------------------------------------- v13 整本列印對頁

await screen({
  name: '整本列印：43 頁紙對 43 頁紀錄冊',
  path: '/print',
  expect: ['第 2 頁 · 共 43 頁', '第 43 頁 · 共 43 頁'],
  interact: async (doc) => {
    const n = doc.querySelectorAll('.printall__one .sheet').length;
    if (n !== 43) throw new Error(`列印頁數 ${n}，應為 43`);
  },
});

// ------------------------------------------------------- v12 圖示 · 聲明 · 頂欄

{
  const html = await (await nativeFetch(`${BASE}/`)).text();
  report(
    html.includes('/favicon.svg') && html.includes('/favicon-32.png') && html.includes('apple-touch-icon'),
    '網站圖示：favicon（SVG + PNG）及 apple-touch-icon 已設定',
  );
}

await screen({
  name: '非官方聲明（附錄）',
  path: '/p/appendix',
  expect: ['Copyright © 2026 SCOUT SYSTEM', '本網站為非官方獨立工具', '與香港童軍總會無任何官方從屬關係', '版權歸香港童軍總會所有'],
});

await screen({
  name: '頂欄：目錄只有一個入口（不重覆）',
  path: '/p/particulars-1',
  expect: ['PERSONAL PARTICULARS'],
  interact: async (doc) => {
    const dupes = [...doc.querySelectorAll('.chipbar .chipbtn')].filter((b) => (b.getAttribute('title') || '').includes('目錄'));
    if (dupes.length) throw new Error(`頂欄仍有 ${dupes.length} 個重覆的目錄按鈕`);
    if (!doc.querySelector('.chipbar__page')) throw new Error('找不到頁碼／目錄入口');
  },
});

{
  const health = await api('/healthz');
  report(health.res.ok && health.body.ok, 'GET /healthz');
}

// --------------------------------------------------------- v2.1 版面、簽名與版本同步

{
  const css = fs.readFileSync(path.join(ROOT, 'web', 'src', 'styles.css'), 'utf8');
  const hasCols = ['--col-no', '--col-person', '--col-date', '--col-sig', '--col-cert'].every((v) => css.includes(v));
  const hasContainer = /container-type|@container/.test(css);
  const hasEllipsis = /\.write__fit\s*\{[^}]*text-overflow:\s*ellipsis/.test(css);
  report(hasCols && !hasContainer && hasEllipsis, '樣式：已定義 --col-* 闊度與截斷，並禁用容器查詢');
}

{
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const html = fs.readFileSync(path.join(ROOT, 'web', 'index.html'), 'utf8');
  const swSrc = fs.readFileSync(path.join(ROOT, 'web', 'public', 'sw.js'), 'utf8');
  const { APP_VERSION } = await import('../shared/book.js');
  const installBlock = swSrc.match(/addEventListener\('install'[\s\S]*?\}\);/)?.[0] || '';
  const noAutoSkip = !installBlock.includes('skipWaiting');
  const swV4 = swSrc.includes("VERSION = 'v4'") && swSrc.includes('roverbook-');
  const verMatch =
    `v${pkg.version}` === APP_VERSION &&
    html.includes(`content="${APP_VERSION}"`) &&
    html.includes(`window.APP_VERSION = '${APP_VERSION}'`);
  report(verMatch && swV4 && noAutoSkip, `版本同步：package / APP_VERSION / index.html / sw.js (${APP_VERSION})`);
}

{
  const rb = await api('/api/roverbadge');
  report(
    rb.res.ok &&
      rb.body?.success === true &&
      rb.body?.origin === 'https://roverbadge.vercel.app' &&
      typeof rb.body?.upstreamOk === 'boolean' &&
      rb.body?.troops &&
      typeof rb.body.troops === 'object',
    'GET /api/roverbadge：回傳 origin、upstreamOk 與已過濾旅團物件',
  );
}

await screen({
  name: '附錄：ROVERBADGE 進度檔未登入鎖定＋開戶提示＋離線完整備份維持可用',
  path: '/p/appendix',
  expect: ['ROVERBADGE 進度檔匯出／匯入已鎖定', '匯出完整備份 JSON', '還原備份 JSON', '前往 ROVERBADGE 開戶'],
  wait: 520,
});

{
  reset();
  const b = demoBook();
  b.member.gender = '女 Female';
  seed(b);
  const pt21 = await renderPath('/forms/pt21', { wait: 420 });
  report(pt21.includes('<th>性別<em>Gender</em></th><td>女 Female</td>'), '表格：PT/21 個人資料顯示性別欄');
}

await screen({
  name: '簽署視窗：不預填職銜，頁面顯示純姓名',
  path: '/p/particulars-2',
  expect: ['林卓瑤'],
  interact: async (doc) => {
    const meta = doc.querySelector('.sigblock__meta')?.textContent || '';
    if (meta.includes('持有人') || meta.includes('RSL')) throw new Error(`簽署欄仍顯示職銜：${meta}`);
    const btn = doc.querySelector('.sigblock__actions .linkbtn');
    btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 250));
    const inputs = [...doc.querySelectorAll('.modal--sign input')];
    const roleInput = inputs[1];
    if (!roleInput || roleInput.value !== '') throw new Error(`職位欄不應預填（目前：${roleInput?.value}）`);
  },
});

{
  const b = demoBook();
  const row2 = b.pages?.['mb-activities']?.rows?.[2]?.certifiedBy || '';
  const rsaBy = b.pages?.['rsa-presented']?.by || '';
  report(
    b.member.emergencyName === '林美珍' &&
      row2 === '陳詠詩' &&
      rsaBy === '陳國強' &&
      !b.holderSignature.title &&
      !b.endorsement.title,
    '示範資料：人名欄與簽署只放純姓名',
  );
}

console.log(`\n${passes} 項通過、${failures} 項失敗`);
process.exit(failures === 0 ? 0 : 1);
