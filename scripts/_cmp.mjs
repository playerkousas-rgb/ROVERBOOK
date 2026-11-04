import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { demoBook, STORE_KEY } from '../shared/book.js';
const b = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
const p = await b.newPage();
await p.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1.6 });
await p.evaluateOnNewDocument((k, v) => localStorage.setItem(k, v), STORE_KEY, JSON.stringify(demoBook()));
await p.goto('http://localhost:3001/print', { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 1200));
await p.emulateMediaType('print');
for (const id of process.argv.slice(2)) {
  const box = await p.evaluate((id) => {
    const el = [...document.querySelectorAll('.printall__one')].find((e) => e.dataset.fit === id);
    const r = el.getBoundingClientRect();
    return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height };
  }, id);
  await p.screenshot({ path: `/tmp/our-${id}.png`, clip: { x: box.x, y: box.y, width: box.width, height: Math.min(box.height, 1050) } });
  console.log('shot', id);
}
await b.close();
