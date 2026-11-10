// ROVERBOOK 獨立運作與橋接純函式單元測試
//   node tests/standalone_book.test.mjs

import assert from 'node:assert/strict';
import { newBook, demoBook, exportForRoverBadge } from '../shared/book.js';
import {
  DEFAULT_ROVERBADGE_URL,
  TROOP_NOT_FOUND,
  isBadgeProgressFile,
  isBookBackupFile,
  pickTroopId,
  probeRoverBadgeBridge,
  safeBadgeOrigin,
  sortTroopEntries,
} from '../web/src/roverbadgeBridge.js';

let pass = 0;
let fail = 0;

function check(cond, label) {
  if (cond) {
    pass++;
    console.log(`✓ ${label}`);
  } else {
    fail++;
    console.log(`✗ ${label}`);
  }
}

async function main() {
  // 1. 獨立模式：沒有 ROVERBADGE 仍可建立空白／示範紀錄冊並完成備份分類
  const blank = newBook();
  const demo = demoBook();
  check(isBookBackupFile(blank) === true, '空白紀錄冊是合法的完整 ROVERBOOK 備份');
  check(isBookBackupFile(demo) === true, '示範紀錄冊是合法的完整 ROVERBOOK 備份');
  check(isBadgeProgressFile(blank) === false && isBadgeProgressFile(demo) === false, '完整紀錄冊不會誤判為 ROVERBADGE 進度檔');

  // 2. ROVERBADGE 進度檔辨識（不得當作完整紀錄冊備份直接還原）
  const pendingExport = exportForRoverBadge(demo, '0082');
  const confirmedPayload = { progress: { '0000081420': { 'L1-ACT-01': '2026-04-01' } } };
  const multiMemberPayload = { members: [{ scoutId: '0000081420', progress: {} }] };
  const flatPayload = { flatProgress: { 'L1-ACT-01': '2026-04-01' } };
  const bareItemsPayload = { 'L1-ACT-01': '2026-04-01' };

  for (const [label, sample] of [
    ['待領袖核實匯出檔 (pending.v1)', pendingExport],
    ['領袖已核實進度檔 (progress)', confirmedPayload],
    ['多成員匯出檔 (members)', multiMemberPayload],
    ['扁平進度檔 (flatProgress)', flatPayload],
    ['純項目鍵進度檔 (L1-ACT-01)', bareItemsPayload],
  ]) {
    check(isBookBackupFile(sample) === false, `${label} 不屬於完整紀錄冊備份`);
    check(isBadgeProgressFile(sample) === true, `${label} 準確識別為 ROVERBADGE 進度檔`);
  }

  check(isBookBackupFile({ member: { nameZh: '少 pages' } }) === false, '缺少 pages 的殘缺物件不會誤判為完整備份');
  check(isBookBackupFile(null) === false && isBadgeProgressFile(null) === false, 'null 安全回傳 false');

  // 3. safeBadgeOrigin 防護
  check(safeBadgeOrigin('https://roverbadge.vercel.app/login') === DEFAULT_ROVERBADGE_URL, 'safeBadgeOrigin 只保留 https origin');
  check(safeBadgeOrigin('http://localhost:3000') === DEFAULT_ROVERBADGE_URL, 'safeBadgeOrigin 拒絕非 https 來源');
  check(safeBadgeOrigin('javascript:alert(1)') === DEFAULT_ROVERBADGE_URL, 'safeBadgeOrigin 拒絕 javascript: URI');
  check(safeBadgeOrigin('https://user:pass@example.com') === DEFAULT_ROVERBADGE_URL, 'safeBadgeOrigin 拒絕含帳密 URL');

  // 4. probeRoverBadgeBridge：純靜態 HTML fallback、404、逾時、正常回傳
  {
    const htmlRes = await probeRoverBadgeBridge({
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        headers: { get: () => 'text/html; charset=utf-8' },
        json: async () => ({}),
      }),
    });
    check(htmlRes.available === false && htmlRes.reason === 'not-json', '靜態主機回傳 200 text/html 時安靜切換為獨立模式');

    const notFoundRes = await probeRoverBadgeBridge({
      fetchImpl: async () => ({ ok: false, status: 404, headers: { get: () => 'application/json' } }),
    });
    check(notFoundRes.available === false && notFoundRes.reason === 'http-404', '404 時安靜切換為獨立模式');

    const netErrRes = await probeRoverBadgeBridge({
      fetchImpl: async () => {
        throw new Error('offline');
      },
    });
    check(netErrRes.available === false && netErrRes.reason === 'network', '離線／網絡錯誤時安靜切換為獨立模式');

    const upstreamFailRes = await probeRoverBadgeBridge({
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ success: true, origin: 'javascript:evil', upstreamOk: false, troops: {} }),
      }),
    });
    check(
      upstreamFailRes.available === true &&
        upstreamFailRes.upstreamOk === false &&
        upstreamFailRes.origin === DEFAULT_ROVERBADGE_URL,
      '橋接在線但上游失敗時回報 available=true, upstreamOk=false 並淨化 origin',
    );

    const readyRes = await probeRoverBadgeBridge({
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          success: true,
          origin: 'https://roverbadge.vercel.app',
          upstreamOk: true,
          troops: { '0082': { name: '九龍 82' } },
        }),
      }),
    });
    check(
      readyRes.available === true && readyRes.upstreamOk === true && readyRes.troops['0082'].name === '九龍 82',
      '橋接正常時正確讀回已登記旅團與來源',
    );
  }

  // 5. sortTroopEntries 與 pickTroopId
  const sorted = sortTroopEntries({
    b1: { name: 'B1' },
    '0082': { name: '0082' },
    '9': { name: '9' },
    '0145': { name: '0145' },
  });
  assert.deepEqual(
    sorted.map(([id]) => id),
    ['9', '0082', '0145', 'b1'],
  );
  check(true, 'sortTroopEntries 按數字大小再排英數並保留前導零');

  check(pickTroopId('', { '0082': { name: '82' } }) === '0082', '只有 1 個旅團時自動選取');
  check(pickTroopId('', { '0082': { name: '82' }, '0145': { name: '145' } }) === '', '有多個旅團時不代為預選');
  check(pickTroopId('0145', { '0082': { name: '82' }, '0145': { name: '145' } }) === '0145', '已選旅團仍在清單時保留');
  check(pickTroopId(TROOP_NOT_FOUND, { '0082': { name: '82' } }) === '', '重新整理後清除 TROOP_NOT_FOUND 暫存值');

  console.log(`\n${pass} 項通過、${fail} 項失敗`);
  process.exit(fail === 0 ? 0 : 1);
}

main();
