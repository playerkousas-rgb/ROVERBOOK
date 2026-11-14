// 示範紀錄冊（最高獎章申請測試狀態）及防同步回歸測試
//   node tests/demo_book.test.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  demoBook,
  newBook,
  isDemoBook,
  exportForRoverBadge,
  importFromRoverBadge,
  collectPendingForRoverBadge,
} from '../shared/book.js';
import { formStatus, formData } from '../shared/forms.js';
import { SYLLABUS_ITEMS } from '../shared/syllabus.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let pass = 0;
let fail = 0;
function check(cond, label, detail = '') {
  if (cond) {
    pass++;
    console.log(`✓ ${label}`);
  } else {
    fail++;
    console.log(`✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const demo = demoBook();
const status = formStatus(demo);
const data = formData(demo, 'pt22');

// ------------------------------------------------------------ 1. 最高獎章申請狀態

check(isDemoBook(demo) === true, '示範紀錄冊有 meta.demo = true');
check(isDemoBook(newBook()) === false, '空白紀錄冊不是示範紀錄冊');
check(status.pt69.ready === true, 'PT/69（考試申請）資料齊備');
check(status.pt21.ready === true, 'PT/21（樂行童軍獎章）可生成');
check(status.pt22.ready === true, 'PT/22（貝登堡獎章）可生成 — 已達本支部最高獎章申請測試狀態');
check(status.doneCount === 7, `七項考驗全部完成（實際 ${status.doneCount}）`);
check(status.components.every((c) => c.done), '七個考核項目均為完成');
check(status.components.every((c) => c.from && c.to), '七個考核項目均有由／至日期');
check(status.components.every((c) => c.summary), '七個考核項目均有活動簡述');
check(status.components.every((c) => c.assessor), '七個考核項目均有審核員');
check(data.firstAid === 'DEMO-FA-0001', 'PT/22 自動帶入有效急救證書編號');
check(data.rsa.certNo === 'DEMO-RSA-0001', 'PT/22 自動帶入樂行童軍獎章證書編號');
check(data.rsa.presentedOn === '2026-05-16', 'PT/22 自動帶入樂行童軍獎章完成日期');
check(data.personal.gender && data.personal.addressEn, '表格需要的性別及英文地址已填');
check(data.personal.nameZh === '陳大文' && data.personal.memberNo === '0000000000', '持有人使用明顯的示範身份（陳大文 / 0000000000）');

// 15 個 L3 細項全部完成
const l3 = SYLLABUS_ITEMS.filter((i) => i.badgeId === 'L3');
const missingL3 = l3.filter((i) => !demo.progress?.[i.id]?.date);
check(l3.length === 15, `L3 共 15 個細項（實際 ${l3.length}）`);
check(missingL3.length === 0, '所有 L3 細項均有完成日期', missingL3.map((i) => i.id).join(','));

// 貝登堡獎章流程：已完成七項及會面，尚未頒發（停留在申請狀態）
check(demo.progress?.['L4-ALL-01']?.date, 'L4-ALL-01（七項全部完成）已記錄');
check(demo.progress?.['L4-ALL-02']?.date, 'L4-ALL-02（區總監及地域總監接見）已記錄');
check(!demo.progress?.['L4-ALL-03']?.date, 'L4-ALL-03（遞交貝登堡獎章申請）未填日期 — 示範停留在遞交前');
check(!demo.badges?.L4?.date, '貝登堡獎章未頒發（正確的「申請測試狀態」）');
check(demo.badges?.L3?.date === '2026-05-16', '樂行童軍獎章已頒發');
check(demo.pages?.['interview-district']?.date && demo.pages?.['interview-region']?.date, '區／地域總監會面日期已填');
check(!demo.pages?.['bpa-presented']?.presentedOn, '貝登堡獎章頒發頁留白');

// ------------------------------------------------------------ 2. 不冒用真實簽名／不使用真實個人資料

const bannedNames = ['林卓瑤', '馬啟明', '何志強', '陳國強', '梁淑儀', '陳詠詩', '林美珍'];
const json = JSON.stringify(demo);
for (const n of bannedNames) check(!json.includes(n), `示範資料不含舊有姓名「${n}」`);

const names = [];
(function walk(v) {
  if (!v || typeof v !== 'object') return;
  if (typeof v.name === 'string' && v.name.trim()) names.push(v.name.trim());
  if (typeof v.nameZh === 'string' && v.nameZh.trim()) names.push(v.nameZh.trim());
  Object.values(v).forEach(walk);
})(demo);
const badSigNames = names.filter(
  (n) => n !== '陳大文' && n !== '陳大文（示範）' && !n.includes('示範'),
);
check(badSigNames.length === 0, '所有簽署人姓名均為職位／示範名稱，沒有冒用真人', [...new Set(badSigNames)].join(','));
check(demo.holderSignature?.demo === true, '持有人簽署標記為示範墨跡');
check(demo.member.phone === '0000 0000' && demo.member.email === 'demo@example.org', '示範電話及電郵使用明顯虛構值');
check(demo.member.scoutId === '0000000000', '示範 SCOUT ID 為 0000000000，不可能對應真實成員');
check(
  demo.transfers?.length === 1 && demo.addressChanges?.length === 1 && demo.detailChanges?.length === 1,
  '轉旅、遷移地址及更改個人摘要各有示範紀錄（可核對第 6 頁列印）',
);
check(
  demo.service?.length === 3 && demo.awards?.length === 3 && demo.expeditions?.length === 2,
  '服務、獎章及遠足紀錄均有示範資料',
);

// ------------------------------------------------------------ 3. 示範資料不得進入正式系統

let exportBlocked = false;
try {
  exportForRoverBadge(demo, '0082');
} catch {
  exportBlocked = true;
}
check(exportBlocked, '示範紀錄冊不可匯出「待領袖核實」進度檔');

let importBlocked = false;
try {
  importFromRoverBadge({ progress: { '0000081420': { 'L1-ACT-01': '2026-04-01' } } }, demo);
} catch {
  importBlocked = true;
}
check(importBlocked, '示範紀錄冊不可從 ROVERBADGE 匯入正式進度');

const pending = collectPendingForRoverBadge(demo);
check(pending.count === 0 && pending.pendingRequests.length === 0, '示範紀錄冊不會產生送往 ROVERBADGE 的待核實項目');

const syncCard = read('web/src/components/RoverBadgeSyncCard.jsx');
check(syncCard.includes('isDemoBook') && syncCard.includes('roversync__demo'), '同步卡對示範紀錄冊顯示獨立鎖定提示');
check(syncCard.includes('t.demoLock') && syncCard.includes('示範樣本'), '同步卡清楚說明示範資料不可同步');
check(read('api/roverbadge.js').includes('DEMO_BLOCKED'), '伺服器橋接拒絕示範／全零成員編號的寫入動作');

// ------------------------------------------------------------ 4. 表格示範標示

const formsSrc = read('web/src/pages/Forms.jsx');
const cssSrc = read('web/src/styles.css');
check(formsSrc.includes('示範樣本，只供測試，不可遞交'), '表格原始碼包含指定示範字句');
check(formsSrc.includes('DEMO SAMPLE — FOR TESTING ONLY — NOT FOR SUBMISSION'), '表格同時有英文示範標示');
check((formsSrc.match(/<DemoBanner/g) || []).length >= 4, 'PT/69、PT/21、PT/22 及表格首頁均顯示示範橫額');
check((formsSrc.match(/<DemoWatermark/g) || []).length >= 2, '單張及一次列印三張均有示範水印');
check(formsSrc.includes("data-demo={data.demo ? 'true' : undefined}"), '示範表格有 data-demo 標記');
check(cssSrc.includes('.fd-demo-banner') && cssSrc.includes('.fd-demo-watermark'), '示範橫額及水印有樣式');
check(/@media print\s*\{\s*\.fd-demo-watermark\{position:fixed/.test(cssSrc), '列印時水印固定在每一頁');

// ------------------------------------------------------------ 5. 版本及離線快取

const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const bookSrc = read('shared/book.js');
const sw = read('web/public/sw.js');
const html = read('web/index.html');
check(pkg.version === '2.2.1' && lock.version === '2.2.1', 'package.json 及 package-lock.json 已升至 2.2.1');
check(bookSrc.includes("APP_VERSION = 'v2.2.1'"), 'APP_VERSION = v2.2.1');
check(sw.includes("VERSION = 'v6'"), 'Service Worker 快取版本已升至 v6');
check(html.includes('v2.2.1'), 'index.html 版本已同步');

console.log(`\n${pass} 項通過、${fail} 項失敗`);
process.exit(fail === 0 ? 0 : 1);
