#!/usr/bin/env node
/** ==========================================================================
 * 嵌入白名單系統 — 部署標頭同步。
 * --------------------------------------------------------------------------
 * 把 shared/embed.js 的 EMBED_WHITELIST（單一真相）烤入 vercel.json 全站
 * CSP frame-ancestors 標頭。Vercel 的靜態標頭在部署時讀取，所以：
 *
 *   1. 改 shared/embed.js 的 EMBED_WHITELIST；
 *   2. npm run sync:embed        （更新 vercel.json）
 *   3. commit + redeploy          （新白名單生效）
 *
 *   npm run sync:embed -- --check  只核對不寫入，不同步則 exit 1（CI 可用）。
 *
 * 測試（tests/embed_contract、tests/embed_whitelist）守住兩邊一致。
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { EMBED_WHITELIST, buildFrameAncestors } from '../shared/embed.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/**
 * 同步（或核對）vercel.json 的全站 CSP 與預設白名單。
 * @param {{ check?: boolean, root?: string }} opts
 * @returns {{ changed: boolean, csp: string, file: string }}
 */
export function syncEmbedHeaders({ check = false, root = ROOT } = {}) {
  const file = path.join(root, 'vercel.json');
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  const csp = buildFrameAncestors(EMBED_WHITELIST);
  let changed = false;
  let found = false;
  for (const rule of config.headers || []) {
    if (rule.source !== '/(.*)') continue;
    for (const header of rule.headers || []) {
      if (header.key.toLowerCase() !== 'content-security-policy') continue;
      found = true;
      if (header.value !== csp) {
        header.value = csp;
        changed = true;
      }
    }
  }
  if (!found) throw new Error('vercel.json 找不到全站 Content-Security-Policy 標頭');
  if (changed && !check) fs.writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
  return { changed, csp, file };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const check = process.argv.includes('--check');
  const { changed, csp } = syncEmbedHeaders({ check });
  if (check) {
    if (changed) {
      console.error('✗ vercel.json CSP 與 shared/embed.js 白名單不同步，請執行 npm run sync:embed');
      process.exit(1);
    }
    console.log(`✓ vercel.json CSP 與白名單同步：${csp}`);
  } else {
    console.log(`${changed ? '✓ 已更新 vercel.json' : '✓ vercel.json 已是最新'}：${csp}`);
  }
}
