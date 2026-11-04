import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PRIVACY } from '../shared/schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const uid = (prefix = 'id') => `${prefix}_${crypto.randomBytes(5).toString('hex')}`;
export const newSlug = () => crypto.randomBytes(9).toString('base64url');

let cache = null;
let writeTimer = null;

export function getDb() {
  if (cache) return cache;
  if (fs.existsSync(DB_FILE)) {
    cache = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } else {
    cache = seed();
    persistNow();
  }
  return cache;
}

export function save() {
  if (writeTimer) return;
  writeTimer = setTimeout(() => {
    writeTimer = null;
    persistNow();
  }, 60);
}

function persistNow() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

export function findUserById(id) {
  return getDb().users.find((u) => u.id === id) || null;
}

export function findUserByNo(no) {
  const q = String(no || '').trim().toUpperCase();
  return getDb().users.find((u) => u.memberNo.toUpperCase() === q) || null;
}

export function findUserBySlug(slug) {
  return getDb().users.find((u) => u.publicSlug === slug) || null;
}

export function blankUser({ role, memberNo, pin, nameZh, nameEn, crew, group, district, region, leaderTitle }) {
  return {
    id: uid(role === 'leader' ? 'ldr' : 'rvr'),
    role,
    memberNo,
    pin,
    nameZh,
    nameEn,
    crew,
    group,
    district,
    region,
    leaderTitle: leaderTitle || null,
    publicSlug: newSlug(),
    createdAt: new Date().toISOString(),
    profile: {
      photo: null,
      nameZh,
      nameEn,
      memberNo,
      crew,
      district,
      region,
      issueDate: '',
      dob: '',
      placeOfBirth: '',
      phone: '',
      email: '',
      address: '',
      bloodType: '',
      emergencyName: '',
      emergencyPhone: '',
      sponsoringAuthority: '',
      groupAddress: '',
      gsl: '',
      rsl: '',
      meetingPlace: '',
      dateJoined: '',
      dateScoutMovement: '',
    },
    scouting: [],
    service: [],
    awards: [],
    expeditions: [],
    additional: [],
    training: {
      components: Object.fromEntries(
        ['dedication', 'scoutcraft', 'volunteerism', 'global', 'tenacity', 'wellness', 'intrepidity'].map((id) => [
          id,
          { done: false, date: '', note: '', verifiedBy: null, verifiedAt: null },
        ]),
      ),
      badges: {
        membership: { date: '', verifiedBy: null },
        epaulettes: { date: '', verifiedBy: null },
        award: { date: '', verifiedBy: null },
        bp: { date: '', verifiedBy: null },
      },
    },
    renewals: [],
    endorsement: null,
    privacy: structuredClone(DEFAULT_PRIVACY),
  };
}

// ---------------------------------------------------------------- demo seed

const d = (s) => s; // readability

function seed() {
  const leader = blankUser({
    role: 'leader',
    memberNo: 'L-0451',
    pin: '4510',
    nameZh: '馬啟明',
    nameEn: 'Ma Kai-ming',
    crew: '九龍第 145 旅樂行童軍團',
    group: '九龍第 145 旅',
    district: '紅磡區',
    region: '九龍地域',
    leaderTitle: '樂行童軍團長 RSL',
  });
  leader.profile.phone = '9123 4567';
  leader.profile.email = 'km.ma@example.org';

  const leader2 = blankUser({
    role: 'leader',
    memberNo: 'L-0522',
    pin: '5220',
    nameZh: '張詠恩',
    nameEn: 'Cheung Wing-yan',
    crew: '港島第 88 旅樂行童軍團',
    group: '港島第 88 旅',
    district: '中西區',
    region: '香港島地域',
    leaderTitle: '助理樂行童軍團長 ASL',
  });
  leader2.profile.phone = '6234 7788';
  leader2.profile.email = 'wy.cheung@example.org';

  const lam = blankUser({
    role: 'rover',
    memberNo: 'RS-2401',
    pin: '2401',
    nameZh: '林卓瑤',
    nameEn: 'Lam Cheuk-yiu',
    crew: '九龍第 145 旅樂行童軍團',
    group: '九龍第 145 旅',
    district: '紅磡區',
    region: '九龍地域',
  });
  Object.assign(lam.profile, {
    issueDate: '2024-09-08',
    dob: '2003-05-14',
    placeOfBirth: '香港',
    phone: '9876 5432',
    email: 'cy.lam@example.org',
    address: '九龍紅磡黃埔花園 5 座 12A',
    bloodType: 'O+',
    emergencyName: '林美珍（母親）',
    emergencyPhone: '9012 3456',
    sponsoringAuthority: '黃埔宣道會',
    groupAddress: '九龍紅磡黃埔花園社區中心 3 樓',
    gsl: '何志強',
    rsl: '馬啟明',
    meetingPlace: '黃埔社區中心禮堂',
    dateJoined: '2024-09-01',
    dateScoutMovement: '2015-10-04',
  });
  lam.scouting = [
    { id: uid('exp'), unit: '小童軍 Grasshopper Scout', post: '小童軍', highestAward: '金箭章', from: '2015-10', to: '2017-08' },
    { id: uid('exp'), unit: '幼童軍 Cub Scout', post: '六仔隊長', highestAward: '金紫荊章', from: '2017-09', to: '2020-08' },
    { id: uid('exp'), unit: '童軍 Scout', post: '小隊副隊長', highestAward: '童軍標準章', from: '2020-09', to: '2024-08' },
    { id: uid('exp'), unit: '樂行童軍 Rover Scout', post: '團員', highestAward: '樂行童軍肩章', from: '2024-09', to: '' },
  ];
  lam.awards = [
    { id: uid('awd'), name: '會員章 Membership Badge', summary: '完成啟導班及三次團活動', date: '2024-12-15', org: '九龍第 145 旅', verifiedBy: leader.id, verifiedAt: '2024-12-16T02:00:00Z' },
    { id: uid('awd'), name: '樂行童軍肩章 Rover Scout Epaulettes', summary: '完成 7 項考驗中 4 項', date: '2025-06-21', org: '九龍地域', verifiedBy: leader.id, verifiedAt: '2025-06-22T03:10:00Z' },
    { id: uid('awd'), name: '地域優秀服務獎', summary: '2025 年度紅磡區長者家居維修服務', date: '2025-11-02', org: '九龍地域', verifiedBy: null, verifiedAt: null },
  ];
  lam.service = [
    { id: uid('srv'), post: '團秘書 Crew Secretary', from: '2025-01', to: '2025-12', appointedBy: '馬啟明', verifiedBy: leader.id, verifiedAt: '2025-02-01T01:00:00Z' },
    { id: uid('srv'), post: '小隊長 Patrol Leader', from: '2025-09', to: '', appointedBy: '馬啟明', verifiedBy: null, verifiedAt: null },
    { id: uid('srv'), post: '黃埔長者中心義工', from: '2025-03', to: '', appointedBy: '黃埔宣道會', verifiedBy: null, verifiedAt: null },
  ];
  lam.expeditions = [
    { id: uid('exp'), period: '2025-12-27 至 2025-12-31', item: '台灣陽明山跨年遠足', description: '五天四夜，與台北市第 12 團交流，完成 32 公里縱走。' },
    { id: uid('exp'), period: '2025-04-18 至 2025-04-19', item: '鳳凰徑全走（第一至三段）', description: '大嶼山，負重 12 公斤，兩日一夜露營。' },
  ];
  lam.additional = [
    { id: uid('add'), period: '2025-05', item: '聖約翰急救證書', description: '持有至 2028 年 5 月。' },
  ];
  const comp = ['dedication', 'scoutcraft', 'volunteerism', 'global', 'tenacity'];
  comp.forEach((id, i) => {
    lam.training.components[id] = {
      done: true,
      date: ['2025-01-18', '2025-03-09', '2025-07-12', '2025-10-05', '2025-11-16'][i],
      note: '',
      verifiedBy: i < 4 ? leader.id : null,
      verifiedAt: i < 4 ? '2025-12-01T00:00:00Z' : null,
    };
  });
  lam.training.badges.membership = { date: '2024-12-15', verifiedBy: leader.id };
  lam.training.badges.epaulettes = { date: '2025-06-21', verifiedBy: leader.id };
  lam.renewals = [
    { id: uid('rnw'), year: 2025, validUntil: '2025-12-31', by: leader.id, byName: '馬啟明', at: '2025-01-05T04:00:00Z' },
    { id: uid('rnw'), year: 2026, validUntil: '2026-12-31', by: leader.id, byName: '馬啟明', at: '2026-01-04T03:20:00Z' },
  ];

  const chan = blankUser({
    role: 'rover',
    memberNo: 'RS-2312',
    pin: '2312',
    nameZh: '陳俊希',
    nameEn: 'Chan Chun-hei',
    crew: '九龍第 145 旅樂行童軍團',
    group: '九龍第 145 旅',
    district: '紅磡區',
    region: '九龍地域',
  });
  Object.assign(chan.profile, {
    issueDate: '2023-09-10',
    dob: '2002-11-30',
    placeOfBirth: '香港',
    phone: '9654 3210',
    email: 'ch.chan@example.org',
    address: '九龍土瓜灣馬頭圍道 88 號',
    bloodType: 'A+',
    emergencyName: '陳志明（父親）',
    emergencyPhone: '9345 6789',
    sponsoringAuthority: '土瓜灣浸信會',
    groupAddress: '九龍紅磡黃埔花園社區中心 3 樓',
    gsl: '何志強',
    rsl: '馬啟明',
    meetingPlace: '黃埔社區中心禮堂',
    dateJoined: '2023-09-01',
    dateScoutMovement: '2013-09-15',
  });
  chan.scouting = [
    { id: uid('exp'), unit: '幼童軍 Cub Scout', post: '隊員', highestAward: '金紫荊章', from: '2013-09', to: '2016-08' },
    { id: uid('exp'), unit: '童軍 Scout', post: '小隊長', highestAward: '總領袖獎章', from: '2016-09', to: '2023-08' },
    { id: uid('exp'), unit: '樂行童軍 Rover Scout', post: '副主席', highestAward: '', from: '2023-09', to: '' },
  ];
  chan.awards = [
    { id: uid('awd'), name: '會員章 Membership Badge', summary: '完成啟導班', date: '2023-12-02', org: '九龍第 145 旅', verifiedBy: leader.id, verifiedAt: '2023-12-03T00:00:00Z' },
    { id: uid('awd'), name: '樂行童軍肩章 Rover Scout Epaulettes', summary: '完成 4 項考驗', date: '2024-03-17', org: '九龍地域', verifiedBy: leader.id, verifiedAt: '2024-03-18T00:00:00Z' },
    { id: uid('awd'), name: '樂行童軍獎章 Rover Scout Award', summary: '完成全部 7 項考驗', date: '2025-04-06', org: '九龍地域', verifiedBy: leader.id, verifiedAt: '2025-04-07T00:00:00Z' },
  ];
  chan.service = [
    { id: uid('srv'), post: '管理委員會副主席 Vice-Chairperson', from: '2024-01', to: '2025-12', appointedBy: '馬啟明', verifiedBy: leader.id, verifiedAt: '2024-01-20T00:00:00Z' },
    { id: uid('srv'), post: '地域童軍技能教練', from: '2024-06', to: '', appointedBy: '九龍地域訓練組', verifiedBy: null, verifiedAt: null },
  ];
  chan.expeditions = [
    { id: uid('exp'), period: '2025-07-20 至 2025-08-03', item: '世界童軍大露營（韓國）', description: '代表香港童軍總會參與國際交流，負責營地可持續發展項目。' },
    { id: uid('exp'), period: '2024-12-28 至 2024-12-30', item: '西貢赤徑負重遠足', description: '三日兩夜，35 公里。' },
  ];
  chan.additional = [
    { id: uid('add'), period: '2024-04', item: '高級繩索技術課程', description: '由地域訓練組頒發。' },
  ];
  Object.keys(chan.training.components).forEach((id) => {
    chan.training.components[id] = { done: true, date: '2025-01-15', note: '', verifiedBy: leader.id, verifiedAt: '2025-04-01T00:00:00Z' };
  });
  chan.training.badges = {
    membership: { date: '2023-12-02', verifiedBy: leader.id },
    epaulettes: { date: '2024-03-17', verifiedBy: leader.id },
    award: { date: '2025-04-06', verifiedBy: leader.id },
    bp: { date: '', verifiedBy: null },
  };
  chan.renewals = [
    { id: uid('rnw'), year: 2025, validUntil: '2025-12-31', by: leader.id, byName: '馬啟明', at: '2025-01-05T04:00:00Z' },
    { id: uid('rnw'), year: 2026, validUntil: '2026-12-31', by: leader.id, byName: '馬啟明', at: '2026-01-04T03:20:00Z' },
  ];
  chan.privacy.sections = { ...chan.privacy.sections, additional: 'linked', renewals: 'public', service: 'public' };
  chan.privacy.fields = { ...chan.privacy.fields, phone: 'public', email: 'public', dob: 'linked' };

  const wong = blankUser({
    role: 'rover',
    memberNo: 'RS-2408',
    pin: '2408',
    nameZh: '黃芷晴',
    nameEn: 'Wong Tsz-ching',
    crew: '九龍第 145 旅樂行童軍團',
    group: '九龍第 145 旅',
    district: '紅磡區',
    region: '九龍地域',
  });
  Object.assign(wong.profile, {
    issueDate: '2026-09-06',
    dob: '2007-02-08',
    placeOfBirth: '香港',
    phone: '5566 7788',
    email: 'tc.wong@example.org',
    address: '九龍何文田公主道 12 號',
    bloodType: 'B+',
    emergencyName: '黃振邦（父親）',
    emergencyPhone: '9777 8899',
    sponsoringAuthority: '黃埔宣道會',
    groupAddress: '九龍紅磡黃埔花園社區中心 3 樓',
    gsl: '何志強',
    rsl: '馬啟明',
    meetingPlace: '黃埔社區中心禮堂',
    dateJoined: '2026-09-01',
    dateScoutMovement: '2018-09-02',
  });
  wong.scouting = [
    { id: uid('exp'), unit: '幼童軍 Cub Scout', post: '隊員', highestAward: '金紫荊章', from: '2018-09', to: '2021-08' },
    { id: uid('exp'), unit: '童軍 Scout', post: '小隊員', highestAward: '童軍標準章', from: '2021-09', to: '2026-08' },
    { id: uid('exp'), unit: '樂行童軍 Rover Scout', post: '團員', highestAward: '', from: '2026-09', to: '' },
  ];
  wong.awards = [
    { id: uid('awd'), name: '會員章 Membership Badge', summary: '啟導班進行中', date: '2026-10-18', org: '九龍第 145 旅', verifiedBy: leader.id, verifiedAt: '2026-10-19T00:00:00Z' },
  ];
  wong.training.components.dedication = { done: false, date: '', note: '啟導班 2026/11 開始', verifiedBy: null, verifiedAt: null };
  wong.renewals = [
    { id: uid('rnw'), year: 2026, validUntil: '2026-12-31', by: leader.id, byName: '馬啟明', at: '2026-09-02T02:00:00Z' },
  ];
  // 保守的私隱設定：只有身份及團籍公開
  wong.privacy.fields = {
    ...wong.privacy.fields,
    memberNo: 'linked',
    photo: 'self',
    district: 'linked',
    region: 'linked',
    rsl: 'linked',
    email: 'self',
    phone: 'self',
  };
  wong.privacy.sections = {
    scouting: 'self',
    training: 'self',
    awards: 'linked',
    service: 'self',
    expeditions: 'self',
    additional: 'self',
    renewals: 'self',
  };

  lam.endorsement = { by: leader.id, byName: '馬啟明', at: '2026-09-20T06:00:00Z', validUntil: '2026-12-31' };

  const connections = [
    {
      id: uid('con'),
      ownerId: lam.id,
      requesterId: leader.id,
      scope: 'basic', // basic | full
      status: 'accepted',
      message: '團長跟進訓練進度',
      initiatedBy: leader.id,
      createdAt: '2025-01-02T03:00:00Z',
      respondedAt: '2025-01-02T05:00:00Z',
    },
    {
      id: uid('con'),
      ownerId: chan.id,
      requesterId: leader.id,
      scope: 'full',
      status: 'accepted',
      message: '團長核實貝登堡獎章紀錄',
      initiatedBy: leader.id,
      createdAt: '2024-09-10T03:00:00Z',
      respondedAt: '2024-09-10T06:00:00Z',
    },
    {
      id: uid('con'),
      ownerId: wong.id,
      requesterId: leader.id,
      scope: 'basic',
      status: 'accepted',
      message: '新團員入團跟進',
      initiatedBy: leader.id,
      createdAt: '2026-09-02T02:30:00Z',
      respondedAt: '2026-09-02T08:00:00Z',
    },
    {
      id: uid('con'),
      ownerId: lam.id,
      requesterId: leader2.id,
      scope: 'full',
      status: 'pending',
      message: '地域訓練組需要核對你的貝登堡獎章進度',
      initiatedBy: leader2.id,
      createdAt: '2026-11-02T09:15:00Z',
      respondedAt: null,
    },
  ];

  return {
    version: 1,
    users: [leader, leader2, lam, chan, wong],
    connections,
    sessions: {},
    log: [
      { id: uid('log'), at: '2026-11-02T09:15:00Z', actorId: leader2.id, ownerId: lam.id, action: 'request', text: '張詠恩 要求查看你的全部紀錄' },
    ],
  };
}
