// ROVERBOOK 指定入口白名單（Store Gate）契約測試
//   node tests/store_gate.test.mjs
//
// 閘檔案 `web/public/store_gate_v1.0.js` 由治理真理倉 `playerkousas-rgb/readme`
// @ `6ebfdd72a1ea5a5e83df4a6644fc66d0236df98e` 的
// `templates/vercel/store_gate_v1.0.js` **原樣複製**（與同系列其他支部紀錄冊同一做法），只由 `web/index.html` 傳入 ROVERBOOK 的設定，
// 不在 App 內改動閘邏輯（SG1–SG19）。

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let pass = 0;
let fail = 0;
function ok(cond, label, detail = '') {
  if (cond) {
    pass += 1;
    console.log(`✓ ${label}`);
  } else {
    fail += 1;
    console.log(`✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

// ---------------------------------------------------------------- 載入閘腳本
const gateSource = read('web/public/store_gate_v1.0.js');
const context = vm.createContext({ URL, console });
vm.runInContext(gateSource, context);
const gate = context.ScoutStoreGate;

// 與 web/index.html 的 initStoreGate 設定逐字對齊（改設定就要兩邊一齊改）
const OPTIONS = {
  appKey: 'roverbook',
  mode: 'entry-gate',
  portalIds: ['appstore'],
  silentPortalIds: ['library', 'member'],
  allowStandalone: true,
  autoRedirectSeconds: 0,
};

function page(referrer = '', { pass: hasPass = false, standalone = false, session = null } = {}) {
  const nodes = new Map();
  function element(tag) {
    const el = {
      tagName: tag,
      children: [],
      attributes: {},
      style: {},
      textContent: '',
      setAttribute(k, v) {
        this.attributes[k] = String(v);
      },
      getAttribute(k) {
        return this.attributes[k] || '';
      },
      appendChild(child) {
        this.children.push(child);
        if (child.id) nodes.set(child.id, child);
        return child;
      },
      removeChild(child) {
        this.children.splice(this.children.indexOf(child), 1);
      },
    };
    Object.defineProperty(el, 'firstChild', {
      get() {
        return this.children[0];
      },
    });
    return el;
  }
  const document = {
    referrer,
    documentElement: element('html'),
    head: element('head'),
    body: element('body'),
    createElement: element,
    getElementById: (id) => nodes.get(id) || null,
  };
  const values = new Map(hasPass ? [['roverbook.store_pass', '1']] : []);
  if (session === 'throws') {
    // 模擬 Safari 私隱模式／封鎖儲存
  }
  const win = {
    document,
    location: { origin: 'https://roverbook.vercel.app' },
    navigator: { serviceWorker: {} },
    matchMedia: () => ({ matches: standalone }),
    sessionStorage: {
      getItem: (key) => values.get(key) || null,
      setItem: (key, value) => values.set(key, value),
    },
  };
  if (session === 'throws') {
    Object.defineProperty(win, 'sessionStorage', {
      get() {
        throw new Error('blocked');
      },
    });
  }
  win.self = win;
  win.top = win;
  return { document, win, values, nodes };
}

// ------------------------------------------------- 1. 入口來源、靜默放行與工作階段
{
  // 唯一公開入口 = SCOUT APP STORE；成員系統係唯一例外（靜默放行，唔畫掣）
  let allAllowed = true;
  for (const [origin, id] of [
    ['https://scoutappstore.vercel.app/', 'appstore'],
    ['https://scoutappstore.vercel.app/?app=roverbook', 'appstore'],
    // SG19：圖書館係引流入口，預設照放行（只係卡上唔畫掣）
    ['https://scout-circulars.vercel.app/', 'library'],
    ['https://member-portal-sigma-swart.vercel.app/books', 'member'],
  ]) {
    const p = page(origin);
    const decision = gate.initStoreGate(OPTIONS, p.win);
    if (!(decision.allowed === true && decision.matchedPortalId === id && p.values.get('roverbook.store_pass') === '1')) {
      allAllowed = false;
      console.log(`  · ${origin} → ${JSON.stringify(decision)}`);
    }
  }
  ok(allAllowed, 'APP STORE（含 ?app= 深層連結）、圖書館與成員系統放行，並記住本分頁通行');

  // 偽造前綴（scoutappstore.vercel.app.evil.com）、未列入 portalIds／silentPortalIds 的入口
  // （區管理系統、GEMINI）以及任何陌生來源一律攔截：佢哋都唔係本冊的放行來源。
  const blocked = [
    '',
    'https://scoutappstore.vercel.app.evil.com/',
    'https://scout-circulars.vercel.app.evil.com/',
    'https://scout-district-portal.vercel.app/',
    'https://gemini-woad-sigma.vercel.app/',
    'https://roverbook.example.com/',
  ];
  const blockedOk = blocked.every((referrer) => gate.evaluateStoreGate(OPTIONS, { referrer }).allowed === false);
  ok(blockedOk, '直開、偽造前綴（含圖書館前綴）、區管理系統、GEMINI 一律攔截');

  ok(gate.initStoreGate(OPTIONS, page('', { pass: true }).win).reason === 'session-pass', '同分頁重整沿用 sessionStorage 通行');
  ok(gate.initStoreGate(OPTIONS, page('', { standalone: true }).win).reason === 'standalone-pwa', '已加入主畫面 PWA 豁免（SG11-a）');
}

// ------------------------------------------------------- 2. 儲存被封鎖時的降級
{
  const p = page('https://scoutappstore.vercel.app/', { session: 'throws' });
  ok(gate.initStoreGate(OPTIONS, p.win).allowed === true, 'sessionStorage 被完全封鎖時，由入口進入仍然放行');
  const next = page('', { session: 'throws' });
  ok(gate.initStoreGate(OPTIONS, next.win).allowed === false, '封鎖儲存時無法保證重整通行 —— 依賴 fail-open 而非 throw');
}

// ------------------------------------------- 3. 攔截卡：單一 APP STORE 按鈕、遮罩
{
  const p = page();
  const decision = gate.initStoreGate(OPTIONS, p.win);
  ok(decision.allowed === false && decision.reason === 'missing-whitelist-entry', '直接開啟判定為 missing-whitelist-entry');
  ok(p.document.documentElement.getAttribute('data-store-gated') === 'missing-whitelist-entry', '被攔截時設 data-store-gated（主程式據此不啟動）');
  const overlay = p.nodes.get('scoutStoreGate');
  ok(Boolean(overlay) && overlay.attributes.role === 'dialog', '攔截卡為 role="dialog" 對話框');
  const actions = overlay.children.find((child) => child.className === 'sg-actions');
  // SG19：圖書館／成員系統靜默放行，唔畫掣 → 只剩 APP STORE 一粒
  ok(actions.children.length === 1, '卡上只有一粒按鈕（成員系統靜默、唔顯示）');
  ok(
    actions.children[0].href === 'https://scoutappstore.vercel.app/' && actions.children[0].target === '_top',
    '唯一按鈕以 target="_top" 前往 SCOUT APP STORE',
  );
  ok(
    /body > :not\(#scoutStoreGate\).*display: none !important/.test(p.nodes.get('scoutStoreGateStyle').textContent),
    '攔截時隱藏底層內容（唔會滲出紀錄冊）',
  );
  // 卡片沿用治理倉預設文案（SG19 簡短人話版），同其他 BOOK 一致，唔加自訂字句
  ok(
    overlay.children[1].textContent === '需經由 SCOUT APP STORE 開啟' &&
      overlay.children[2].textContent === '請按下方按鈕前往 APP STORE 開啟。',
    '卡片文案 = 治理倉預設（中文）',
  );
  ok(OPTIONS.autoRedirectSeconds === 0, '不自動跳轉（用家自己揀）');
}

// --------------------------------- 4. HTML／SW／rewrite／主程式守衛（部署合約）
{
  const html = read('web/index.html');
  const sw = read('web/public/sw.js');
  const main = read('web/src/main.jsx');
  const vercel = JSON.parse(read('vercel.json'));

  ok(html.indexOf('<meta charset=') < html.indexOf('<script src="/store_gate_v1.0.js">'), '閘腳本緊接 <meta charset>（React 之前）');
  ok(html.indexOf('<script src="/store_gate_v1.0.js">') < html.indexOf('<title>'), '閘腳本在 <title> 之前（<head> 最前）');
  ok(/appKey: 'roverbook'/.test(html), 'appKey: roverbook（通行證鍵 roverbook.store_pass，不與其他 BOOK 互通）');
  ok(/mode: localDev \? 'open' : 'entry-gate'/.test(html), '本機開發 open、其餘 entry-gate');
  const localRx = '/^(localhost|127\\.0\\.0\\.1|\\[::1\\])$/';
  ok(html.includes(localRx), 'localhost／127.0.0.1／[::1] 偵測正確');
  ok(/portalIds: \['appstore'\],[\s\S]{0,400}?silentPortalIds: \['library', 'member'\]/.test(html), 'portalIds: [appstore]、silentPortalIds: [library, member]（SG19）');
  ok(/allowStandalone: true/.test(html), 'allowStandalone: true（已裝主畫面／現有用戶照用）');
  ok(!/member-portal/.test(html), '成員系統只放行、不宣傳（index.html 不出現其網址）');
  // SG19：圖書館照放行，但只可以靜默（唔可以出現在 portalIds 而畫成掣）
  ok(/silentPortalIds: \['library', 'member'\]/.test(html), '圖書館以 silentPortalIds 放行（照放行、唔畫掣）');
  ok(/portalIds: \['appstore'\]/.test(html), 'portalIds 只有 APP STORE（卡上第一粒掣永遠係主站）');
  ok(!/labelZh|labelEn|https?:\/\/[a-z.-]*scout-circulars/.test(html), 'index.html 唔會自行列出/寫死圖書館網址（由治理倉註冊表提供）');
  ok(!/customTitle|customMessage/.test(html), '不加自訂卡片文案（沿用治理倉預設）');
  ok(!/supportNudge:/.test(html), '唔開 supportNudge（改用 SG18 常駐讚好／收藏掣，免重複騷擾）');
  ok(html.indexOf("mode: localDev ? 'open' : 'entry-gate'") < html.indexOf("portalIds: ['appstore']"), '模式設定先於入口設定');
  const initBlock = html.slice(html.indexOf('initStoreGate({'), html.indexOf('</script>', html.indexOf('initStoreGate({')));
  ok(!/https?:\/\//.test(initBlock), '前端零寫死入口網址（一律由治理倉註冊表提供）');
  ok(!/mode: 'iframe-only'/.test(html), '不用 iframe-only（BOOK 有本機儲存／PWA，屬 SG2 禁區）');

  ok(sw.includes("'/store_gate_v1.0.js'"), 'Service Worker SHELL 預快取閘檔案（離線一樣判斷得到入口）');
  ok(sw.includes("url.pathname === '/store_gate_v1.0.js'"), 'Service Worker 以 cache-first 提供閘檔案');
  ok(/!document\.documentElement\.hasAttribute\('data-store-gated'\)/.test(main), 'main.jsx 被攔截時不啟動 React／不註冊 Service Worker');

  const source = vercel.rewrites[0].source;
  const regex = new RegExp(`^${source}$`);
  ok(regex.test('/store_gate_v1.0.js') === false, 'SPA rewrite 排除 /store_gate_v1.0.js（不會被吞成 index.html）');
  ok(regex.test('/p/p001') === true && regex.test('/v/abc123') === true, 'SPA rewrite 仍覆蓋紀錄冊頁及分享頁');
  ok(regex.test('/api/embed') === false && regex.test('/sw.js') === false, 'rewrite 仍然排除 /api 與 /sw.js');
  ok(
    vercel.headers
      .flatMap((rule) => rule.headers)
      .some((header) => header.key === 'Content-Security-Policy' && header.value.includes('frame-ancestors') && header.value.includes('member-portal-sigma-swart.vercel.app')),
    'ADR 0004 的 frame-ancestors 服務平台嵌入白名單維持不變（兩個白名單並存）',
  );
}

// ------------------------------------------- 5. SG18 讚好／收藏（slug 已核實）
{
  ok(gate.getAppStoreUrl('roverbook') === 'https://scoutappstore.vercel.app/?app=roverbook', 'getAppStoreUrl 產生已核實 slug 的深層連結');
  ok(gate.getAppStoreUrl('') === 'https://scoutappstore.vercel.app/', '空 slug 安全回退主站首頁');

  const component = read('web/src/components/StoreSupport.jsx');
  ok(/helper\('roverbook'\)/.test(component), 'StoreSupport 使用已核實 slug roverbook');
  ok(/hidden=\{!href\}/.test(component), '讀不到閘腳本時整粒掣隱藏（唔會出死連）');
  ok(/target="_blank"[\s\S]{0,40}rel="noopener"/.test(component), '以新分頁開啟並帶 rel="noopener"');
  ok(!/supabase|bump_hearts|bump_stars|anon/i.test(component), '不直連主站資料庫、不自行呼叫統計函式（SG18）');

  ok(read('web/src/App.jsx').includes('<StoreSupport />'), '頂欄常駐讚好／收藏');
  ok(read('web/src/pages/Welcome.jsx').includes('<StoreSupport onDark'), '歡迎頁亦有讚好／收藏');

  const css = read('web/src/styles.css');
  ok(/\.store-support\[hidden\]\s*\{\s*display:\s*none/.test(css), '樣式：.store-support[hidden] 隱藏');
  ok(/@media print\s*\{\s*\.store-support\s*\{\s*display:\s*none/.test(css), '樣式：列印隱藏讚好／收藏');
  for (const cls of ['store-support--dark', 'store-support__heart', 'store-support__text', 'welcome__support']) {
    ok(css.includes(`.${cls}`), `樣式：已定義 .${cls}`);
  }
}

// --------------------------------- 6. 閘檔案保持治理倉原樣；文件如實交代限制
{
  ok(/const VERSION = 'v1\.0';/.test(gateSource), '閘檔案版本字串維持 v1.0（原樣複製）');
  ok(/const PORTAL_REGISTRY = Object\.freeze\(/.test(gateSource), 'PORTAL_REGISTRY 由治理倉單一維護');
  ok(
    JSON.stringify([...gate.PORTAL_IDS]) === JSON.stringify(['appstore', 'library', 'member', 'district', 'gemini']),
    'App 不自行加減五個官方入口',
  );
  ok(gate.DEFAULT_PORTAL_IDS.length === 1 && gate.DEFAULT_PORTAL_IDS[0] === 'appstore', 'SG17 預設入口只有 APP STORE');

  const readme = read('README.md');
  ok(readme.includes('不是身份驗證或安全邊界'), 'README：明言閘不是安全邊界');
  ok(readme.includes('擋**一般用家**') && readme.includes('唔係擋技術人員'), 'README：擋一般用家、唔係擋技術人員（用戶定案）');
  ok(readme.includes('落架開關'), 'README：記錄落架開關用途');
  ok(readme.includes('silentPortalIds') && /library/.test(readme), 'README：記錄圖書館以 silentPortalIds 放行（SG19）');
  ok(readme.includes('store_gate_v1.0.js'), 'README：記錄閘檔案位置');
  ok(!/\/api\/enter/.test(readme), '不加後端驗票（唔為「防技術人員」過度工程）');

  const adr = read('docs/adr/0006-entry-gate-whitelist.md');
  ok(adr.includes('擋一般用家，唔係擋技術人員'), 'ADR 0006：設計目標如實記錄');
  ok(adr.includes('落架開關'), 'ADR 0006：記錄落架開關');
  ok(adr.includes('fail-open'), 'ADR 0006：記錄 fail-open 行為');
  ok(adr.includes('/v/'), 'ADR 0006：記錄分享連結（/v/）同樣先見白名單卡');
}

console.log(`\n${pass} 項通過、${fail} 項失敗`);
process.exit(fail === 0 ? 0 : 1);
