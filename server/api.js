import express from 'express';
import crypto from 'node:crypto';
import QRCode from 'qrcode';
import { getDb, save, blankUser, newSlug, findUserById, findUserByNo, findUserBySlug } from './store.js';
import { buildCard, miniCard, findConnection, viewerRank, connectionForViewer, trainingSummary } from './access.js';
import { FIELD_GROUPS, PROFILE_FIELDS, SECTIONS, COMPONENTS, BADGES, VISIBILITY_LEVELS } from '../shared/schema.js';

export const api = express.Router();
const uid = (p = 'id') => `${p}_${crypto.randomBytes(5).toString('hex')}`;
const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

const COOKIE = 'rb_session';
const FIELD_KEYS = PROFILE_FIELDS.map((f) => f.key);
const SECTION_KEYS = SECTIONS.map((s) => s.key);
const LEVEL_IDS = VISIBILITY_LEVELS.map((l) => l.id);
const WRITABLE_SECTIONS = ['scouting', 'service', 'awards', 'expeditions', 'additional'];

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  const hit = raw.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
}

api.use(express.json({ limit: '2mb' }));

api.use((req, _res, next) => {
  const db = getDb();
  const token = readCookie(req, COOKIE);
  req.user = token && db.sessions[token] ? findUserById(db.sessions[token].userId) : null;
  req.db = db;
  next();
});

function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: '請先登入' });
  next();
}

function logEvent(db, { actorId, ownerId, action, text }) {
  db.log.unshift({ id: uid('log'), at: now(), actorId, ownerId, action, text });
  db.log = db.log.slice(0, 300);
}

// ------------------------------------------------------------------ session

api.post('/login', (req, res) => {
  const { memberNo, pin } = req.body || {};
  const user = findUserByNo(memberNo);
  if (!user || String(user.pin) !== String(pin || '').trim()) {
    return res.status(401).json({ error: '會員編號或 PIN 不正確' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  req.db.sessions[token] = { userId: user.id, createdAt: now() };
  save();
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
  );
  res.json({ user: { id: user.id, nameZh: user.nameZh, nameEn: user.nameEn, role: user.role } });
});

api.post('/logout', (req, res) => {
  const token = readCookie(req, COOKIE);
  if (token) delete req.db.sessions[token];
  save();
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  res.json({ ok: true });
});

api.get('/session', (req, res) => {
  if (!req.user) return res.json({ user: null });
  res.json({ user: publicUser(req.user) });
});

function publicUser(u) {
  return {
    id: u.id,
    role: u.role,
    memberNo: u.memberNo,
    nameZh: u.nameZh,
    nameEn: u.nameEn,
    crew: u.crew,
    group: u.group,
    district: u.district,
    region: u.region,
    leaderTitle: u.leaderTitle,
    photo: u.profile?.photo || null,
  };
}

// Demo helper — who can be tried out on this prototype.
api.get('/demo-accounts', (req, res) => {
  const db = req.db;
  res.json({
    accounts: db.users.map((u) => ({
      id: u.id,
      role: u.role,
      memberNo: u.memberNo,
      pin: u.pin,
      nameZh: u.nameZh,
      nameEn: u.nameEn,
      crew: u.crew,
      leaderTitle: u.leaderTitle,
      tagline:
        u.role === 'leader'
          ? '領袖帳戶：可搜尋成員、請求連結、核實紀錄'
          : u.memberNo === 'RS-2401'
            ? '示範成員：部分資料公開、有一項待處理的領袖請求'
            : u.memberNo === 'RS-2312'
              ? '示範成員：已授予團長「全部資料」'
              : '示範成員：較保守的私隱設定',
    })),
  });
});

// ------------------------------------------------------------------- my data

api.get('/me', requireUser, (req, res) => {
  const u = req.user;
  const card = buildCard(req.db, u, u);
  res.json({
    user: publicUser(u),
    profile: u.profile,
    privacy: u.privacy,
    scouting: u.scouting,
    service: u.service,
    awards: u.awards,
    expeditions: u.expeditions,
    additional: u.additional,
    training: u.training,
    renewals: u.renewals,
    endorsement: u.endorsement,
    card,
    share: { slug: u.publicSlug, path: `/c/${u.publicSlug}` },
    summary: trainingSummary(u),
  });
});

api.put('/me/profile', requireUser, (req, res) => {
  const body = req.body || {};
  const u = req.user;
  const patch = {};
  FIELD_KEYS.forEach((k) => {
    if (typeof body[k] === 'string') patch[k] = body[k].slice(0, 500);
  });
  if (typeof patch.photo === 'string' && patch.photo && !/^data:image\/(png|jpeg|webp);base64,/.test(patch.photo)) {
    delete patch.photo;
  }
  if (patch.photo && patch.photo.length > 900_000) return res.status(413).json({ error: '相片檔案過大' });
  Object.assign(u.profile, patch);
  ['nameZh', 'nameEn', 'crew', 'district', 'region', 'memberNo'].forEach((k) => {
    if (patch[k]) u[k] = patch[k];
  });
  if (patch.nameZh) u.nameZh = patch.nameZh;
  if (patch.nameEn) u.nameEn = patch.nameEn;
  save();
  res.json({ profile: u.profile, user: publicUser(u) });
});

api.put('/me/privacy', requireUser, (req, res) => {
  const u = req.user;
  const body = req.body || {};
  if (body.fields && typeof body.fields === 'object') {
    FIELD_KEYS.forEach((k) => {
      const v = body.fields[k];
      if (LEVEL_IDS.includes(v)) u.privacy.fields[k] = v;
    });
  }
  if (body.sections && typeof body.sections === 'object') {
    SECTION_KEYS.forEach((k) => {
      const v = body.sections[k];
      if (LEVEL_IDS.includes(v)) u.privacy.sections[k] = v;
    });
  }
  save();
  res.json({ privacy: u.privacy });
});

api.post('/me/share/rotate', requireUser, (req, res) => {
  req.user.publicSlug = newSlug();
  save();
  res.json({ slug: req.user.publicSlug, path: `/c/${req.user.publicSlug}` });
});

// ---------------------------------------------------------------- my records

api.post('/me/records/:section', requireUser, (req, res) => {
  const { section } = req.params;
  if (!WRITABLE_SECTIONS.includes(section)) return res.status(400).json({ error: '不支援的章節' });
  const u = req.user;
  const body = req.body || {};
  const base = { id: uid(section.slice(0, 3)), createdAt: now() };
  const make = {
    scouting: () => ({
      unit: body.unit || '',
      post: body.post || '',
      highestAward: body.highestAward || '',
      from: body.from || '',
      to: body.to || '',
    }),
    service: () => ({ post: body.post || '', from: body.from || '', to: body.to || '', appointedBy: body.appointedBy || '', verifiedBy: null, verifiedAt: null }),
    awards: () => ({ name: body.name || '', summary: body.summary || '', date: body.date || '', org: body.org || '', verifiedBy: null, verifiedAt: null }),
    expeditions: () => ({ period: body.period || '', item: body.item || '', description: body.description || '' }),
    additional: () => ({ period: body.period || '', item: body.item || '', description: body.description || '' }),
  }[section];
  u[section] = u[section] || [];
  u[section].unshift({ ...base, ...make() });
  save();
  res.json({ items: u[section] });
});

api.delete('/me/records/:section/:id', requireUser, (req, res) => {
  const { section, id } = req.params;
  if (!WRITABLE_SECTIONS.includes(section)) return res.status(400).json({ error: '不支援的章節' });
  req.user[section] = (req.user[section] || []).filter((i) => i.id !== id);
  save();
  res.json({ items: req.user[section] });
});

api.post('/me/training/:componentId', requireUser, (req, res) => {
  const { componentId } = req.params;
  if (!COMPONENTS.some((c) => c.id === componentId)) return res.status(400).json({ error: '未知考驗項目' });
  const u = req.user;
  const state = u.training.components[componentId] || {};
  if (typeof req.body.done === 'boolean') {
    state.done = req.body.done;
    if (state.done) state.date = state.date || today();
    // 成員自行修改後，需要領袖重新核實
    state.verifiedBy = null;
    state.verifiedAt = null;
  }
  if (typeof req.body.note === 'string') state.note = req.body.note.slice(0, 300);
  u.training.components[componentId] = state;
  save();
  res.json({ training: u.training });
});

// ---------------------------------------------------------------- connections

function connectionView(db, viewer, c) {
  const peer = findUserById(c.ownerId === viewer.id ? c.requesterId : c.ownerId);
  return {
    id: c.id,
    scope: c.scope,
    status: c.status,
    message: c.message,
    createdAt: c.createdAt,
    respondedAt: c.respondedAt,
    direction: c.ownerId === viewer.id ? 'incoming' : 'outgoing',
    peer: peer ? publicUser(peer) : null,
  };
}

api.get('/connections', requireUser, (req, res) => {
  const db = req.db;
  const mine = db.connections.filter((c) => c.ownerId === req.user.id || c.requesterId === req.user.id);
  const out = { linked: [], incoming: [], outgoing: [] };
  mine.forEach((c) => {
    const view = connectionView(db, req.user, c);
    if (c.status === 'accepted') out.linked.push(view);
    else if (c.status === 'pending' && c.ownerId === req.user.id) out.incoming.push(view);
    else if (c.status === 'pending') out.outgoing.push(view);
  });
  res.json(out);
});

api.post('/connections/request', requireUser, (req, res) => {
  const db = req.db;
  const { memberId, scope = 'basic', message = '' } = req.body || {};
  const target = findUserById(memberId);
  if (!target) return res.status(404).json({ error: '找不到此成員' });
  if (target.id === req.user.id) return res.status(400).json({ error: '不能與自己連結' });
  if (!['basic', 'full'].includes(scope)) return res.status(400).json({ error: '權限範圍不正確' });

  const existing = db.connections.find(
    (c) =>
      (c.ownerId === target.id && c.requesterId === req.user.id) ||
      (c.ownerId === req.user.id && c.requesterId === target.id),
  );
  if (existing && existing.status === 'accepted') return res.status(409).json({ error: '你們已經連結' });
  if (existing && existing.status === 'pending') return res.status(409).json({ error: '已有待處理的請求' });

  const conn = {
    id: uid('con'),
    ownerId: target.id,
    requesterId: req.user.id,
    scope,
    requestedScope: scope,
    status: 'pending',
    message: String(message).slice(0, 200),
    initiatedBy: req.user.id,
    createdAt: now(),
    respondedAt: null,
  };
  db.connections.unshift(conn);
  logEvent(db, {
    actorId: req.user.id,
    ownerId: target.id,
    action: 'request',
    text: `${req.user.nameZh} 要求${scope === 'full' ? '查看你的全部紀錄' : '與你連結'}`,
  });
  save();
  res.json({ connection: connectionView(db, req.user, conn) });
});

api.post('/connections/:id/respond', requireUser, (req, res) => {
  const db = req.db;
  const c = db.connections.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: '找不到此請求' });
  if (c.ownerId !== req.user.id) return res.status(403).json({ error: '只有紀錄持有人可以回應' });
  if (c.status !== 'pending') return res.status(409).json({ error: '此請求已處理' });
  const accept = !!req.body?.accept;
  if (accept) {
    c.status = 'accepted';
    c.scope = ['basic', 'full'].includes(req.body?.scope) ? req.body.scope : c.requestedScope || 'basic';
    c.respondedAt = now();
    logEvent(db, {
      actorId: req.user.id,
      ownerId: req.user.id,
      action: 'accept',
      text: `你接受了 ${findUserById(c.requesterId)?.nameZh || '對方'} 的連結請求（${c.scope === 'full' ? '全部資料' : '已連結資料'}）`,
    });
  } else {
    c.status = 'declined';
    c.respondedAt = now();
    logEvent(db, {
      actorId: req.user.id,
      ownerId: req.user.id,
      action: 'decline',
      text: `你拒絕了 ${findUserById(c.requesterId)?.nameZh || '對方'} 的連結請求`,
    });
  }
  save();
  res.json({ connection: connectionView(db, req.user, c) });
});

api.patch('/connections/:id', requireUser, (req, res) => {
  const c = req.db.connections.find((x) => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: '找不到此連結' });
  if (c.ownerId !== req.user.id) return res.status(403).json({ error: '只有紀錄持有人可以更改權限' });
  if (['basic', 'full'].includes(req.body?.scope)) {
    c.scope = req.body.scope;
    logEvent(req.db, {
      actorId: req.user.id,
      ownerId: req.user.id,
      action: 'scope',
      text: `你把 ${findUserById(c.requesterId)?.nameZh || '對方'} 的權限改為${c.scope === 'full' ? '全部資料' : '已連結資料'}`,
    });
    save();
  }
  res.json({ connection: connectionView(req.db, req.user, c) });
});

api.delete('/connections/:id', requireUser, (req, res) => {
  const db = req.db;
  const idx = db.connections.findIndex((x) => x.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: '找不到此連結' });
  const c = db.connections[idx];
  if (c.ownerId !== req.user.id && c.requesterId !== req.user.id) return res.status(403).json({ error: '沒有權限' });
  db.connections.splice(idx, 1);
  logEvent(db, { actorId: req.user.id, ownerId: c.ownerId, action: 'remove', text: `已解除連結` });
  save();
  res.json({ ok: true });
});

// -------------------------------------------------------------------- cards

api.get('/card/self', requireUser, (req, res) => {
  res.json({ card: buildCard(req.db, req.user, req.user), share: { path: `/c/${req.user.publicSlug}` } });
});

api.get('/card/:id', requireUser, (req, res) => {
  const db = req.db;
  const subject = findUserById(req.params.id);
  if (!subject) return res.status(404).json({ error: '找不到此成員' });
  const card = buildCard(db, req.user, subject);
  if (subject.id !== req.user.id) {
    logEvent(db, {
      actorId: req.user.id,
      ownerId: subject.id,
      action: 'view',
      text: `${req.user.nameZh} 查看了你的卡片${card.access.scope === 'full' ? '（全部資料）' : ''}`,
    });
    save();
  }
  res.json({ card });
});

api.get('/public/card/:slug', (req, res) => {
  const subject = findUserBySlug(req.params.slug);
  if (!subject) return res.status(404).json({ error: '卡片不存在或連結已更新' });
  res.json({ card: buildCard(req.db, null, subject, { isPublicLink: true }) });
});

api.get('/qr.svg', async (req, res) => {
  const data = String(req.query.d || '').slice(0, 500);
  if (!data) return res.status(400).end();
  try {
    const svg = await QRCode.toString(data, {
      type: 'svg',
      margin: 0,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f3d2e', light: '#00000000' },
    });
    res.type('image/svg+xml').set('Cache-Control', 'public, max-age=600').send(svg);
  } catch {
    res.status(500).end();
  }
});

// ----------------------------------------------------------------- directory

api.get('/directory', requireUser, (req, res) => {
  const db = req.db;
  const q = String(req.query.q || '').trim().toLowerCase();
  const role = req.query.role;
  let rows = db.users.filter((u) => u.id !== req.user.id);
  if (role) rows = rows.filter((u) => u.role === role);
  if (q) {
    rows = rows.filter((u) =>
      [u.memberNo, u.nameZh, u.nameEn, u.crew, u.group].join(' ').toLowerCase().includes(q),
    );
  }
  const results = rows.slice(0, 40).map((u) => miniCard(db, req.user, u));
  res.json({ results });
});

api.get('/leader/overview', requireUser, (req, res) => {
  const db = req.db;
  if (req.user.role !== 'leader') return res.status(403).json({ error: '只限領袖' });
  const accepted = db.connections.filter((c) => c.requesterId === req.user.id && c.status === 'accepted');
  const members = accepted
    .map((c) => {
      const u = findUserById(c.ownerId);
      if (!u) return null;
      const s = trainingSummary(u);
      return {
        ...miniCard(db, req.user, u),
        scope: c.scope,
        connectionId: c.id,
        completed: s.completed,
        total: s.total,
        membershipValidUntil: s.membershipValidUntil,
        membershipActive: s.membershipActive,
        endorsement: u.endorsement,
      };
    })
    .filter(Boolean);
  const pending = db.connections
    .filter((c) => c.requesterId === req.user.id && c.status === 'pending')
    .map((c) => connectionView(db, req.user, c));
  res.json({
    members,
    pending,
    stats: {
      members: members.length,
      fullAccess: members.filter((m) => m.scope === 'full').length,
      expiring: members.filter((m) => !m.membershipActive || (m.membershipValidUntil || '') < '2026-12-31').length,
      avgProgress: members.length
        ? Math.round((members.reduce((n, m) => n + m.completed, 0) / (members.length * 7)) * 100)
        : 0,
    },
  });
});

// --------------------------------------------------------- leader attestation

function requireLeaderAccess(req, res, next) {
  if (req.user.role !== 'leader') return res.status(403).json({ error: '只限領袖操作' });
  const subject = findUserById(req.params.id);
  if (!subject) return res.status(404).json({ error: '找不到此成員' });
  const conn = connectionForViewer(req.db, req.user, subject);
  if (!conn || conn.status !== 'accepted') return res.status(403).json({ error: '需要成員批准的連結才可核實' });
  req.subject = subject;
  req.connection = conn;
  req.card = buildCard(req.db, req.user, subject);
  next();
}

api.post('/members/:id/verify', requireUser, requireLeaderAccess, (req, res) => {
  const { kind, section, itemId, componentId, badgeId } = req.body || {};
  const subject = req.subject;
  const stamp = { verifiedBy: req.user.id, verifiedByName: req.user.nameZh, verifiedAt: now() };
  if (kind === 'record') {
    if (!WRITABLE_SECTIONS.includes(section)) return res.status(400).json({ error: '章節不正確' });
    if (req.card.access.scope !== 'full') return res.status(403).json({ error: '成員只授予「已連結」權限，未能核實此章節' });
    const item = (subject[section] || []).find((i) => i.id === itemId);
    if (!item) return res.status(404).json({ error: '找不到紀錄項目' });
    Object.assign(item, stamp);
  } else if (kind === 'component') {
    if (req.card.access.scope !== 'full') return res.status(403).json({ error: '需要「全部資料」權限才可核實考驗' });
    const comp = subject.training.components[componentId];
    if (!comp) return res.status(404).json({ error: '找不到考驗項目' });
    comp.done = true;
    comp.date = comp.date || today();
    Object.assign(comp, stamp);
  } else if (kind === 'badge') {
    if (req.card.access.scope !== 'full') return res.status(403).json({ error: '需要「全部資料」權限才可頒授獎章' });
    if (!BADGES.some((b) => b.id === badgeId)) return res.status(400).json({ error: '未知獎章' });
    subject.training.badges[badgeId] = { date: req.body.date || today(), verifiedBy: req.user.id };
  } else if (kind === 'endorse') {
    subject.endorsement = {
      by: req.user.id,
      byName: req.user.nameZh,
      at: now(),
      validUntil: req.body.validUntil || `${new Date().getFullYear()}-12-31`,
    };
  } else {
    return res.status(400).json({ error: '未知操作' });
  }
  logEvent(req.db, {
    actorId: req.user.id,
    ownerId: subject.id,
    action: 'verify',
    text: `${req.user.nameZh} 核實了你的紀錄（${kind}）`,
  });
  save();
  res.json({ card: buildCard(req.db, req.user, subject) });
});

api.post('/members/:id/renew', requireUser, requireLeaderAccess, (req, res) => {
  const subject = req.subject;
  const year = Number(req.body?.year) || new Date().getFullYear();
  const entry = {
    id: uid('rnw'),
    year,
    validUntil: `${year}-12-31`,
    by: req.user.id,
    byName: req.user.nameZh,
    at: now(),
  };
  subject.renewals = (subject.renewals || []).filter((r) => r.year !== year);
  subject.renewals.push(entry);
  subject.renewals.sort((a, b) => a.year - b.year);
  logEvent(req.db, {
    actorId: req.user.id,
    ownerId: subject.id,
    action: 'renew',
    text: `${req.user.nameZh} 為你續會至 ${year}-12-31`,
  });
  save();
  res.json({ card: buildCard(req.db, req.user, subject) });
});

// --------------------------------------------------------------------- audit

api.get('/me/audit', requireUser, (req, res) => {
  const rows = req.db.log
    .filter((l) => l.ownerId === req.user.id || l.actorId === req.user.id)
    .slice(0, 40)
    .map((l) => {
      const actor = findUserById(l.actorId);
      return {
        id: l.id,
        at: l.at,
        action: l.action,
        text: l.text,
        actor: actor ? publicUser(actor) : null,
        mine: l.ownerId === req.user.id,
      };
    });
  res.json({ events: rows });
});

api.get('/meta', (req, res) => {
  res.json({
    fieldGroups: FIELD_GROUPS,
    sections: SECTIONS,
    components: COMPONENTS,
    badges: BADGES,
    levels: VISIBILITY_LEVELS,
  });
});

// New member self-signup (kept simple for the prototype).
api.post('/register', (req, res) => {
  const { nameZh, nameEn, memberNo, pin, crew, group, district, region } = req.body || {};
  if (!nameZh || !memberNo || !pin) return res.status(400).json({ error: '請填寫姓名、會員編號及 PIN' });
  if (req.db.users.some((u) => u.memberNo.toUpperCase() === String(memberNo).toUpperCase())) {
    return res.status(409).json({ error: '此會員編號已存在' });
  }
  if (String(pin).length < 4) return res.status(400).json({ error: 'PIN 最少 4 位' });
  const u = blankUser({
    role: 'rover',
    memberNo: String(memberNo).toUpperCase(),
    pin: String(pin),
    nameZh,
    nameEn: nameEn || '',
    crew: crew || '',
    group: group || '',
    district: district || '',
    region: region || '',
  });
  u.profile.issueDate = today();
  req.db.users.push(u);
  save();
  res.json({ ok: true });
});
