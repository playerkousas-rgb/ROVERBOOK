// ROVERBOOK UI 與合約回歸測試：
//   1. 數位附錄 ROVERBADGE 同步卡的鎖定與條件式開戶提示合約
//   2. Welcome / MenuDialog / Appendix 備份還原與檔案區分合約
//   3. 樣式、圖示、列印隱藏規則與版本號同步合約
//
// 執行：node tests/ui_contracts.test.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const syncCard = read('web/src/components/RoverBadgeSyncCard.jsx');
const bridgeSrc = read('web/src/roverbadgeBridge.js');
const welcomeSrc = read('web/src/pages/Welcome.jsx');
const menuSrc = read('web/src/components/MenuDialog.jsx');
const appxSrc = read('web/src/pages/Appendix.jsx');
const uiSrc = read('web/src/ui.jsx');
const cssSrc = read('web/src/styles.css');
const envSrc = read('.env.example');
const viteSrc = read('vite.config.js');
const swSrc = read('web/public/sw.js');
const htmlSrc = read('web/index.html');
const pkg = JSON.parse(read('package.json'));
const pkgLock = JSON.parse(read('package-lock.json'));
const { APP_VERSION } = await import('../shared/book.js');

// 1. 橋接網址一致性
ok(bridgeSrc.includes('https://roverbadge.vercel.app'), '前端橋接預設 ROVERBADGE 網址為 https://roverbadge.vercel.app');
ok(envSrc.includes('ROVERBADGE_ORIGIN=https://roverbadge.vercel.app'), '.env.example 預設 ROVERBADGE_ORIGIN 正確');
ok(viteSrc.includes('roverbadgeHandler') && viteSrc.includes('/api/roverbadge'), 'vite.config.js 掛載本機 /api/roverbadge 橋接插件');

// 2. RoverBadgeSyncCard 進度檔交換鎖定 & 條件式開戶提示合約
ok(syncCard.includes('probeRoverBadgeBridge()'), 'RoverBadgeSyncCard 掛載時自動呼叫 probeRoverBadgeBridge()');
ok(syncCard.includes("roverbook.roverbadge.member.v1") && syncCard.includes('sessionStorage'), 'RoverBadgeSyncCard 使用 sessionStorage 保存 ROVERBADGE 對話');
ok(syncCard.includes('hasBadgeSession ? (') && syncCard.includes('roversync__locked'), 'RoverBadgeSyncCard 在未登入時隱藏進度檔按鈕並顯示 .roversync__locked 提示');
ok(
  /const onExportFile[\s\S]*?if \(!session\?\.token \|\| !session\?\.ymis\)/.test(syncCard),
  'onExportFile 函式起首強制檢查 session?.token && session?.ymis',
);
ok(
  /const onImportFile[\s\S]*?if \(!session\?\.token \|\| !session\?\.ymis\)/.test(syncCard),
  'onImportFile 函式起首強制檢查 session?.token && session?.ymis',
);
ok(
  syncCard.includes('showOpenAccountNotice') &&
    syncCard.includes('(noTroopsFound && !manualTroop) || (troopNotListed && showLogin)'),
  '僅在旅團清單為空或選擇找不到旅團時顯示 ROVERBADGE 開戶提示',
);
ok(
  syncCard.includes('target="_blank"') &&
    syncCard.includes('rel="noopener noreferrer"') &&
    syncCard.includes('href={badgeOrigin}'),
  '開戶按鈕安全外連至後端回傳之 origin',
);
ok(syncCard.includes('{!troopNotListed && (') && syncCard.includes('name="scoutId"'), '選擇找不到旅團時隱藏 SCOUT ID、密碼欄與登入鈕');
ok(syncCard.includes('onClick={probeBridge}') && syncCard.includes('重新讀取旅團清單'), '清單為空時提供「重新讀取旅團清單」按鈕');

// 3. Welcome / MenuDialog / Appendix 備份還原不得混入 BADGE 進度檔，且保留離線完整備份
for (const [name, src] of [
  ['Welcome.jsx', welcomeSrc],
  ['MenuDialog.jsx', menuSrc],
  ['Appendix.jsx', appxSrc],
]) {
  ok(
    src.includes('isBookBackupFile') && src.includes('isBadgeProgressFile'),
    `${name} 使用 isBookBackupFile / isBadgeProgressFile 區分完整備份與 BADGE 進度檔`,
  );
  ok(src.includes("e.target.value = ''"), `${name} 選檔後重設 input.value 以便可重複選擇同檔`);
}

// 4. 圖示與 CSS 合約（所有 RoverBadgeSyncCard 使用到的 .roversync__* 與圖示皆有定義，且列印隱藏）
for (const iconName of ['seam', 'lock', 'refresh', 'verified', 'download', 'upload', 'link', 'info', 'external']) {
  ok(uiSrc.includes(`${iconName}:`), `web/src/ui.jsx 定義圖示 ${iconName}`);
}

const usedSyncClasses = [...new Set(syncCard.match(/roversync(?:__[a-z-]+)?/g) || [])];
const missingCss = usedSyncClasses.filter((cls) => !cssSrc.includes(`.${cls}`));
ok(missingCss.length === 0, 'RoverBadgeSyncCard 所有 .roversync* 類別在 styles.css 皆有定義', missingCss.join(', '));

const printSection = cssSrc.slice(cssSrc.indexOf('@media print'));
ok(
  printSection.includes('.roversync') &&
    printSection.includes('.roversync__locked') &&
    printSection.includes('.roversync__notfound') &&
    printSection.includes('.roversync__offline'),
  '@media print 隱藏同步卡及鎖定／開戶／離線提示',
);
ok(/\.toasts\s*\{[^}]*left:\s*12px;[^}]*right:\s*12px;/.test(cssSrc), '.toasts 使用左右對稱留邊置中以免窄螢幕裁切');

// 5. 版本號與 CHANGELOG 同步
ok(
  `v${pkg.version}` === APP_VERSION &&
    pkg.version === '2.2.1' &&
    pkgLock.version === '2.2.1' &&
    htmlSrc.includes(`content="${APP_VERSION}"`) &&
    htmlSrc.includes(`window.APP_VERSION = '${APP_VERSION}'`) &&
    swSrc.includes("VERSION = 'v6'") &&
    fs.existsSync(path.join(ROOT, 'CHANGELOG.md')),
  `版本號與 CHANGELOG 同步（${APP_VERSION} / sw v6）`,
);

console.log(`\n${pass} 項通過、${fail} 項失敗`);
process.exit(fail === 0 ? 0 : 1);
