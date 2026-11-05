// ROVERBOOK ⇄ ROVERBADGE 個人純進度雲端直連同步 — 單元測試與守衛
//
//   npm test
//
// 測試三大鐵律：
//   1. 只同步進度，零個人資料（只認 SCOUT ID / ymis；正規化 81420 ⇄ 0000081420）
//   2. BADGE → BOOK：無條件相信領袖已核實，pending 一律略過，保留本機簽名，不覆寫個人資料，不誤抓他人
//   3. BOOK → BADGE：只產生 pending（requestComplete），零個人資料；save/saveOtherBadge 403
//
// 以及 /api/roverbadge 的 403 守衛與 load 剝除 members / 其他成員。
//
// 執行：node tests/roverbadge_sync.test.mjs   (或 npm test)

import assert from 'node:assert/strict';
import {
  exportForRoverBadge,
  importFromRoverBadge,
  collectPendingForRoverBadge,
  newBook,
  normalizeScoutId,
  scoutId,
  ITEM_INDEX,
} from '../shared/book.js';
import roverbadgeHandler from '../api/roverbadge.js';

process.env.ROVERBADGE_ORIGIN = 'https://roverbadge.vercel.app';

const realFetch = globalThis.fetch;
let pass = 0;
let fail = 0;

function ok(cond, label) {
  if (cond) {
    pass++;
    console.log(`✓ ${label}`);
  } else {
    fail++;
    console.log(`✗ ${label}`);
  }
}

function expectThrows(fn, label) {
  try {
    fn();
    ok(false, `${label}（應拋錯但未拋）`);
  } catch (e) {
    ok(true, label);
  }
}

// ---------- fetch mock ----------
let captured = null;
function installFetch(mock) {
  globalThis.fetch = async (url, init) => {
    captured = { url, init };
    return mock(url, init);
  };
}
function restoreFetch() {
  globalThis.fetch = realFetch;
}

function jsonResponse(obj, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: 'OK',
    headers: { get: (k) => (k === 'content-type' ? 'application/json; charset=utf-8' : '') },
    json: async () => obj,
    text: async () => JSON.stringify(obj),
    arrayBuffer: async () => {
      const enc = new TextEncoder();
      return enc.encode(JSON.stringify(obj)).buffer;
    },
  };
}

// ---------- req/res doubles (Express / Vercel handler 相容) ----------
function makeReq(method, body) {
  return { method, url: '/api/roverbadge', body, headers: {} };
}
function makeRes() {
  const res = {};
  res.statusCode = 200;
  res.headers = {};
  res.setHeader = (k, v) => {
    res.headers[k] = v;
  };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (obj) => {
    res.body = obj;
    res.bodyRaw = JSON.stringify(obj);
    res.headers['content-type'] = 'application/json; charset=utf-8';
    return res;
  };
  res.send = (b) => {
    res.body = b;
    res.bodyRaw = typeof b === 'string' ? b : JSON.stringify(b);
    return res;
  };
  res.end = (b) => {
    if (b !== undefined) res.body = b;
  };
  return res;
}

async function post(action, extra = {}) {
  const req = makeReq('POST', { action, ...extra });
  const res = makeRes();
  await roverbadgeHandler(req, res);
  return { req, res, captured };
}
async function get() {
  const req = makeReq('GET', null);
  const res = makeRes();
  await roverbadgeHandler(req, res);
  return { req, res, captured };
}

// ---------- book fixture ----------
const ACT = 'L1-ACT-01'; // 參與最少3次團活動
const UND = 'L1-UND-01'; // 辨認國旗國徽
const LEADER = 'L3-LEADER-01'; // 準領袖培訓

function makeBook(sid = '0000081420') {
  const book = newBook();
  book.member.scoutId = sid;
  book.member.memberNo = sid;
  book.member.nameZh = '測試童軍';
  book.member.crew = '測試旅';
  book.member.group = '測試第 1 旅';
  return book;
}

async function main() {
  // ================================================================ 1. 正規化
  ok(normalizeScoutId('81420') === '0000081420', 'SCOUT ID 正規化：81420 → 0000081420');
  ok(normalizeScoutId('0000081420') === '0000081420', 'SCOUT ID 正規化：0000081420 維持不變');
  ok(normalizeScoutId('') === '', 'SCOUT ID 正規化：空值回傳空');

  // ================================================================ 2. BOOK → BADGE：只產生 pending，零個人資料
  const book = makeBook();
  book.progress[ACT] = { date: '2026-03-01' };
  book.progress[UND] = { date: '2026-03-02', signature: { png: 'data:image/svg+xml;base64,abc' } };
  const payload = exportForRoverBadge(book);

  ok(payload.schema === 'roverbadge.pending.v1', '匯出 schema = roverbadge.pending.v1');
  ok(payload.status === 'pending', '匯出 status = pending');
  ok(payload.confirmed === false, '匯出 confirmed = false');
  ok(!payload.members, '匯出不含 members 陣列（零個人資料）');
  ok(!payload.progress || Object.keys(payload.progress).length === 0, '匯出不含已核實 progress（progress 為空）');
  ok(Array.isArray(payload.pendingRequests) && payload.pendingRequests.length === 2, '匯出含 pendingRequests（2 項）');
  ok(payload.pendingRequests.some((r) => r.itemId === ACT && r.date === '2026-03-01'), 'pendingRequests 含項目與日期');
  ok(
    !('name' in payload) && !('crew' in payload) && !('group' in payload) && !('joinDate' in payload),
    '匯出不含姓名／團隊／入團日期等個人資料',
  );
  ok(payload.scoutId === '0000081420', '匯出僅記錄 SCOUT ID（正規化後）');

  // 收集待送交：已確認（remoteConfirmed）與已待批（remotePendingIds）不應重複送
  const collected = collectPendingForRoverBadge(book, [], [UND]);
  ok(collected.count === 1, 'collectPending 排除已在 BADGE 待批的項目');
  ok(collected.pendingRequests[0].itemId === ACT, 'collectPending 只保留未待批項目');
  const collected2 = collectPendingForRoverBadge(book, [ACT, UND], []);
  ok(collected2.count === 0, 'collectPending 排除 BADGE 已核實的項目');

  // ================================================================ 3. BADGE → BOOK：信任已核實，略過 pending，保留簽名，不覆寫個資，不誤抓他人
  {
    const b = makeBook();
    // 本機既有簽名墨跡
    b.progress[ACT] = {
      date: '2026-01-01',
      signature: { png: 'data:image/svg+xml;base64,local-sig' },
      assessor: '本地審核員',
    };
    // 雲端已核實進度（含一項 pending，應被略過）
    const json = {
      progress: {
        '0000081420': {
          [ACT]: { date: '2026-01-10', confirmedByBadge: true, confirmedAt: '2026-01-11', confirmedBy: '區總監' },
          [UND]: { date: '2026-02-01', status: 'pending', confirmed: false },
        },
      },
    };
    const result = importFromRoverBadge(json, b);

    ok(result.imported >= 1, `匯入已核實進度：imported = ${result.imported}`);
    ok(result.skippedPending && result.skippedPending.includes(UND), `pending 項目被略過（skippedPending = ${JSON.stringify(result.skippedPending)}）`);
    ok(b.progress[ACT].confirmedByBadge === true, '已核實項目標記 confirmedByBadge = true');
    ok(b.progress[ACT].confirmedAt === '2026-01-11', '更新核實日期');
    ok(b.progress[ACT].confirmedBy === '區總監', '更新核實人');
    ok(b.progress[ACT].signature.png === 'data:image/svg+xml;base64,local-sig', '保留本機既有簽名墨跡');
    ok(b.progress[ACT].assessor === '本地審核員', '保留本機審核員');
    ok(b.member.nameZh === '測試童軍', '不覆寫本機姓名');
    ok(b.member.crew === '測試旅', '不覆寫本機團隊');
    ok(b.member.group === '測試第 1 旅', '不覆寫本機旅別');
    ok(result.matchedBy.startsWith('SCOUT ID'), '以 SCOUT ID 配對（matchedBy = ' + result.matchedBy + ')');
  }

  // 空白簿未填 SCOUT ID：匯入單一本人資料時自動綁定 SCOUT ID（即連即用）
  {
    const b = newBook(); // 沒有 scoutId
    ok(scoutId(b) === '', '空白簿初始無 SCOUT ID');
    const json = { progress: { '0000081420': { [ACT]: '2026-04-01' } } };
    const result = importFromRoverBadge(json, b);
    ok(result.member.scoutId === '0000081420', '空白簿自動綁定來源的 SCOUT ID');
    ok(result.matchedBy === 'SCOUT ID 0000081420', '配對以單一來源編號為準');
  }

  // 找不到 sid 時不得 fallback 到第一位成員，也不得按姓名配對：多成員容器且無匹配 → 拋錯
  {
    const b = makeBook('0000081420');
    const json = {
      members: [
        { scoutId: '1111111111', name: '其他人', progress: { [ACT]: '2026-05-01' } },
        { scoutId: '2222222222', name: '測試童軍', progress: { [ACT]: '2026-05-02' } },
      ],
      progress: {
        '1111111111': { [ACT]: '2026-05-01' },
        '2222222222': { [ACT]: '2026-05-02' },
      },
    };
    expectThrows(() => importFromRoverBadge(json, b), '未找到本機 sid 時不誤抓第一位成員／按姓名配對（應拋錯）');
  }

  // ================================================================ 4. /api/roverbadge 守衛
  restoreFetch();
  // GET 旅團清單
  installFetch((url) => {
    if (url.endsWith('/api/troops')) {
      return jsonResponse({ troops: { '0082': { name: '九龍第 82 旅', en: 'Kowloon 82nd Troop' } } });
    }
    return jsonResponse({ error: 'unexpected' }, 404);
  });
  {
    const { res } = await get();
    ok(res.statusCode === 200, 'GET /api/roverbadge 回傳 200');
    ok(res.body && res.body.troops && res.body.troops['0082'].name === '九龍第 82 旅', 'GET 回傳公開旅團清單（零後端 URL／API Key）');
    ok(!res.body.troops['0082'].backend && !res.body.troops['0082'].apikey, '旅團清單不洩漏後端 URL 與 API Key');
  }

  // 直接寫入動作一律 403
  installFetch(() => jsonResponse({ success: true })); // 不應被呼叫
  for (const action of ['save', 'saveOtherBadge', 'reviewRequest']) {
    const { res } = await post(action, { troopId: '0082', token: 'tok' });
    ok(res.statusCode === 403, `POST action=${action} 回傳 403 Forbidden`);
  }

  // submitPending：硬性轉發為 requestComplete，狀態 pending
  installFetch((url, init) => {
    const body = JSON.parse(init.body || '{}');
    if (body.action === 'requestComplete') {
      return jsonResponse({ success: true, status: 'pending' });
    }
    return jsonResponse({ success: false, error: 'unexpected action: ' + body.action }, 400);
  });
  {
    const { res } = await post('submitPending', {
      troopId: '0082',
      scoutId: '0000081420',
      token: 'tok',
      items: [{ itemId: ACT, date: '2026-06-01' }, { itemId: UND, date: '2026-06-02' }],
    });
    ok(res.statusCode === 200, 'POST submitPending 回傳 200');
    ok(res.body.success === true, 'submitPending success = true');
    ok(res.body.ok === 2, `submitPending 送交 2 項（ok = ${res.body.ok}）`);
    ok(res.body.results.every((r) => r.status === 'pending'), '每項皆標記為待領袖核實（pending）');
    ok(captured.init.body.includes('"action":"requestComplete"'), '轉發至 ROVERBADGE 為 action: requestComplete');
  }

  // load：僅抽取本人已核實進度，剝除 members 與所有其他成員
  installFetch((url, init) => {
    const body = JSON.parse(init.body || '{}');
    if (body.action === 'load') {
      return jsonResponse({
        members: [
          {
            scoutId: '0000081420',
            ymis: '0000081420',
            progress: { [ACT]: '2026-01-10', [UND]: '2026-02-01' },
            otherBadges: { 'OT-FA': '2026-03-01' },
            pendingRequests: [{ itemId: LEADER, date: '2026-07-01', status: 'pending' }],
          },
          { scoutId: '9999999999', name: '他人', progress: { [ACT]: '2026-08-01' } },
        ],
        progress: { '9999999999': { [ACT]: '2026-08-01' } }, // 他人進度，須被剝除
      });
    }
    return jsonResponse({ error: 'unexpected action' }, 400);
  });
  {
    const { res } = await post('load', { troopId: '0082', scoutId: '0000081420', token: 'tok' });
    ok(res.statusCode === 200, 'POST load 回傳 200');
    ok(res.body.progress && res.body.progress[ACT] === '2026-01-10', 'load 僅回傳本人已核實 progress');
    ok(res.body.otherBadges && res.body.otherBadges['OT-FA'] === '2026-03-01', 'load 回傳本人 otherBadges');
    ok(Array.isArray(res.body.pendingRequests) && res.body.pendingRequests.some((p) => p.itemId === LEADER), 'load 回傳本人 pendingRequests');
    ok(!res.body.members, 'load 徹底剝除 members 名單');
    ok(res.body.progress['9999999999'] === undefined, 'load 不洩漏其他成員進度');
  }

  // login：轉發 proxy login，回傳 {success, token, ymis}，剝除姓名與電郵
  installFetch((url, init) => {
    const body = JSON.parse(init.body || '{}');
    if (body.action === 'login') {
      return jsonResponse({ success: true, token: 'abc123', user: { ymis: '0000081420', name: 'Alice', email: 'alice@example.com' } });
    }
    return jsonResponse({ error: 'unexpected action: ' + body.action }, 400);
  });
  {
    const { res } = await post('login', { troopId: '0082', scoutId: '81420', password: 'pw' });
    ok(res.statusCode === 200, 'POST login 回傳 200');
    ok(res.body.success === true, 'login success = true');
    ok(res.body.token === 'abc123', 'login 回傳 token');
    ok(res.body.ymis === '0000081420', 'login 回傳 ymis（正規化 81420 → 0000081420）');
    ok(res.body.name === undefined && res.body.email === undefined, 'login 剝除姓名與電郵（零 PII）');
  }

  restoreFetch();
  console.log(`\n${pass} 項通過、${fail} 項失敗`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  restoreFetch();
  console.error('測試失敗：', e);
  process.exit(1);
});
