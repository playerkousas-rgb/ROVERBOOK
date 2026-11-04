// ROVERBOOK — 紀錄冊資料模型（存在瀏覽器本機，毋須登入）
// 與 ROVERBADGE 互通的進度格式：{ [ymis]: { [itemId]: 'YYYY-MM-DD' } }

import { BADGE_SYLLABUS, SYLLABUS_ITEMS, ITEM_INDEX, TOTAL_ITEMS, SYLLABUS_META } from './syllabus.js';

export { BADGE_SYLLABUS, SYLLABUS_ITEMS, ITEM_INDEX, TOTAL_ITEMS, SYLLABUS_META };

export const STORE_KEY = 'roverbook.book.v2';
export const SHARE_KEY = 'roverbook.shares.v2';

export const uid = (p = 'r') => `${p}_${Math.random().toString(36).slice(2, 9)}`;

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function newBook(partial = {}) {
  const now = new Date().toISOString();
  return {
    version: 2,
    member: {
      nameZh: '',
      nameEn: '',
      memberNo: '',
      ymis: '',
      photo: null,
      crew: '',
      group: '',
      district: '',
      region: '',
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
      ...(partial.member || {}),
    },
    scouting: [],
    service: [],
    awards: [],
    expeditions: [],
    additional: [],
    progress: {},
    badges: {},
    renewals: [],
    holderSignature: null,
    endorsement: null,
    meta: { createdAt: now, updatedAt: now, ...(partial.meta || {}) },
    ...partial,
  };
}

// ---------------------------------------------------------------- statistics

export function badgeStats(book, badgeId) {
  const badge = BADGE_SYLLABUS.find((b) => b.id === badgeId);
  if (!badge) return { total: 0, done: 0, percent: 0, segments: [] };
  let total = 0;
  let done = 0;
  const segments = badge.segments.map((seg) => {
    const doneItems = seg.items.filter((i) => book.progress?.[i.id]?.date);
    total += seg.items.length;
    done += doneItems.length;
    return {
      code: seg.code,
      name: seg.name,
      total: seg.items.length,
      done: doneItems.length,
      complete: doneItems.length === seg.items.length,
    };
  });
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0, segments, badge };
}

export function allStats(book) {
  const badges = BADGE_SYLLABUS.map((b) => ({ ...badgeStats(book, b.id), awarded: book.badges?.[b.id]?.date || null }));
  const total = badges.reduce((n, b) => n + b.total, 0);
  const done = badges.reduce((n, b) => n + b.done, 0);
  return {
    badges,
    total,
    done,
    percent: total ? Math.round((done / total) * 100) : 0,
    nextBadge: badges.find((b) => b.done < b.total) || badges[badges.length - 1],
  };
}

export function latestRenewal(book) {
  return [...(book.renewals || [])].sort((a, b) => String(b.year).localeCompare(String(a.year)))[0] || null;
}

export function membershipStatus(book) {
  const last = latestRenewal(book);
  const t = today();
  return {
    renewal: last,
    validUntil: last?.validUntil || null,
    active: !!last && last.validUntil >= t,
  };
}

// ------------------------------------------------------------------- sharing

export const SHARE_SECTIONS = [
  { key: 'particulars', label: '個人資料', en: 'Personal particulars', note: '姓名、團籍、會員編號等' },
  { key: 'contact', label: '聯絡方法', en: 'Contact', note: '電話、電郵、地址、緊急聯絡人' },
  { key: 'group', label: '旅部資料', en: 'Group information', note: '主辦機構、旅長、團長、集會地點' },
  { key: 'scouting', label: '童軍紀錄', en: 'Scouting experience', note: '由小童軍至樂行童軍的經歷' },
  { key: 'training', label: '訓練進度', en: 'Training scheme', note: '四項獎章及 32 項細項' },
  { key: 'service', label: '服務紀錄', en: 'Service record' },
  { key: 'awards', label: '獎章及獎勵', en: 'Awards' },
  { key: 'expeditions', label: '遠足及海外活動', en: 'Expeditions' },
  { key: 'additional', label: '其他經驗', en: 'Additional experiences' },
  { key: 'renewals', label: '會員資格續期', en: 'Renewals' },
  { key: 'signatures', label: '簽署及旅印', en: 'Signatures' },
];

export const DEFAULT_SHARE = {
  particulars: true,
  contact: false,
  group: true,
  scouting: true,
  training: true,
  service: true,
  awards: true,
  expeditions: true,
  additional: false,
  renewals: true,
  signatures: true,
};

export function buildSnapshot(book, include = DEFAULT_SHARE) {
  const on = (k) => include[k] !== false;
  const snapshot = {
    version: 2,
    generatedAt: new Date().toISOString(),
    include,
    member: {
      ...book.member,
      photo: on('particulars') ? book.member.photo : null,
      phone: on('contact') ? book.member.phone : '',
      email: on('contact') ? book.member.email : '',
      address: on('contact') ? book.member.address : '',
      emergencyName: on('contact') ? book.member.emergencyName : '',
      emergencyPhone: on('contact') ? book.member.emergencyPhone : '',
      dob: on('contact') ? book.member.dob : '',
    },
    scouting: on('scouting') ? book.scouting : [],
    service: on('service') ? book.service : [],
    awards: on('awards') ? book.awards : [],
    expeditions: on('expeditions') ? book.expeditions : [],
    additional: on('additional') ? book.additional : [],
    renewals: on('renewals') ? book.renewals : [],
    progress: on('training') ? book.progress : {},
    badges: on('training') ? book.badges : {},
    holderSignature: on('signatures') ? book.holderSignature : null,
    endorsement: on('signatures') ? book.endorsement : null,
    group: on('group'),
    contact: on('contact'),
    signatures: on('signatures'),
    training: on('training'),
  };
  if (!on('group')) {
    snapshot.member.sponsoringAuthority = '';
    snapshot.member.groupAddress = '';
    snapshot.member.gsl = '';
    snapshot.member.meetingPlace = '';
  }
  return snapshot;
}

export function shareUrlOf(id) {
  return `${window.location.origin}/v/${id}`;
}

// ------------------------------------------------- ROVERBADGE 互通（雙向）

export function exportForRoverBadge(book, troopId = '') {
  const ymis = book.member.ymis || '';
  const progress = {};
  Object.entries(book.progress || {}).forEach(([itemId, state]) => {
    if (state?.date) progress[itemId] = state.date;
  });
  const payload = {
    info: 'ROVERBOOK 匯出 · 可直接餵給 ROVERBADGE（progress_mock 格式）',
    troopId,
    exportedAt: new Date().toISOString(),
    members: [
      {
        ymis,
        name: book.member.nameZh,
        role: 'member',
        joinDate: book.member.dateJoined || '',
        crew: book.member.crew,
        group: book.member.group,
      },
    ],
    progress: { [ymis]: progress },
    progress_mock: { 說明: 'ROVERBOOK 匯出進度', [ymis]: progress },
    badges: Object.fromEntries(
      Object.entries(book.badges || {})
        .filter(([, v]) => v?.date)
        .map(([k, v]) => [k, v.date]),
    ),
    source: 'ROVERBOOK',
    schema: 'roverbadge.progress.v1',
  };
  return payload;
}

// 接受 ROVERBADGE 的 members/progress_mock，或單純的 {itemId: date} 進度表
export function importFromRoverBadge(json, book) {
  if (!json || typeof json !== 'object') throw new Error('檔案格式不正確');
  const member = { ...book.member };
  let progressMap = null;
  let matchedBy = '檔案';

  const progressCandidates = [json.progress, json.progress_mock].filter((x) => x && typeof x === 'object');
  for (const candidate of progressCandidates) {
    const keys = Object.keys(candidate).filter((k) => k !== '說明');
    const hasItemKeys = keys.some((k) => ITEM_INDEX[k]);
    if (hasItemKeys) {
      progressMap = candidate;
      matchedBy = '直接進度表';
      break;
    }
    const ymis = member.ymis && candidate[member.ymis];
    if (ymis && typeof ymis === 'object') {
      progressMap = ymis;
      matchedBy = `YMIS ${member.ymis}`;
      break;
    }
    const byName = keys.find((k) => {
      const m = Array.isArray(json.members) ? json.members.find((x) => String(x.ymis) === String(k)) : null;
      return m && m.name === member.nameZh;
    });
    if (byName && candidate[byName]) {
      progressMap = candidate[byName];
      matchedBy = `姓名 ${member.nameZh}`;
      break;
    }
    if (keys.length) {
      progressMap = candidate[keys[0]];
      matchedBy = `第一位成員（${keys[0]}）`;
      break;
    }
  }

  if (!progressMap) {
    if (json.progress === undefined && json.progress_mock === undefined) {
      const direct = Object.fromEntries(Object.entries(json).filter(([k, v]) => ITEM_INDEX[k] && typeof v === 'string'));
      if (Object.keys(direct).length) {
        progressMap = direct;
        matchedBy = '直接進度表';
      }
    }
  }
  if (!progressMap) throw new Error('找不到進度資料（需要 progress / progress_mock 或 {項目ID: 日期}）');

  const imported = [];
  const skipped = [];
  Object.entries(progressMap).forEach(([itemId, value]) => {
    if (!ITEM_INDEX[itemId]) {
      skipped.push(itemId);
      return;
    }
    const date = typeof value === 'string' ? value : value?.date || '';
    const existing = book.progress?.[itemId];
    if (existing?.date) return; // 不覆寫本機已有的日期與簽名
    book.progress[itemId] = { date: date || '', source: 'roverbadge' };
    imported.push(itemId);
  });

  // 成員基本資料：只在空白時填入
  const srcMember = Array.isArray(json.members) ? json.members.find((m) => m.ymis === member.ymis) || json.members[0] : null;
  if (srcMember) {
    if (!member.ymis && srcMember.ymis) member.ymis = String(srcMember.ymis);
    if (!member.nameZh && srcMember.name) member.nameZh = srcMember.name;
    if (!member.dateJoined && srcMember.joinDate) member.dateJoined = srcMember.joinDate;
    if (!member.crew && srcMember.crew) member.crew = srcMember.crew;
    if (!member.group && srcMember.group) member.group = srcMember.group;
  }

  return { member, imported: imported.length, skipped, matchedBy };
}

export function progressedCount(book) {
  return Object.values(book.progress || {}).filter((p) => p?.date).length;
}

export const SECTIONS = [
  { id: 'contents', label: '目錄', en: 'Contents', page: '1' },
  { id: 'particulars', label: '個人資料', en: 'Personal Particulars', page: '2' },
  { id: 'group', label: '旅部資料', en: 'Group Information', page: '4' },
  { id: 'scouting', label: '童軍紀錄', en: 'Scouting Experience', page: '5' },
  { id: 'renewals', label: '會員資格', en: 'Renewal of Membership', page: '6' },
  { id: 'service', label: '服務紀錄', en: 'Service Record', page: '7' },
  { id: 'awards', label: '獎章及獎勵', en: 'Awards & Commendations', page: '8' },
  { id: 'training', label: '訓練計劃', en: 'Training Scheme', page: '9' },
  { id: 'expeditions', label: '遠足及海外', en: 'Expeditions & Overseas', page: '15' },
  { id: 'additional', label: '其他經驗', en: 'Additional Experiences', page: '16' },
  { id: 'signatures', label: '簽署及聲明', en: 'Signatures', page: '17' },
  { id: 'appendix', label: '數位附錄', en: 'Digital Appendix', page: '18' },
];

// ------------------------------------------------------------------ 示範資料

const inkSvg = (path, tint = '#1c2b41') =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 80"><path d="${path}" fill="none" stroke="${tint}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  )}`;

const SIG_A = inkSvg(
  'M14 58 C 34 20, 52 14, 58 32 C 63 47, 46 60, 40 47 C 35 36, 54 30, 70 40 C 84 49, 88 60, 104 50 C 118 41, 112 24, 128 28 C 143 32, 132 56, 150 52 C 166 48, 168 30, 184 34 C 198 38, 196 52, 214 44',
);
const SIG_B = inkSvg(
  'M16 54 C 40 30, 50 20, 62 26 C 74 32, 52 52, 44 58 C 38 62, 52 62, 66 50 C 82 36, 92 22, 106 30 C 120 38, 100 58, 116 56 C 132 54, 134 30, 150 32 C 166 34, 156 54, 176 50 C 196 46, 200 30, 224 36',
  '#22324d',
);

const leaderSig = (at) => ({ png: SIG_A, name: '馬啟明', title: '樂行童軍團長 RSL', at });

export function demoBook() {
  const book = newBook({
    member: {
      nameZh: '林卓瑤',
      nameEn: 'Lam Cheuk-yiu',
      memberNo: 'RS-2401',
      ymis: '24010001',
      crew: '九龍第 145 旅樂行童軍團',
      group: '九龍第 145 旅',
      district: '紅磡區',
      region: '九龍地域',
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
    },
    scouting: [
      { id: uid('sco'), unit: '小童軍 Grasshopper Scout', post: '小童軍', highestAward: '金箭章', from: '2015-10', to: '2017-08' },
      { id: uid('sco'), unit: '幼童軍 Cub Scout', post: '六仔隊長', highestAward: '金紫荊章', from: '2017-09', to: '2020-08' },
      { id: uid('sco'), unit: '童軍 Scout', post: '小隊副隊長', highestAward: '童軍標準章', from: '2020-09', to: '2024-08' },
      { id: uid('sco'), unit: '樂行童軍 Rover Scout', post: '團員', highestAward: '樂行童軍肩章', from: '2024-09', to: '' },
    ],
    service: [
      { id: uid('srv'), post: '團秘書 Crew Secretary', from: '2025-01', to: '2025-12', appointedBy: '馬啟明', signature: leaderSig('2025-02-01') },
      { id: uid('srv'), post: '小隊長 Patrol Leader', from: '2025-09', to: '', appointedBy: '馬啟明', signature: null },
      { id: uid('srv'), post: '黃埔長者中心義工', from: '2025-03', to: '', appointedBy: '黃埔宣道會', signature: null },
    ],
    awards: [
      { id: uid('awd'), name: '會員章 Membership Badge', summary: '完成啟導班及三次團活動', date: '2024-12-15', org: '九龍第 145 旅', signature: leaderSig('2024-12-16') },
      { id: uid('awd'), name: '樂行童軍肩章 Rover Scout Epaulettes', summary: '完成啟導項目', date: '2025-06-21', org: '九龍地域', signature: leaderSig('2025-06-22') },
      { id: uid('awd'), name: '地域優秀服務獎', summary: '2025 年度紅磡區長者家居維修服務', date: '2025-11-02', org: '九龍地域', signature: null },
    ],
    expeditions: [
      { id: uid('exp'), period: '2025-12-27 至 2025-12-31', item: '台灣陽明山跨年遠足', description: '五天四夜，與台北市第 12 團交流，完成 32 公里縱走。' },
      { id: uid('exp'), period: '2025-04-18 至 2025-04-19', item: '鳳凰徑第一至三段', description: '大嶼山，負重 12 公斤，兩日一夜露營。' },
    ],
    additional: [
      { id: uid('add'), period: '2025-05', item: '聖約翰急救證書', description: '持有至 2028 年 5 月。' },
    ],
    progress: {},
    badges: {
      L1: { date: '2024-12-15', signature: leaderSig('2024-12-16') },
      L2: { date: '2025-06-21', signature: leaderSig('2025-06-22') },
    },
    renewals: [{ id: uid('rnw'), year: 2026, validUntil: '2026-12-31', signature: leaderSig('2026-01-04') }],
    holderSignature: { png: SIG_B, name: '林卓瑤', title: '持有人', at: '2024-09-08' },
    endorsement: { ...leaderSig('2026-09-20'), validUntil: '2026-12-31' },
    meta: {
      demo: true,
      signLog: [],
      createdAt: '2024-09-08T02:00:00.000Z',
      updatedAt: new Date().toISOString(),
    },
  });

  const fill = (ids, dateList) => {
    ids.forEach((id, i) => {
      const sig = leaderSig(dateList[i] || '2026-09-20');
      book.progress[id] = { date: dateList[i] || '2026-09-20', signature: sig };
    });
  };

  fill(
    [
      'L1-ACT-01', 'L1-UND-01', 'L1-UND-02', 'L1-UND-03', 'L1-UND-04',
      'L1-ETQ-01', 'L1-ETQ-02', 'L1-ETQ-03', 'L1-ETQ-04', 'L1-ETQ-05', 'L1-ETQ-06',
      'L1-PRM-01', 'L1-CP-01', 'L2-INTRO-01',
    ],
    [
      '2024-10-05', '2024-11-02', '2024-11-02', '2024-11-16', '2024-11-16',
      '2024-11-23', '2024-11-23', '2024-12-01', '2024-12-01', '2024-12-07', '2024-12-07',
      '2024-12-07', '2024-12-14', '2025-05-18',
    ],
  );
  fill(
    ['L3-LEADER-01', 'L3-LEADER-02', 'L3-SCOUT-01', 'L3-SERVICE-01', 'L3-SERVICE-02', 'L3-INTL-01', 'L3-INT-01'],
    ['2025-08-16', '2025-09-20', '2025-10-04', '2025-11-01', '2025-11-15', '2026-01-10', '2026-02-07'],
  );
  book.progress['L3-INT-01'].signature = null;
  book.progress['L4-ALL-01'] = { date: '', note: '待完成' };

  return book;
}
