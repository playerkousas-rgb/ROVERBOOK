// Renders every screen inside jsdom against the running API and reports
// React crashes, empty screens, and missing key content.
// Usage: node scripts/smoke.mjs   (requires `npm run dev` on :3001)

import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);
window.scrollTo = () => {};
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {} }));
global.IS_REACT_ACT_ENVIRONMENT = false;

const nativeFetch = globalThis.fetch;
let sessionCookie = '';

global.fetch = window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? new URL(input, BASE) : input;
  const headers = { ...(init.headers || {}) };
  if (sessionCookie) headers.cookie = sessionCookie;
  const res = await nativeFetch(url, { ...init, headers });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) sessionCookie = setCookie.split(';')[0];
  return res;
};

const errors = [];
const originalError = console.error;
console.error = (...args) => {
  const text = args.map(String).join(' ');
  if (!text.includes('not wrapped in act')) errors.push(text.slice(0, 300));
  originalError(...args);
};

async function login(memberNo, pin) {
  sessionCookie = '';
  const res = await nativeFetch(`${BASE}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberNo, pin }),
  });
  if (!res.ok) throw new Error(`login failed for ${memberNo}`);
  sessionCookie = (res.headers.get('set-cookie') || '').split(';')[0];
}

const { renderPath } = await import(bundlePath);
let failures = 0;

async function run(cases) {
  const results = [];
  for (const testCase of cases) {
    errors.length = 0;
    let html = '';
    try {
      html = await renderPath(testCase.path);
    } catch (e) {
      failures++;
      console.log(`✗ ${testCase.name} (${testCase.path}) — 渲染失敗: ${e.message}`);
      results.push(false);
      continue;
    }
    const missing = testCase.expect.filter((x) => !html.includes(x));
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const ok = missing.length === 0 && errors.length === 0 && text.length > 40;
    if (!ok) failures++;
    results.push(ok);
    console.log(
      `${ok ? '✓' : '✗'} ${testCase.name} (${testCase.path}) — ${text.length} chars` +
        (missing.length ? ` | 缺少: ${missing.join('、')}` : '') +
        (errors.length ? ` | 錯誤: ${errors.slice(0, 2).join(' / ')}` : ''),
    );
  }
  return results;
}

// 1) 未登入
sessionCookie = '';
await run([{ name: '登入頁', path: '/login', expect: ['把整本紀錄冊', '示範帳戶', '登入我的卡片'] }]);

// 2) 成員帳戶
await login('RS-2401', '2401');
const lam = await (await fetch(`${BASE}/api/me`)).json();
await run([
  { name: '我的卡片', path: '/', expect: ['你好，林卓瑤', '訓練進度', '獎章進度', '分享連結', '連結請求'] },
  { name: '紀錄冊', path: '/record', expect: ['我的紀錄', '個人資料', '相片', '儲存資料'] },
  { name: '私隱中心', path: '/privacy', expect: ['你決定誰看到什麼', '目前分享範圍', '逐項選擇可見範圍', '已連結'] },
  { name: '連結', path: '/connections', expect: ['像加朋友一樣', '已連結', '搜尋成員或領袖'] },
  { name: '公開卡片', path: lam.share.path, expect: ['林卓瑤', '由成員分享', '訓練進度未公開'] },
]);

// 3) 領袖帳戶
await login('L-0451', '4510');
const overview = await (await fetch(`${BASE}/api/leader/overview`)).json();
const memberId = overview.members[0]?.id;
await run([
  { name: '領袖工作台', path: '/crew', expect: ['領袖工作台', '我的成員', '尋找成員'] },
  { name: '領袖看成員卡片', path: `/m/${memberId}`, expect: ['領袖工具', '已連結', '訓練進度'] },
]);

console.log(failures === 0 ? '\n全部畫面通過 smoke test' : `\n${failures} 個畫面有問題`);
process.exit(failures === 0 ? 0 : 1);
