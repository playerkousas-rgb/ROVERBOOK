// ROVERBOOK — 紀錄冊資料模型（存在瀏覽器本機，毋須登入）
// 與 ROVERBADGE 互通的進度格式：{ [scoutId]: { [itemId]: 'YYYY-MM-DD' } }

import { BADGE_SYLLABUS, SYLLABUS_ITEMS, ITEM_INDEX, TOTAL_ITEMS, SYLLABUS_META } from './syllabus.js';

export { BADGE_SYLLABUS, SYLLABUS_ITEMS, ITEM_INDEX, TOTAL_ITEMS, SYLLABUS_META };

export const STORE_KEY = 'roverbook.book.v3';
export const LEGACY_STORE_KEYS = ['roverbook.book.v2'];
export const SHARE_KEY = 'roverbook.shares.v2';
export const APP_VERSION = 'v2.1.1';

export const uid = (p = 'r') => `${p}_${Math.random().toString(36).slice(2, 9)}`;

export function today() {
  return new Date().toISOString().slice(0, 10);
}

/** 紀錄冊編號 ＝ 童軍成員編號 SCOUT ID（同一個號碼；ROVERBADGE 亦已統一叫 SCOUT ID）。 */
export function scoutId(bookOrMember) {
  const m = bookOrMember?.member || bookOrMember || {};
  return String(m.scoutId || m.memberNo || m.ymis || '').trim();
}

/**
 * 正規化童軍成員編號：相容舊版 YMIS 及 10 位數字前導零對齊。
 * 例如 81420 ⇄ 0000081420。純數字號碼會補足 10 位前導零；
 * 非純數字或空值原樣回傳（trim 後）。
 */
export function normalizeScoutId(id) {
  const raw = String(id === undefined || id === null ? '' : id).trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return raw;
  if (/^\d{1,10}$/.test(digits)) return digits.padStart(10, '0');
  return digits;
}

/** 各處（紀錄冊、成員編號、ROVERBADGE）永遠保持一致，只保留一個真相。 */
export function syncIdentity(member) {
  if (!member) return member;
  const id = scoutId(member);
  if (id) {
    member.scoutId = id;
    member.memberNo = id;
  }
  delete member.ymis; // 舊欄位（v11 之前叫 YMIS）用完即棄
  return member;
}

export function newBook(partial = {}) {
  const now = new Date().toISOString();
  const { member: partialMember, meta: partialMeta, ...rest } = partial;
  const book = {
    version: 2,
    member: {
      nameZh: '',
      nameEn: '',
      scoutId: '',
      memberNo: '',
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
      ...(partialMember || {}),
    },
    scouting: [],
    service: [],
    awards: [],
    expeditions: [],
    additional: [],
    progress: {},
    badges: {},
    renewals: [],
    transfers: [],
    addressChanges: [],
    detailChanges: [],
    pages: {},
    forms: {},
    holderSignature: null,
    endorsement: null,
    ...rest,
    meta: { createdAt: now, updatedAt: now, ...(partialMeta || {}) },
  };
  syncIdentity(book.member);
  return book;
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

/**
 * 收集本機已填日期但尚未獲 ROVERBADGE 核實的項目，供送交「待領袖核實」使用。
 * @param {object} book 本機紀錄冊
 * @param {string[]} remoteConfirmed ROVERBADGE 端已核實的項目代號（不會重複送交）
 * @param {string[]} remotePendingIds ROVERBADGE 端已處於待批（pending）的項目代號（不會重複送交）
 * @returns {{ pendingRequests: {itemId:string, date:string}[], count: number }}
 */
export function collectPendingForRoverBadge(book, remoteConfirmed = [], remotePendingIds = []) {
  const confirmedSet = new Set((remoteConfirmed || []).map((x) => String(x)));
  const pendingSet = new Set((remotePendingIds || []).map((x) => String(x)));
  const pendingRequests = [];
  Object.entries(book.progress || {}).forEach(([itemId, state]) => {
    if (!state || !state.date) return; // 只有填了日期的才送交
    if (confirmedSet.has(itemId)) return; // 已在 BADGE 核實，毋須再送
    if (pendingSet.has(itemId)) return; // 已在 BADGE 待批，避免重複
    pendingRequests.push({ itemId, date: state.date });
  });
  return { pendingRequests, count: pendingRequests.length };
}

/**
 * 匯出供 ROVERBADGE 使用的進度檔（離線輔助）。
 * 鐵律：只輸出「待領袖核實」進度，零個人資料，不含已核實 progress，
 * 防止成員把自填檔案偽裝成已核實進度倒灌回 ROVERBADGE。
 * schema: 'roverbadge.pending.v1' / status: 'pending' / confirmed: false
 */
export function exportForRoverBadge(book, troopId = '') {
  const sid = normalizeScoutId(scoutId(book.member));
  const { pendingRequests } = collectPendingForRoverBadge(book);
  const payload = {
    info: 'ROVERBOOK 匯出 · 待領袖核實進度（僅本人項目＋日期，零個人資料）',
    troopId,
    scoutId: sid,
    exportedAt: new Date().toISOString(),
    schema: 'roverbadge.pending.v1',
    status: 'pending',
    confirmed: false,
    progress: {}, // 不含已核實 progress，避免自填被當成已核實
    pendingRequests,
    badges: Object.fromEntries(
      Object.entries(book.badges || {})
        .filter(([, v]) => v?.date)
        .map(([k, v]) => [k, v.date]),
    ),
    source: 'ROVERBOOK',
  };
  return payload;
}

/**
 * 從 ROVERBADGE 錄入進度進本機紀錄冊（僅讀方向，BADGE → BOOK）。
 * 鐵律：
 *  - 零個人資料：不讀取／不寫入 json.members 的姓名、團籍、入團日期等；
 *  - 只以 SCOUT ID（normalizeScoutId 對齊）及項目代號配對；
 *  - 無條件相信領袖已核實的 progress / flatProgress / otherBadges，標記 confirmedByBadge；
 *  - 未核實（pending / confirmed: false）一律略過，回傳 skippedPending 數量；
 *  - 保留本機既有的手寫簽名墨跡 signature，不覆寫本機已有日期；
 *  - 移除「找不到 sid fallback 到第一位成員」及「按中文姓名配對」的危險邏輯；
 *  - 本機空白簿尚未填 SCOUT ID 時，只在匯入單一本人資料（如雲端登入本人 ymis）
 *    時自動綁定該 SCOUT ID。
 */
export function importFromRoverBadge(json, book) {
  if (!json || typeof json !== 'object') throw new Error('檔案格式不正確');
  const member = { ...book.member };
  const localSid = normalizeScoutId(scoutId(member));
  let progressMap = null;
  let matchedBy = '檔案';
  let sourceSid = null; // 從檔案偵測到的單一成員編號（僅供空白簿自動綁定）

  // 組裝可能的進度容器：json.progress / json.progress_mock，或直接的 {itemId: date} 頂層表
  const candidates = [];
  if (json.progress && typeof json.progress === 'object') candidates.push(json.progress);
  if (json.progress_mock && typeof json.progress_mock === 'object') candidates.push(json.progress_mock);
  const direct = Object.fromEntries(
    Object.entries(json).filter(([k, v]) => ITEM_INDEX[k] && typeof v === 'string'),
  );
  if (Object.keys(direct).length) candidates.push(direct);

  for (const candidate of candidates) {
    const keys = Object.keys(candidate).filter((k) => k !== '說明');
    const hasItemKeys = keys.some((k) => ITEM_INDEX[k]);

    // 直接進度表 {itemId: date}
    if (hasItemKeys) {
      progressMap = candidate;
      matchedBy = '直接進度表';
      break;
    }

    // 以本機 SCOUT ID 配對（有綁定編號時）
    if (localSid && candidate[localSid] && typeof candidate[localSid] === 'object') {
      progressMap = candidate[localSid];
      matchedBy = `SCOUT ID ${localSid}`;
      sourceSid = localSid;
      break;
    }

    // 空白簿（未綁定 SCOUT ID）：偵測單一成員容器，自動綁定該編號
    if (!localSid && keys.length === 1) {
      const onlyKey = keys[0];
      const val = candidate[onlyKey];
      if (val && typeof val === 'object' && Object.keys(val).some((k) => ITEM_INDEX[k])) {
        progressMap = val;
        matchedBy = `SCOUT ID ${onlyKey}`;
        sourceSid = normalizeScoutId(onlyKey);
        break;
      }
    }
  }

  if (!progressMap) {
    if (Object.keys(direct).length) {
      progressMap = direct;
      matchedBy = '直接進度表';
    } else {
      throw new Error('找不到進度資料（需要 progress / progress_mock 或 {項目ID: 日期}）');
    }
  }

  const imported = [];
  const skipped = [];
  const skippedPending = [];
  Object.entries(progressMap).forEach(([itemId, value]) => {
    if (!ITEM_INDEX[itemId]) {
      skipped.push(itemId);
      return;
    }
    const entry = typeof value === 'string' ? { date: value } : value || {};
    const date = entry.date || '';
    // 未核實（pending / confirmed: false / confirmedByBadge: false）一律拒絕錄入
    if (entry.status === 'pending' || entry.confirmed === false || entry.confirmedByBadge === false) {
      skippedPending.push(itemId);
      return;
    }
    const existing = book.progress?.[itemId];
    // 寫入／更新已核實進度：標記 confirmedByBadge、更新核實日期與核實人，
    // 但保留本機既有的手寫簽名墨跡 signature 與審核員
    book.progress[itemId] = {
      ...(existing || {}),
      date: date || existing?.date || '',
      source: 'roverbadge',
      confirmedByBadge: true,
      confirmedAt: entry.confirmedAt || new Date().toISOString(),
      confirmedBy: entry.confirmedBy || 'ROVERBADGE',
      signature: existing ? existing.signature : null,
      assessor: existing ? existing.assessor : undefined,
    };
    imported.push(itemId);
  });

  // Zero PII：絕不從 json.members 抄寫姓名、團籍、入團日期等個人資料。
  // 僅在本機空白簿且無 SCOUT ID 時，自動綁定單一來源的 SCOUT ID。
  if (!scoutId(member) && sourceSid) {
    member.scoutId = sourceSid;
    member.memberNo = sourceSid;
  }

  return {
    member,
    imported: imported.length,
    skipped,
    skippedPending,
    matchedBy,
  };
}

export function progressedCount(book) {
  return Object.values(book.progress || {}).filter((p) => p?.date).length;
}

// 逐頁對應《Rover Scout Record Book (v 20260727).pdf》第 1–41 頁。
// page = 紙本頁碼（封面為 1，內頁由 2 開始）。
export const SECTIONS = [
  { id: 'cover', label: '封面', en: 'Cover', page: 1 },
  { id: 'contents', label: '目錄', en: 'Contents', page: '—', digital: true },
  { id: 'colophon', label: '出版資料', en: 'Publication', page: 2 },
  { id: 'particulars-1', label: '個人資料', en: 'Personal Particulars', page: 3 },
  { id: 'particulars-2', label: '個人資料（續）', en: 'Personal Particulars', page: 4 },
  { id: 'group', label: '旅部資料', en: 'Group Information', page: 5 },
  { id: 'scouting', label: '童軍紀錄', en: 'Scouting Experience', page: 6 },
  { id: 'changes', label: '轉旅 · 遷移地址 · 更改摘要', en: 'Transfer / Change of Address', page: 7 },
  { id: 'renewals-1', label: '會員資格', en: 'Renewal of Membership', page: 8 },
  { id: 'renewals-2', label: '會員資格（續）', en: 'Renewal of Membership', page: 9 },
  { id: 'service-awards', label: '服務紀錄 · 獎章及獎勵', en: 'Service Record / Awards', page: 10 },
  { id: 'scheme', label: '訓練綱要', en: 'Training Scheme', page: 11 },
  { id: 'plan', label: '樂行童軍訓練計劃', en: 'Rover Scout Training Scheme', page: 12 },
  { id: 'mb-intro', label: '會員章', en: 'Membership Badge', page: 13, badge: 'L1' },
  { id: 'mb-activities', label: '會員章 (1) 活動', en: 'Activities', page: 14, badge: 'L1' },
  { id: 'mb-understanding', label: '會員章 (2) 理解 · (3) 禮節', en: 'Understanding / Ceremonial', page: 15, badge: 'L1' },
  { id: 'mb-commitment', label: '會員章 (4) 許諾 · (5) 保護童軍成員', en: 'Commitment / Safe From Harm', page: 16, badge: 'L1' },
  { id: 'mb-presented', label: '會員章頒發', en: 'Membership Badge · Presented', page: 17, badge: 'L1' },
  { id: 'ep-intro', label: '樂行童軍肩章', en: 'Rover Scout Epaulettes', page: 18, badge: 'L2' },
  { id: 'ep-presented', label: '樂行童軍肩章頒發', en: 'Epaulettes · Presented', page: 19, badge: 'L2' },
  { id: 'rsa-intro', label: '樂行童軍獎章及貝登堡獎章簡介', en: 'Award Introduction', page: 20, badge: 'L3' },
  { id: 'rsa-awards', label: '樂行童軍獎章 · 貝登堡獎章', en: 'Awards', page: 21, badge: 'L3' },
  { id: 'dedication', label: '(1) 準領袖培訓', en: 'Dedication', page: 22, badge: 'L3' },
  { id: 'scoutcraft', label: '(2) 童軍技能', en: 'Scoutcraft', page: 23, badge: 'L3' },
  { id: 'volunteerism', label: '(3) 服務', en: 'Volunteerism', page: 24, badge: 'L3' },
  { id: 'global-vision', label: '(4) 國際視野', en: 'Global Vision', page: 25, badge: 'L3' },
  { id: 'tenacity', label: '(5) 興趣及技能', en: 'Tenacity', page: 26, badge: 'L3' },
  { id: 'wellness-1', label: '(6) 身心健康（一）', en: 'Mental and Physical Wellness', page: 27, badge: 'L3' },
  { id: 'wellness-2', label: '(6) 身心健康（二）', en: 'Mental and Physical Wellness', page: 28, badge: 'L3' },
  { id: 'intrepidity', label: '(7) 挑戰', en: 'Intrepidity', page: 29, badge: 'L3' },
  { id: 'rsa-presented', label: '樂行童軍獎章頒發', en: 'Rover Scout Award · Presented', page: 30, badge: 'L3' },
  { id: 'interview-district', label: '貝登堡獎章申請前會面（一）', en: 'Interview · District', page: 31, badge: 'L4' },
  { id: 'interview-region', label: '貝登堡獎章申請前會面（二）', en: 'Interview · Region', page: 32, badge: 'L4' },
  { id: 'bpa-presented', label: '貝登堡獎章頒發', en: 'Baden-Powell Award · Presented', page: 33, badge: 'L4' },
  { id: 'wosm', label: '世界童軍組織獎章', en: 'Badges from the WOSM', page: 34 },
  { id: 'other-badges-1', label: '其他獎章', en: 'Other Badges', page: 35 },
  { id: 'other-badges-2', label: '其他獎章（續）', en: 'Other Badges', page: 36 },
  { id: 'additional-1', label: '其他經驗', en: 'Additional Experiences', page: 37 },
  { id: 'additional-2', label: '其他經驗（續）', en: 'Additional Experiences', page: 38 },
  { id: 'expeditions-1', label: '遠足及海外活動', en: 'Expeditions and Overseas Activities', page: 39 },
  { id: 'expeditions-2', label: '遠足及海外活動（續）', en: 'Expeditions and Overseas Activities', page: 40 },
  { id: 'uniform', label: '樂行童軍制服', en: 'Rover Scout Uniform', page: 41 },
  { id: 'promise', label: '童軍誓詞與規律', en: 'Scout Promise and Law', page: 42 },
  { id: 'crest', label: '徽章圖', en: 'Emblem', page: 43 },
  { id: 'appendix', label: '數位附錄', en: 'Digital Appendix', page: '—', digital: true },
];

export const SCOUTING_UNITS = [
  { key: 'grasshopper', label: '小童軍', en: 'Grasshopper Scout' },
  { key: 'cub', label: '幼童軍', en: 'Cub Scout' },
  { key: 'scout', label: '童軍', en: 'Scout' },
  { key: 'venture', label: '深資童軍', en: 'Venture Scout' },
  { key: 'instructor', label: '教練員', en: 'Instructor' },
  { key: 'leader', label: '領袖', en: 'Leader' },
];

export const PAGE_TOTAL = 43;
export const PRINT_PAGES = SECTIONS.filter((s) => !s.digital);

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

  const leaderSig = (at) => ({ png: SIG_A, name: '馬啟明', title: '', at });

export function demoBook() {
  const book = newBook({
    member: {
      nameZh: '林卓瑤',
      nameEn: 'Lam Cheuk-yiu',
      scoutId: '24010001',
      crew: '九龍第 145 旅樂行童軍團',
      group: '九龍第 145 旅',
      district: '九龍城',
      region: '九龍',
      issueDate: '2024-09-08',
      dob: '2003-05-14',
      placeOfBirth: '香港',
      phone: '9876 5432',
      email: 'cy.lam@example.org',
      address: '九龍紅磡黃埔花園 5 座 12A',
      bloodType: 'O+',
      emergencyName: '林美珍',
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
      { id: uid('sco'), unit: 'grasshopper', post: '小童軍', highestAward: '金箭章', from: '2015-10', to: '2017-08' },
      { id: uid('sco'), unit: 'cub', post: '六仔隊長', highestAward: '金紫荊章', from: '2017-09', to: '2020-08' },
      { id: uid('sco'), unit: 'scout', post: '小隊副隊長', highestAward: '童軍標準章', from: '2020-09', to: '2022-08' },
      { id: uid('sco'), unit: 'venture', post: '副主席', highestAward: '深資童軍獎章', from: '2022-09', to: '2024-08' },
      { id: uid('sco'), unit: 'leader', post: '小隊教練', highestAward: '—', from: '2025-01', to: '2025-08' },
      { id: uid('sco'), unit: 'instructor', post: '小隊教練', highestAward: '—', from: '2025-09', to: '' },
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
    renewals: [
      { id: uid('rnw'), year: 2025, validUntil: '2025-12-31', signature: leaderSig('2025-01-11') },
      { id: uid('rnw'), year: 2026, validUntil: '2026-12-31', signature: leaderSig('2026-01-04') },
    ],
    pages: {
      'mb-activities': {
        rows: [
          { id: uid('act'), date: '2024-09-21', place: '黃埔社區中心', summary: '迎新營火晚會', certifiedBy: '馬啟明' },
          { id: uid('act'), date: '2024-10-05', place: '大埔滘', summary: '夜行訓練（戶外活動）', certifiedBy: '馬啟明' },
          { id: uid('act'), date: '2024-10-19', place: '西貢', summary: '獨木舟體驗（海上活動）', certifiedBy: '陳詠詩' },
        ],
      },
      'mb-presented': { presentedOn: '2024-12-15', place: '旅部週年大會', by: '馬啟明', comment: '會員章已完成' },
      'ep-presented': { presentedOn: '2025-06-21', place: '九龍地域樂行童軍大會', by: '何志強' },
      'mb-commitment': { investiture: '2024-12-15' },
      'mb-understanding': {},
      dedication: { comment: '木章第一、二階段已完成，在職輔導至 2026 年 3 月。', assessor: '馬啟明', post: '樂行童軍團長', date: '2025-11-20' },
      scoutcraft: { traditional: 'expedition', course1: '領袖遠足訓練班', course2: '教練員訓練班' },
      volunteerism: { summary: '黃埔長者中心家居維修服務，全年 12 次。' },
      'global-vision': { selected: 'exchange', activity: '台北市第 12 團交流', duration: '2025-12-27 至 2025-12-31', summary: '五日四夜交流，與當地樂行童軍合作完成社區服務。' },
      tenacity: { activity: '攝影', duration: '2025-01 至 2025-12', summary: '完成 52 小時攝影課程及社區展覽。' },
      'wellness-1': { certs: [{ id: uid('cert'), item: 'SOUL Keeper 精神健康守護者計劃', cert: 'SK-2025-0117', hours: '30', date: '2025-05-10' }], serviceHours: '22', summary: '於學校分享精神健康訊息 3 次。' },
      'wellness-2': { activity: '長跑', hours: '52', summary: '全年每週兩課，完成半馬。' },
      intrepidity: { selected: 'wilderness', activity: '鳳凰徑全走', duration: '2026-01-02 至 2026-01-04', summary: '3 日 2 夜，與 4 位團員完成 70 公里。' },
      'rsa-presented': { presentedOn: '2026-03-14', place: '九龍地域總部', by: '陳國強' },
      'interview-district': { comment: '表現成熟，對樂行童軍支部有清晰認識。', name: '梁淑儀', unit: '紅磡區', date: '2026-05-09' },
      'interview-region': { comment: '推薦申請貝登堡獎章。', name: '陳國強', unit: '九龍地域', date: '2026-06-13' },
      uniform: { notes: '' },
    },
    holderSignature: { png: SIG_B, name: '林卓瑤', title: '', at: '2024-09-08' },
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
      const date = dateList[i] || '2026-09-20';
      const sig = leaderSig(date);
      const entry = { date, signature: sig };
      if (/^L[34]-/.test(id)) entry.assessor = '馬啟明';
      book.progress[id] = entry;
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
    [
      'L3-LEADER-01', 'L3-LEADER-02',
      'L3-SCOUT-01', 'L3-SCOUT-02', 'L3-SCOUT-03',
      'L3-SERVICE-01', 'L3-SERVICE-02', 'L3-SERVICE-03',
      'L3-INTL-01', 'L3-INTL-02',
      'L3-INT-01',
    ],
    [
      '2025-08-16', '2025-09-20',
      '2025-10-04', '2025-10-18', '2025-10-25',
      '2025-11-01', '2025-11-15', '2025-11-29',
      '2026-01-10', '2026-01-24',
      '2026-02-07',
    ],
  );
  book.progress['L3-SERVICE-01'].cert = 'FA-2025-0042';
  book.progress['L3-INT-01'].signature = null;
  book.progress['L4-ALL-01'] = { date: '', note: '待完成' };

  return book;
}
