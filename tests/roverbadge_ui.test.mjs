// ROVERBOOK 同步卡與獨立備份匯入互動 DOM 測試（jsdom + esbuild）
//   node tests/roverbadge_ui.test.mjs

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const bundlePath = path.join(ROOT, 'node_modules', '.cache', 'roverbook-ui-test.mjs');

const entryCode = `
  import React from 'react';
  import { createRoot } from 'react-dom/client';
  import { BookCtx } from '${path.join(ROOT, 'web/src/bookContext.js')}';
  import { LangProvider } from '${path.join(ROOT, 'web/src/i18n.jsx')}';
  import { ToastProvider } from '${path.join(ROOT, 'web/src/ui.jsx')}';
  import RoverBadgeSyncCard from '${path.join(ROOT, 'web/src/components/RoverBadgeSyncCard.jsx')}';
  import Welcome from '${path.join(ROOT, 'web/src/pages/Welcome.jsx')}';
  import Appendix from '${path.join(ROOT, 'web/src/pages/Appendix.jsx')}';
  import { newBook } from '${path.join(ROOT, 'shared/book.js')}';

  export { newBook };

  export function mountSyncCard(host, initialBook = newBook()) {
    let current = initialBook;
    const listeners = new Set();
    function Wrapper() {
      const [book, setBook] = React.useState(initialBook);
      const value = React.useMemo(() => ({
        book,
        update: (fn) => setBook((prev) => {
          const next = typeof fn === 'function' ? fn(prev) : fn;
          current = next;
          listeners.forEach((l) => l(next));
          return next;
        }),
        replace: (next) => {
          current = next;
          setBook(next);
          listeners.forEach((l) => l(next));
        },
      }), [book]);
      return React.createElement(
        LangProvider,
        null,
        React.createElement(
          ToastProvider,
          null,
          React.createElement(
            BookCtx.Provider,
            { value },
            React.createElement(RoverBadgeSyncCard),
          ),
        ),
      );
    }
    const root = createRoot(host);
    root.render(React.createElement(Wrapper));
    return {
      getBook: () => current,
      unmount: () => root.unmount(),
    };
  }

  export function mountWelcome(host, onReady = () => {}) {
    const root = createRoot(host);
    root.render(
      React.createElement(
        LangProvider,
        null,
        React.createElement(
          ToastProvider,
          null,
          React.createElement(Welcome, { onReady }),
        ),
      ),
    );
    return { unmount: () => root.unmount() };
  }

  export function mountAppendix(host, initialBook = newBook()) {
    let current = initialBook;
    function Wrapper() {
      const [book, setBook] = React.useState(initialBook);
      const value = React.useMemo(() => ({
        book,
        update: (fn) => setBook((prev) => {
          const next = typeof fn === 'function' ? fn(prev) : fn;
          current = next;
          return next;
        }),
        replace: (next) => {
          current = next;
          setBook(next);
        },
      }), [book]);
      return React.createElement(
        LangProvider,
        null,
        React.createElement(
          ToastProvider,
          null,
          React.createElement(
            BookCtx.Provider,
            { value },
            React.createElement(Appendix),
          ),
        ),
      );
    }
    const root = createRoot(host);
    root.render(React.createElement(Wrapper));
    return { getBook: () => current, unmount: () => root.unmount() };
  }
`;

await build({
  stdin: { contents: entryCode, resolveDir: ROOT, loader: 'js' },
  bundle: true,
  outfile: bundlePath,
  platform: 'node',
  format: 'esm',
  loader: { '.css': 'empty' },
  alias: { '@shared': path.join(ROOT, 'shared') },
  logLevel: 'error',
  define: { 'process.env.NODE_ENV': '"test"' },
});

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://127.0.0.1:3001/',
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
global.Blob = window.Blob;
global.localStorage = window.localStorage;
global.sessionStorage = window.sessionStorage;
global.FileReader = window.FileReader;
global.IS_REACT_ACT_ENVIRONMENT = false;
window.scrollTo = () => {};
window.confirm = () => true;

const { mountSyncCard, mountWelcome, mountAppendix, newBook } = await import(bundlePath);

let pass = 0;
let fail = 0;
function ok(cond, label, detail = '') {
  if (cond) {
    pass++;
    console.log(`✓ ${label}`);
  } else {
    fail++;
    console.log(`✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));
const setNativeInput = (el, val) => {
  const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter.call(el, val);
  el.dispatchEvent(new window.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  el.dispatchEvent(new window.Event('change', { bubbles: true }));
};

// ------------------------------------------------------------ Case 1: 多個旅團 → 自動顯示清單、預設鎖定進度檔、__NOT_FOUND__ 切換開戶提示、登入解鎖進度檔
{
  window.sessionStorage.clear();
  window.localStorage.clear();
  global.fetch = window.fetch = async (url, init = {}) => {
    const pathUrl = String(url);
    if (pathUrl.endsWith('/api/roverbadge') && (!init.method || init.method === 'GET')) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          success: true,
          origin: 'https://roverbadge.vercel.app',
          upstreamOk: true,
          troops: {
            '0082': { name: '九龍第 82 旅' },
            '0145': { name: '香港第 145 旅' },
          },
        }),
      };
    }
    if (pathUrl.endsWith('/api/roverbadge') && init.method === 'POST') {
      const body = JSON.parse(init.body || '{}');
      if (body.action === 'login') {
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: async () => ({ success: true, token: 'tok-abc', ymis: '0000081420' }),
        };
      }
      if (body.action === 'load') {
        return {
          ok: true,
          status: 200,
          headers: { get: () => 'application/json' },
          json: async () => ({
            success: true,
            progress: { 'L1-ACT-01': { date: '2026-09-01', confirmedByBadge: true } },
            pendingRequests: [],
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ success: true }),
      };
    }
    throw new Error(`unexpected fetch ${pathUrl}`);
  };

  document.body.innerHTML = '<div id="host"></div>';
  const host = document.getElementById('host');
  const mounted = mountSyncCard(host);
  await tick(80);

  const connectBtn = [...host.querySelectorAll('button')].find((b) => b.textContent.includes('連接我的 ROVERBADGE 帳戶'));
  ok(Boolean(connectBtn) && connectBtn.textContent.includes('已自動讀取 2 個旅團'), '旅團自動讀取按鈕清楚標示「已自動讀取 2 個旅團」');
  ok(!host.querySelector('.roversync__notfound'), '已讀取旅團且未選擇找不到時，不顯示開戶提示');
  ok(Boolean(host.querySelector('.roversync__locked')), '未登入時顯示進度檔匯出／匯入鎖定提示');
  const buttonsText = [...host.querySelectorAll('button')].map((b) => b.textContent);
  ok(!buttonsText.some((s) => s.includes('匯出「待領袖核實」進度檔')), '未登入時不出現「匯出待領袖核實進度檔」按鈕');
  ok(!buttonsText.some((s) => s.includes('從 ROVERBADGE 匯入「領袖已核實」進度檔')), '未登入時不出現「匯入領袖已核實進度檔」按鈕');

  connectBtn.click();
  await tick(40);

  const select = host.querySelector('select[name="troopId"]');
  const optionValues = [...select.querySelectorAll('option')].map((o) => o.value);
  ok(optionValues.includes('0082') && optionValues.includes('0145') && optionValues.includes('__NOT_FOUND__'), '下拉選單列出全部已登記旅團及「找不到我的旅團」');

  // 切換至 __NOT_FOUND__ → 隱藏 SCOUT ID / 密碼 / 送出鈕，並顯示外連開戶按鈕
  setNativeInput(select, '__NOT_FOUND__');
  await tick(40);
  const openLink = host.querySelector('.roversync__notfound a');
  ok(
    Boolean(openLink) &&
      openLink.getAttribute('href') === 'https://roverbadge.vercel.app' &&
      openLink.getAttribute('target') === '_blank' &&
      openLink.getAttribute('rel') === 'noopener noreferrer',
    '選擇找不到旅團時顯示指向預設 origin 的安全外連開戶提示',
  );
  ok(!host.querySelector('input[name="scoutId"]') && !host.querySelector('input[type="password"]'), '選擇找不到旅團時隱藏 SCOUT ID 與密碼欄');

  // 改選 0082 並登入 → 解鎖進度檔按鈕並自動同步 confirmed
  setNativeInput(select, '0082');
  await tick(40);
  ok(!host.querySelector('.roversync__notfound'), '選回真實旅團 0082 後自動收起開戶提示');
  setNativeInput(host.querySelector('input[name="scoutId"]'), '81420');
  setNativeInput(host.querySelector('input[type="password"]'), 'secret-pw');
  host.querySelector('form.roversync__login').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await tick(100);

  ok(Boolean(host.querySelector('.roversync__session')), '登入後顯示已連接旅團狀態徽章');
  ok(!host.querySelector('.roversync__locked'), '登入後解除鎖定提示');
  const unlockedButtons = [...host.querySelectorAll('button')].map((b) => b.textContent);
  ok(
    unlockedButtons.some((s) => s.includes('匯出「待領袖核實」進度檔')) &&
      unlockedButtons.some((s) => s.includes('從 ROVERBADGE 匯入「領袖已核實」進度檔')),
    '登入後解鎖兩個 ROVERBADGE 進度檔交換按鈕',
  );
  ok(mounted.getBook().progress['L1-ACT-01']?.confirmedByBadge === true, '登入後自動從 ROVERBADGE 錄入領袖已核實項目');
  ok(JSON.parse(window.sessionStorage.getItem('roverbook.roverbadge.member.v1') || 'null')?.ymis === '0000081420', 'sessionStorage 保存正規化 ymis');

  // 登出後重新鎖定
  const logoutBtn = [...host.querySelectorAll('button')].find((b) => b.textContent.includes('登出 ROVERBADGE'));
  logoutBtn.click();
  await tick(40);
  ok(Boolean(host.querySelector('.roversync__locked')) && window.sessionStorage.getItem('roverbook.roverbadge.member.v1') === null, '登出後立即清除 session 並重新鎖定進度檔');
  mounted.unmount();
}

// ------------------------------------------------------------ Case 2: 旅團清單為空 → 立即顯示開戶提示、重新讀取、手動輸入
{
  window.sessionStorage.clear();
  global.fetch = window.fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => ({
      success: true,
      origin: 'https://custom-badge.example.org',
      upstreamOk: true,
      troops: {},
    }),
  });
  document.body.innerHTML = '<div id="host"></div>';
  const host = document.getElementById('host');
  const mounted = mountSyncCard(host);
  await tick(80);
  const openLink = host.querySelector('.roversync__notfound a');
  ok(
    Boolean(openLink) && openLink.getAttribute('href') === 'https://custom-badge.example.org',
    '旅團清單為空時立即顯示開戶提示並沿用後端 origin',
  );
  ok(
    host.textContent.includes('重新讀取旅團清單') && host.textContent.includes('手動輸入旅團編號'),
    '清單為空時同時提供「重新讀取旅團清單」及「手動輸入旅團編號」',
  );
  mounted.unmount();
}

// ------------------------------------------------------------ Case 3: 靜態主機（HTML 200）→ 獨立模式，不出現開戶提示，附錄本機備份維持可用
{
  window.sessionStorage.clear();
  global.fetch = window.fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => 'text/html; charset=utf-8' },
    json: async () => ({}),
  });
  document.body.innerHTML = '<div id="host"></div>';
  const host = document.getElementById('host');
  const mounted = mountAppendix(host, newBook());
  await tick(80);
  ok(Boolean(host.querySelector('.roversync__offline')), '純靜態主機自動顯示獨立模式提示');
  ok(!host.querySelector('.roversync__notfound'), '純靜態離線環境不誤彈 ROVERBADGE 開戶提示');
  ok(
    host.textContent.includes('匯出完整備份 JSON') && host.textContent.includes('還原備份 JSON'),
    '附錄「本機儲存」完整備份與還原在離線／獨立模式下照常顯示',
  );
  mounted.unmount();
}

// ------------------------------------------------------------ Case 4: Welcome 匯入拒絕 ROVERBADGE 進度檔，允許完整紀錄冊備份
{
  window.localStorage.clear();
  let readyBook = null;
  document.body.innerHTML = '<div id="host"></div>';
  const host = document.getElementById('host');
  const mounted = mountWelcome(host, (book) => {
    readyBook = book;
  });
  await tick(40);

  const fileInput = host.querySelector('input[type="file"]');
  const triggerFile = (obj) => {
    const file = new window.File([JSON.stringify(obj)], 'test.json', { type: 'application/json' });
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    fileInput.dispatchEvent(new window.Event('change', { bubbles: true }));
  };

  triggerFile({ schema: 'roverbadge.pending.v1', pendingRequests: [{ itemId: 'L1-ACT-01', date: '2026-04-01' }] });
  await tick(80);
  ok(readyBook === null && host.textContent.includes('數位附錄'), 'Welcome 拒絕匯入 ROVERBADGE 進度檔並提示前往數位附錄');

  const validBook = newBook();
  validBook.member.nameZh = '備份測試員';
  triggerFile(validBook);
  await tick(80);
  ok(readyBook?.member?.nameZh === '備份測試員', 'Welcome 正常還原完整 ROVERBOOK 備份 JSON');
  mounted.unmount();
}

console.log(`\n${pass} 項通過、${fail} 項失敗`);
process.exit(fail === 0 ? 0 : 1);
