// 嵌入白名單系統 — 單元測試與部署合約守衛
//
//   node tests/embed_whitelist.test.mjs   (或 npm test)
//
// 覆蓋：
//   1. shared/embed.js 純函式：來源正規化、token 解析、CSP 組裝、白名單比對
//   2. server/whitelist.js：預設 + EMBED_WHITELIST 環境變數合併、Vercel 門檻、
//      本機來源門檻、全站安全標頭中介層
//   3. api/embed.js：GET 清單 / GET ?origin= 核實 / POST 核實 / 400 / 405
//   4. scripts/sync-embed-headers.mjs：vercel.json 烤同步（冪等、--check、可修復漂移）
//   5. 接線與文件合約：server / vite / package.json / .env.example / README / UI / CSS
//
// 鐵律：白名單只收 https 來源（本機開發／測試先容許 http localhost）、
//       零萬用字元、零帳密、零金鑰；Vercel 靜態標頭與 shared 單一真相必須同步。

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EMBED_WHITELIST,
  EMBED_WHITELIST_ENV,
  FRAME_ANCESTORS,
  IFRAME_ALLOW,
  PORTAL_ORIGIN,
  buildFrameAncestors,
  isOriginAllowed,
  normalizeEmbedOrigin,
  parseEmbedWhitelist,
  splitEmbedTokens,
} from '../shared/embed.js';
import {
  allowLocalEmbedders,
  embedSecurityHeaders,
  resolveEmbedWhitelist,
  securityHeadersMiddleware,
} from '../server/whitelist.js';
import embedHandler from '../api/embed.js';
import { syncEmbedHeaders } from '../scripts/sync-embed-headers.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

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

// ---------- req/res doubles（Express / Vercel handler 相容） ----------
function makeReq(method, { body = null, url = '/api/embed', query = undefined } = {}) {
  return { method, url, body, query, headers: {} };
}
function makeRes() {
  const res = {};
  res.statusCode = 200;
  res.headers = {};
  res.setHeader = (k, v) => {
    res.headers[k.toLowerCase()] = v;
  };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (obj) => {
    res.body = obj;
    return res;
  };
  res.end = (b) => {
    if (b !== undefined) res.body = b;
  };
  return res;
}
async function callEmbed(method, opts) {
  const req = makeReq(method, opts);
  const res = makeRes();
  await embedHandler(req, res);
  return res;
}

// 暫時改環境變數（handler 即時讀 process.env），用完還原。
function withEnv(patch, fn) {
  const saved = {};
  for (const key of Object.keys(patch)) {
    saved[key] = process.env[key];
    if (patch[key] === undefined) delete process.env[key];
    else process.env[key] = patch[key];
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function main() {
  // ================================================================ 1. 純函式
  ok(PORTAL_ORIGIN === 'https://member-portal-sigma-swart.vercel.app', '正式服務平台來源不變');
  ok(EMBED_WHITELIST.includes(PORTAL_ORIGIN), '預設白名單包含正式服務平台');
  ok(FRAME_ANCESTORS === "frame-ancestors 'self' https://member-portal-sigma-swart.vercel.app", '預設 CSP 與舊契約一致（向後兼容）');

  ok(normalizeEmbedOrigin('https://portal.example.com') === 'https://portal.example.com', '正規化：https 來源原樣保留');
  ok(normalizeEmbedOrigin('https://portal.example.com/embed?a=1#x') === 'https://portal.example.com', '正規化：路徑／查詢／片段剝除到只剩來源');
  ok(normalizeEmbedOrigin('HTTPS://PORTAL.EXAMPLE.COM/') === 'https://portal.example.com', '正規化：scheme 與主機大小寫一致化');
  ok(normalizeEmbedOrigin('https://portal.example.com:8443') === 'https://portal.example.com:8443', '正規化：非預設 port 保留');
  ok(normalizeEmbedOrigin('https://user:pass@portal.example.com') === '', '正規化：帳號密碼一律拒絕');
  ok(normalizeEmbedOrigin('https://*.example.com') === '', '正規化：萬用字元一律拒絕');
  ok(normalizeEmbedOrigin('javascript:alert(1)') === '', '正規化：javascript: 拒絕');
  ok(normalizeEmbedOrigin('data:text/html,x') === '', '正規化：data: 拒絕');
  ok(normalizeEmbedOrigin('http://portal.example.com') === '', '正規化：一般 http 拒絕（只收 https）');
  ok(normalizeEmbedOrigin('null') === '', '正規化：null 來源拒絕');
  ok(normalizeEmbedOrigin('') === '' && normalizeEmbedOrigin(null) === '' && normalizeEmbedOrigin('   ') === '', '正規化：空值回傳空');
  ok(normalizeEmbedOrigin('https://a.com, https://b.com') === '', '正規化：內含逗號／空白的混雜輸入拒絕');
  ok(normalizeEmbedOrigin('http://localhost:3001', { allowLocal: true }) === 'http://localhost:3001', '正規化：allowLocal 容許 http://localhost');
  ok(normalizeEmbedOrigin('http://127.0.0.1:5173', { allowLocal: true }) === 'http://127.0.0.1:5173', '正規化：allowLocal 容許 http://127.0.0.1');
  ok(normalizeEmbedOrigin('http://localhost:3001') === '', '正規化：未開 allowLocal 時 http localhost 亦拒絕');
  ok(normalizeEmbedOrigin('http://evil.com', { allowLocal: true }) === '', '正規化：allowLocal 只限本機主機，唔放行其他 http');

  ok(JSON.stringify(splitEmbedTokens('https://a.com, https://b.com;https://c.com\nhttps://d.com')) === JSON.stringify(['https://a.com', 'https://b.com', 'https://c.com', 'https://d.com']), 'token 解析：逗號／分號／空白／換行皆可分隔');
  ok(JSON.stringify(parseEmbedWhitelist('https://b.com https://a.com https://b.com bad https://a.com/path')) === JSON.stringify(['https://b.com', 'https://a.com']), '白名單解析：去重、剔走不合格、保留順序');
  ok(buildFrameAncestors(['https://a.com', 'https://b.com', 'https://a.com']) === "frame-ancestors 'self' https://a.com https://b.com", 'CSP 組裝：self 在首、去重');
  ok(buildFrameAncestors([]) === "frame-ancestors 'self'", 'CSP 組裝：空清單只剩 self');
  ok(isOriginAllowed('https://member-portal-sigma-swart.vercel.app/some/path', EMBED_WHITELIST), '比對：含路徑輸入正規化後命中白名單');
  ok(!isOriginAllowed('https://evil.example.com', EMBED_WHITELIST), '比對：未列入來源不命中');
  ok(!isOriginAllowed('https://*.vercel.app', EMBED_WHITELIST), '比對：萬用字元不命中');

  // ================================================================ 2. 伺服器解析
  const dev = resolveEmbedWhitelist({});
  ok(JSON.stringify(dev.origins) === JSON.stringify([PORTAL_ORIGIN]), '預設環境：生效白名單 = 預設清單');
  ok(dev.envHonored === true && dev.allowLocal === true, '非 Vercel 開發環境：讀環境變數、容許本機來源');

  const extended = resolveEmbedWhitelist({ EMBED_WHITELIST: 'https://portal2.example.com, https://portal3.example.com https://portal2.example.com' });
  ok(extended.origins.length === 3 && extended.extra.length === 2, 'EMBED_WHITELIST：追加去重後併入生效白名單');
  ok(extended.frameAncestors === `frame-ancestors 'self' ${PORTAL_ORIGIN} https://portal2.example.com https://portal3.example.com`, 'EMBED_WHITELIST：CSP 跟住追加');

  const messy = resolveEmbedWhitelist({ EMBED_WHITELIST: 'https://ok.example.com ftp://bad.example.com https://*.wild.com' });
  ok(messy.extra.length === 1 && messy.invalid.length === 2, 'EMBED_WHITELIST：不合格項目剔除並如實報告');

  const onVercel = resolveEmbedWhitelist({ VERCEL: '1', EMBED_WHITELIST: 'https://extra.example.com' });
  ok(onVercel.envHonored === false && onVercel.origins.length === 1 && onVercel.allowLocal === false, 'Vercel：靜態標頭已烤入，不讀 EMBED_WHITELIST、不容許本機來源');

  ok(allowLocalEmbedders({ NODE_ENV: 'production' }) === false, '自架 production：預設不容許 http 本機嵌入');
  ok(allowLocalEmbedders({ NODE_ENV: 'production', ROVERBOOK_PROXY_TEST: '1' }) === true, '自架 production + ROVERBOOK_PROXY_TEST=1：容許本機測試嵌入');
  ok(allowLocalEmbedders({ VERCEL: '1', ROVERBOOK_PROXY_TEST: '1' }) === false, 'Vercel 即使 PROXY_TEST=1 亦不容許本機嵌入');
  ok(resolveEmbedWhitelist({ EMBED_WHITELIST: 'http://localhost:5173' }).origins.includes('http://localhost:5173'), '開發環境：http localhost 可经環境變數加入');
  ok(!resolveEmbedWhitelist({ NODE_ENV: 'production', EMBED_WHITELIST: 'http://localhost:5173' }).origins.includes('http://localhost:5173'), 'production：http localhost 被剔除');

  const headers = embedSecurityHeaders({ EMBED_WHITELIST: 'https://extra.example.com' });
  ok(headers['Content-Security-Policy'] === `frame-ancestors 'self' ${PORTAL_ORIGIN} https://extra.example.com`, '安全標頭：CSP 由生效白名單推導');
  ok(headers['X-Content-Type-Options'] === 'nosniff' && headers['Referrer-Policy'] === 'strict-origin-when-cross-origin' && headers['Permissions-Policy'] === 'camera=(self), microphone=(), geolocation=()', '安全標頭：與 vercel.json 其餘標頭一致');

  const mw = securityHeadersMiddleware({});
  const seen = {};
  let nextCalled = false;
  mw({}, { setHeader: (k, v) => { seen[k] = v; } }, () => { nextCalled = true; });
  ok(nextCalled && seen['Content-Security-Policy'] === FRAME_ANCESTORS, '中介層：逐個回應套上白名單 CSP 並放行');

  // ================================================================ 3. /api/embed
  const list = await callEmbed('GET');
  ok(list.statusCode === 200 && list.body.ok === true && Array.isArray(list.body.origins), 'GET /api/embed：回傳生效白名單');
  ok(list.body.frameAncestors === FRAME_ANCESTORS && list.body.iframeAllow === IFRAME_ALLOW && list.body.portal === PORTAL_ORIGIN, 'GET /api/embed：附 CSP 值、iframe allow 契約與正式平台');
  ok(list.headers['cache-control'] === 'no-store', 'GET /api/embed：no-store（環境變數可隨時改）');
  ok(list.body.envVar === EMBED_WHITELIST_ENV, 'GET /api/embed：交代管理用的環境變數名稱');

  const hit = await callEmbed('GET', { url: `/api/embed?origin=${encodeURIComponent(PORTAL_ORIGIN)}` });
  ok(hit.body.check?.allowed === true && hit.body.check?.normalized === PORTAL_ORIGIN, 'GET ?origin=：正式平台核實通過');
  const miss = await callEmbed('GET', { url: '/api/embed?origin=https%3A%2F%2Fevil.example.com' });
  ok(miss.body.check?.allowed === false && miss.body.check?.reason === 'not-whitelisted', 'GET ?origin=：未列入來源核實不通過');
  const bad = await callEmbed('GET', { url: '/api/embed?origin=not-a-url' });
  ok(bad.body.check?.allowed === false && bad.body.check?.reason === 'invalid-origin', 'GET ?origin=：不合格來源如實標示');
  const expressStyle = await callEmbed('GET', { query: { origin: PORTAL_ORIGIN } });
  ok(expressStyle.body.check?.allowed === true, 'GET ?origin=：Express req.query 路徑同样支援');

  const posted = await callEmbed('POST', { body: { origin: `${PORTAL_ORIGIN}/` } });
  ok(posted.statusCode === 200 && posted.body.allowed === true && posted.body.normalized === PORTAL_ORIGIN, 'POST { origin }：含路徑亦正規化後核實');
  const postedStr = await callEmbed('POST', { body: JSON.stringify({ origin: 'https://evil.example.com' }) });
  ok(postedStr.statusCode === 200 && postedStr.body.allowed === false, 'POST：字串 body（Vercel 未解析時）同样核實');
  const empty = await callEmbed('POST', { body: {} });
  ok(empty.statusCode === 400 && empty.body.error === 'empty', 'POST：缺 origin 回 400');
  const put = await callEmbed('PUT');
  ok(put.statusCode === 405 && put.headers.allow === 'GET, POST', '其他方法一律 405（白名單只讀，無寫入接口）');

  const envApi = await withEnv({ EMBED_WHITELIST: 'https://extra.example.com', VERCEL: undefined, NODE_ENV: undefined }, () =>
    callEmbed('GET', { url: '/api/embed?origin=https%3A%2F%2Fextra.example.com' }),
  );
  ok(envApi.body.check?.allowed === true && envApi.body.extraOrigins.includes('https://extra.example.com'), '自架：EMBED_WHITELIST 追加來源即時獲 API 核實通過');
  const vercelApi = await withEnv({ EMBED_WHITELIST: 'https://extra.example.com', VERCEL: '1' }, () =>
    callEmbed('GET', { url: '/api/embed?origin=https%3A%2F%2Fextra.example.com' }),
  );
  ok(vercelApi.body.check?.allowed === false && vercelApi.body.envHonored === false, 'Vercel：API 與靜態 CSP 一致，唔會誤報環境變數追加為獲准');

  // ================================================================ 4. 部署標頭同步
  const vercel = JSON.parse(read('vercel.json'));
  const catchAll = vercel.headers.find((rule) => rule.source === '/(.*)');
  const cspHeader = catchAll.headers.find((h) => h.key.toLowerCase() === 'content-security-policy');
  ok(cspHeader.value === buildFrameAncestors(EMBED_WHITELIST), 'vercel.json 全站 CSP 與 shared/embed.js 單一真相同步');
  ok(syncEmbedHeaders({ check: true }).changed === false, 'sync:embed --check：目前已同步（冪等）');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'roverbook-embed-'));
  try {
    const drifted = JSON.parse(read('vercel.json'));
    drifted.headers.find((r) => r.source === '/(.*)').headers.find((h) => h.key === 'Content-Security-Policy').value = "frame-ancestors 'self' https://stale.example.com";
    fs.writeFileSync(path.join(tmp, 'vercel.json'), JSON.stringify(drifted, null, 2));
    ok(syncEmbedHeaders({ root: tmp, check: true }).changed === true, 'sync:embed --check：偵測到漂移');
    ok(JSON.parse(fs.readFileSync(path.join(tmp, 'vercel.json'), 'utf8')).headers.find((r) => r.source === '/(.*)').headers.find((h) => h.key === 'Content-Security-Policy').value.includes('stale.example.com'), '--check 只核對不寫入');
    const fixed = syncEmbedHeaders({ root: tmp });
    ok(fixed.changed === true && JSON.parse(fs.readFileSync(path.join(tmp, 'vercel.json'), 'utf8')).headers.find((r) => r.source === '/(.*)').headers.find((h) => h.key === 'Content-Security-Policy').value === FRAME_ANCESTORS, 'sync:embed：把漂移修復回單一真相');
    ok(syncEmbedHeaders({ root: tmp, check: true }).changed === false, '修復後再核對：同步');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  // ================================================================ 5. 接線與文件合約
  const serverIndex = read('server/index.js');
  ok(serverIndex.includes('securityHeadersMiddleware') && serverIndex.indexOf('app.use(securityHeadersMiddleware())') < serverIndex.indexOf("app.use('/api'"), 'server/index.js：安全標頭中介層掛在 /api 與靜態檔之前');
  ok(read('server/api.js').includes("api.use('/embed'"), 'server/api.js：掛載 /api/embed');
  const viteSrc = read('vite.config.js');
  ok(viteSrc.includes("'/api/embed'") && viteSrc.includes('securityHeadersMiddleware'), 'vite.config.js：獨立 vite dev/preview 同样有白名單 API 與標頭');

  const pkg = JSON.parse(read('package.json'));
  ok(pkg.scripts['sync:embed'] === 'node scripts/sync-embed-headers.mjs', 'package.json：npm run sync:embed 指令');
  ok(pkg.scripts.test.includes('tests/embed_whitelist.test.mjs'), 'package.json：npm test 已加入白名單測試');

  const envExample = read('.env.example');
  ok(envExample.includes('EMBED_WHITELIST=') && envExample.includes('sync:embed'), '.env.example：交代 EMBED_WHITELIST 格式與 Vercel 同步步驟');

  const readme = read('README.md');
  ok(readme.includes('白名單系統') && readme.includes('EMBED_WHITELIST') && readme.includes('sync:embed') && readme.includes('/api/embed'), 'README：記錄白名單系統、管理方法與 API');

  const appx = read('web/src/pages/Appendix.jsx');
  ok(appx.includes('EmbedWhitelistCard'), '數位附錄渲染嵌入白名單卡');
  const card = read('web/src/components/EmbedWhitelistCard.jsx');
  ok(card.includes('probeEmbedWhitelist()') && card.includes('localWhitelistInfo()'), '白名單卡：自動偵測 /api/embed，離線退回預設');
  ok(card.includes('checkEmbedOrigin(') && card.includes('iframeSnippet('), '白名單卡：提供來源核實與 iframe 範例');
  ok(card.includes('isEn ?') && card.includes('重新讀取'), '白名單卡：中英雙語');
  const notice = read('web/src/components/EmbedNotice.jsx');
  ok(notice.includes('embedderOrigin()') && notice.includes('checkEmbedOrigin('), '嵌入歡迎提示：顯示嵌入來源並核實白名單');

  const css = read('web/src/styles.css');
  const usedClasses = [...new Set(card.match(/embedwl(?:__[a-z-]+)?/g) || [])];
  const missingCss = usedClasses.filter((cls) => !css.includes(`.${cls}`));
  ok(missingCss.length === 0, '白名單卡所有 .embedwl* 類別在 styles.css 皆有定義', missingCss.join(', '));
  ok(/@media print\s*\{\s*\.embedwl,\s*\.no-print\s*\{[^}]*display:\s*none/.test(css), '@media print 隱藏白名單卡（.no-print 语义終於生效）');
  ok(css.includes('.embednote__origin') && css.includes('.embednote__ok'), '嵌入來源提示有樣式');

  console.log(`\n${pass} 項通過、${fail} 項失敗`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
