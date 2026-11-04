// 產生 Apple Wallet pass 需要的圖檔（SVG → PNG）。
// 執行：node scripts/make-wallet-assets.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT = path.join(ROOT, 'server', 'assets', 'wallet');
fs.mkdirSync(OUT, { recursive: true });

const crest = (bg = '#0d342a', gold = '#d8b871') => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="18" fill="${bg}"/>
  <g fill="${gold}">
    <path d="M50 16c6.5 11 15.5 14 15.5 24 0 8.3-6.8 14-15.5 14s-15.5-5.7-15.5-14c0-10 9-13 15.5-24z"/>
    <path d="M40 58h20l-3 8H43l-3-8z" opacity=".92"/>
    <rect x="37" y="70" width="26" height="5" rx="2.5" opacity=".85"/>
  </g>
</svg>`;

const wordmark = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 100">
  <g fill="#e6dcc0">
    <path d="M40 18c6.6 11.2 15.8 14.2 15.8 24.4 0 8.4-7 14.2-15.8 14.2s-15.8-5.8-15.8-14.2C24.2 32.2 33.4 29.2 40 18z"/>
    <path d="M29.6 60h20.8l-3.2 8.6H32.8L29.6 60z" opacity=".92"/>
    <rect x="26" y="72" width="28" height="5" rx="2.5" opacity=".85"/>
  </g>
  <g fill="#cfbf93">
    <rect x="78" y="34" width="94" height="3.2" rx="1.6"/>
    <rect x="78" y="47" width="70" height="3.2" rx="1.6" opacity=".7"/>
    <rect x="78" y="60" width="46" height="3.2" rx="1.6" opacity=".45"/>
    <rect x="78" y="73" width="22" height="3.2" rx="1.6" opacity=".28"/>
  </g>
</svg>`;

const sizes = [
  ['icon.png', 29],
  ['icon@2x.png', 58],
  ['icon@3x.png', 87],
];

for (const [name, size] of sizes) {
  await sharp(Buffer.from(crest())).resize(size, size).png().toFile(path.join(OUT, name));
}

await sharp(Buffer.from(wordmark)).resize(320, 100).png().toFile(path.join(OUT, 'logo.png'));
await sharp(Buffer.from(wordmark)).resize(320, 100).png().toFile(path.join(OUT, 'logo@2x.png'));

// 分享頁用的預覽圖
await sharp(Buffer.from(crest('#0d342a', '#d8b871'))).resize(512, 512).png().toFile(path.join(OUT, 'preview.png'));

console.log('wallet assets written to', OUT);
