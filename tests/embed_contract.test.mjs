import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FRAME_ANCESTORS, IFRAME_ALLOW, PORTAL_ORIGIN, isEmbedded, standaloneUrl } from '../shared/embed.js';

let passed = 0;
const check = (value, message) => { assert.ok(value, message); passed += 1; console.log(`✓ ${message}`); };
const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const headers = vercel.headers.flatMap((rule) => rule.headers.map((header) => ({ source: rule.source, ...header })));
const catchAll = headers.filter((header) => header.source === '/(.*)');
const value = (key) => catchAll.find((header) => header.key.toLowerCase() === key.toLowerCase())?.value;

check(PORTAL_ORIGIN === 'https://member-portal-sigma-swart.vercel.app', '正式服務平台來源正確');
check(value('Content-Security-Policy') === FRAME_ANCESTORS, '全站 CSP frame-ancestors 與單一真相一致');
check(FRAME_ANCESTORS === "frame-ancestors 'self' https://member-portal-sigma-swart.vercel.app", '白名單只含自身及正式服務平台');
check(!headers.some((header) => header.key.toLowerCase() === 'x-frame-options'), '沒有 X-Frame-Options 阻擋跨來源白名單');
check(value('Permissions-Policy') === 'camera=(self), microphone=(), geolocation=()', '保留相機安全標頭');
check(IFRAME_ALLOW === 'camera; clipboard-write', '文件要求 iframe 委派相機及剪貼簿權限');
const top = {}; top.self = top; top.top = top;
check(!isEmbedded(top), '獨立版不顯示嵌入提示');
const child = { self: {}, top }; check(isEmbedded(child), 'iframe 顯示嵌入提示');
check(standaloneUrl({ location: { origin: 'https://roverbook.vercel.app' } }) === 'https://roverbook.vercel.app/', '獨立版連結使用 BOOK 自身來源');
const notice = fs.readFileSync('web/src/components/EmbedNotice.jsx', 'utf8');
check(['分開儲存','匯出備份','匯入備份','Safari','target="_blank"'].every((text) => notice.includes(text)), '介面交代分割儲存、搬移步驟及 Safari 限制');
check(fs.readFileSync('README.md','utf8').includes(FRAME_ANCESTORS), 'README 記錄部署白名單');
console.log(`\n${passed} 項 iframe 嵌入合約測試全部通過。`);
