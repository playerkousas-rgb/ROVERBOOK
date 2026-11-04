import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'shares.json');

let cache = null;
let timer = null;

function load() {
  if (cache) return cache;
  if (fs.existsSync(DB_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch {
      cache = { shares: {} };
    }
  } else {
    cache = { shares: {} };
  }
  if (!cache.shares) cache.shares = {};
  return cache;
}

function persist() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

function save() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    persist();
  }, 40);
}

const hash = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

export function createShare({ snapshot, deleteToken }) {
  const db = load();
  const id = crypto.randomBytes(9).toString('base64url');
  db.shares[id] = {
    id,
    snapshot,
    createdAt: new Date().toISOString(),
    tokenHash: hash(deleteToken),
    views: 0,
  };
  save();
  return db.shares[id];
}

export function getShare(id) {
  const db = load();
  const share = db.shares[id];
  return share || null;
}

export function touchShare(id) {
  const share = getShare(id);
  if (share) {
    share.views = (share.views || 0) + 1;
    save();
  }
  return share;
}

export function deleteShare(id, deleteToken) {
  const db = load();
  const share = db.shares[id];
  if (!share) return { ok: false, reason: 'not_found' };
  if (share.tokenHash !== hash(deleteToken || '')) return { ok: false, reason: 'forbidden' };
  delete db.shares[id];
  save();
  return { ok: true };
}

export function pruneShares(maxAgeDays = 400) {
  const db = load();
  const cutoff = Date.now() - maxAgeDays * 86400000;
  let removed = 0;
  Object.values(db.shares).forEach((s) => {
    if (new Date(s.createdAt).getTime() < cutoff) {
      delete db.shares[s.id];
      removed++;
    }
  });
  if (removed) save();
  return removed;
}
