// 紙本頁碼／目錄／列印／行數回歸測試
//   node tests/page_map.test.mjs
//
// 規則（以官方《Rover Scout Record Book v20260727》為準）：
//   * 官方 PDF 共 43 張紙；
//   * 第 1 張是封面，官方不印頁碼，電子版亦不計入印刷頁；
//   * 內頁印刷頁 1–42（PDF 第 2–43 頁）；
//   * 目錄及數位附錄不佔紙本頁。

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SECTIONS, PRINT_PAGES, PAGE_TOTAL, SHEET_TOTAL, PAGE_ROWS } from '../shared/book.js';

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

// ------------------------------------------------------------ 1. 頁碼骨架

const cover = SECTIONS.find((s) => s.id === 'cover');
const printed = SECTIONS.filter((s) => typeof s.page === 'number');
const digital = SECTIONS.filter((s) => s.digital);

check(cover && cover.page === null && cover.sheet === 1, '封面不計印刷頁碼，佔 PDF 第 1 張');
check(PAGE_TOTAL === 42, `內頁印刷頁為 1–42（實際 ${PAGE_TOTAL}）`);
check(SHEET_TOTAL === 43, `全書 43 張紙（實際 ${SHEET_TOTAL}）`);
check(PRINT_PAGES.length === SHEET_TOTAL, '可列印章節數 = 43 張紙');
check(printed.length === PAGE_TOTAL, '有印刷頁碼的章節數 = PAGE_TOTAL');
check(digital.length === 2, '只有目錄及數位附錄兩個數位章節');

const pageNumbers = printed.map((s) => s.page);
check(
  pageNumbers.every((n, i) => n === i + 1),
  '印刷頁碼由 1 開始連續、無跳號、無重複',
  pageNumbers.join(','),
);
check(new Set(pageNumbers).size === pageNumbers.length, '印刷頁碼沒有重複');

const sheetNumbers = PRINT_PAGES.map((s) => s.sheet);
check(
  sheetNumbers.every((n, i) => n === i + 1),
  'PDF 張次由 1 開始連續（封面 = 1）',
  sheetNumbers.join(','),
);
check(PRINT_PAGES.every((s) => (s.id === 'cover' ? s.sheet === 1 : s.sheet === s.page + 1)), '每頁 PDF 張次 = 印刷頁碼 + 1');

for (const s of digital) {
  check(s.page === '—' && s.sheet === null, `${s.id} 不佔紙本頁（page = —, sheet = null）`);
}

// ------------------------------------------------------------ 2. 關鍵頁對照

const expected = {
  colophon: 1,
  'particulars-1': 2,
  'particulars-2': 3,
  group: 4,
  scouting: 5,
  changes: 6,
  'renewals-1': 7,
  'renewals-2': 8,
  'service-awards': 9,
  scheme: 10,
  plan: 11,
  'mb-intro': 12,
  'mb-presented': 16,
  'ep-intro': 17,
  'ep-presented': 18,
  'rsa-intro': 19,
  dedication: 21,
  'wellness-1': 26,
  'rsa-presented': 29,
  'interview-district': 30,
  'bpa-presented': 32,
  wosm: 33,
  uniform: 40,
  promise: 41,
  crest: 42,
};
for (const [id, page] of Object.entries(expected)) {
  const s = SECTIONS.find((x) => x.id === id);
  check(s && s.page === page && s.sheet === page + 1, `${id} = 印刷頁 ${page} / PDF 第 ${page + 1} 張`);
}

// ------------------------------------------------------------ 3. 目錄完整性

const contentsSrc = read('web/src/pages/Contents.jsx');
const idsBlocks = [...contentsSrc.matchAll(/ids:\s*\[([^\]]*)\]/g)].map((m) =>
  [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]),
);
const tocIds = idsBlocks.flat();
const printableIds = PRINT_PAGES.filter((s) => s.id !== 'cover').map((s) => s.id);
const missing = printableIds.filter((id) => !tocIds.includes(id));
const unknown = tocIds.filter((id) => !printableIds.includes(id));
const dupes = tocIds.filter((id, i) => tocIds.indexOf(id) !== i);
check(missing.length === 0, '目錄列出所有內頁（包括誓詞及徽章參考頁）', missing.join(','));
check(unknown.length === 0, '目錄沒有不存在的章節', unknown.join(','));
check(dupes.length === 0, '目錄沒有重複章節', dupes.join(','));

// ------------------------------------------------------------ 4. 文案及列印選單

const appSrc = read('web/src/App.jsx');
const printSrc = read('web/src/pages/PrintBook.jsx');
const menuSrc = read('web/src/components/MenuDialog.jsx');
const paperSrc = read('web/src/components/Paper.jsx');

check(appSrc.includes('PAGE_TOTAL') && appSrc.includes('SHEET_TOTAL'), 'App.jsx 由 PAGE_TOTAL／SHEET_TOTAL 產生頁數文案');
check(printSrc.includes('PAGE_TOTAL') && printSrc.includes('SHEET_TOTAL'), 'PrintBook.jsx 由常數產生列印張數');
check(menuSrc.includes('PAGE_TOTAL') && menuSrc.includes('SHEET_TOTAL'), 'MenuDialog.jsx 由常數產生列印選單文案');
check(contentsSrc.includes('PAGE_TOTAL') && contentsSrc.includes('SHEET_TOTAL'), 'Contents.jsx 由常數產生目錄說明');
check(paperSrc.includes('SHEET_TOTAL'), '紙頁頁眉由常數顯示封面張數');

for (const [name, src] of [
  ['App.jsx', appSrc],
  ['PrintBook.jsx', printSrc],
  ['MenuDialog.jsx', menuSrc],
  ['Contents.jsx', contentsSrc],
  ['Paper.jsx', paperSrc],
]) {
  check(!/43\s*頁|1\s*[–-]\s*43|共\s*41\s*頁|43\s*sheets|43\s*printed\s*pages/.test(src), `${name} 沒有殘留其他 BOOK 專案的 41／43 頁硬編碼`);
}

check(!/indexrow__no">1</.test(appSrc), '目錄抽屜的封面不再硬編碼為第 1 頁');

// ------------------------------------------------------------ 5. 表格行數（照官方 PDF）

check(PAGE_ROWS.renewals[0] + PAGE_ROWS.renewals[1] === 11, '會員資格兩頁共 11 行（5 + 6）');
check(PAGE_ROWS.service === 6, '服務紀錄 6 行');
check(PAGE_ROWS.awards === 3, '獎章及獎勵 3 行');
check(PAGE_ROWS.transfers === 3 && PAGE_ROWS.addressChanges === 5 && PAGE_ROWS.detailChanges === 3, '轉旅 3 行、遷移地址 5 行、更改摘要 3 行');
check(PAGE_ROWS.activities === 4, '會員章活動 4 行');
check(PAGE_ROWS.wellnessCerts === 4, '身心健康證書 4 行');
check(PAGE_ROWS.badges === 9, '獎章表 9 行');
check(PAGE_ROWS.additional === 11 && PAGE_ROWS.expeditions === 12, '其他經驗 11 行、遠足及海外活動 12 行');

const bookSrc = read('web/src/pages/Book.jsx');
const trainingSrc = read('web/src/pages/Training.jsx');
for (const key of ['transfers', 'addressChanges', 'detailChanges', 'renewals', 'service', 'awards', 'badges']) {
  check(bookSrc.includes(`PAGE_ROWS.${key}`), `Book.jsx 的 ${key} 行數來自 PAGE_ROWS`);
}
check(
  trainingSrc.includes('PAGE_ROWS.activities') && trainingSrc.includes('PAGE_ROWS.wellnessCerts'),
  'Training.jsx 的活動及證書行數來自 PAGE_ROWS',
);
check(
  (appSrc.match(/PAGE_ROWS\.expeditions/g) || []).length >= 2,
  '兩頁遠足及海外活動均使用 12 行（PAGE_ROWS.expeditions）',
);

// ------------------------------------------------------------ 6. README 對照表與程式同步

function pageMapTable() {
  const rows = PRINT_PAGES.map((s) => `| ${s.sheet} | ${s.page === null ? '封面（不計）' : s.page} | ${s.label} |`);
  return ['| PDF 張次 | 印刷頁 | 章節 |', '| --- | --- | --- |', ...rows].join('\n');
}
const readme = read('README.md');
const m = readme.match(/<!-- PAGE-MAP:START -->\n([\s\S]*?)\n<!-- PAGE-MAP:END -->/);
check(!!m, 'README 有 PAGE-MAP 自動對照區塊');
if (m) {
  check(m[1].trim() === pageMapTable().trim(), 'README 頁碼對照表與 SECTIONS 完全一致（防止文件漂移）');
}

// ------------------------------------------------------------ 7. 不得沿用其他 BOOK 專案

const otherProjects = ['CUBS' + 'BOOK', 'SCOUT' + 'BOOK'];
const projectDocs = [
  'README.md',
  'CHANGELOG.md',
  'shared/book.js',
  'shared/forms.js',
  'web/src/App.jsx',
  'web/src/pages/Contents.jsx',
  'web/src/pages/PrintBook.jsx',
  'web/src/components/MenuDialog.jsx',
  'web/src/pages/Forms.jsx',
].map((rel) => [rel, read(rel)]);
for (const [name, src] of projectDocs) {
  check(
    !otherProjects.some((p) => src.toUpperCase().includes(p)),
    `${name} 沒有提及其他 BOOK 專案`,
  );
}

console.log(`\n${pass} 項通過、${fail} 項失敗`);
process.exit(fail === 0 ? 0 : 1);
