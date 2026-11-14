// ROVERBOOK — 紀錄冊資料模型（存在瀏覽器本機，毋須登入）
// 與 ROVERBADGE 互通的進度格式：{ [scoutId]: { [itemId]: 'YYYY-MM-DD' } }

import { BADGE_SYLLABUS, SYLLABUS_ITEMS, ITEM_INDEX, TOTAL_ITEMS, SYLLABUS_META } from './syllabus.js';

export { BADGE_SYLLABUS, SYLLABUS_ITEMS, ITEM_INDEX, TOTAL_ITEMS, SYLLABUS_META };

export const STORE_KEY = 'roverbook.book.v3';
export const LEGACY_STORE_KEYS = ['roverbook.book.v2'];
export const SHARE_KEY = 'roverbook.shares.v2';
export const APP_VERSION = 'v2.2.1';

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
  // 示範資料只供測試，永遠不會產生送往正式系統的待核實項目。
  if (isDemoBook(book)) return { pendingRequests: [], count: 0, demo: true };
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
  if (isDemoBook(book)) {
    throw new Error('示範紀錄冊不可匯出至 ROVERBADGE；請先建立自己的紀錄冊。');
  }
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
  if (isDemoBook(book)) {
    throw new Error('示範紀錄冊不可從 ROVERBADGE 匯入；請先建立自己的紀錄冊。');
  }
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

// 紙本結構（唯一真相）。
// 官方《Rover Scout Record Book (v 20260727)》共 43 個 PDF 頁／43 張紙：
//   * 第 1 張 = 封面，官方不印頁碼，電子版亦不計入印刷頁；
//   * 內頁印刷頁 1–42（PDF 第 2–43 頁），即 PDF 頁碼 = 印刷頁 + 1。
// 因此「封面」page = null；其他紙本頁 page = 1–42；sheet = PDF 張次 1–43。
// 目錄與數位附錄不佔紙本頁。
export const SECTIONS = [
  { id: 'cover', label: '封面', en: 'Cover', page: null, sheet: 1 },
  { id: 'contents', label: '目錄', en: 'Contents', page: '—', sheet: null, digital: true },
  { id: 'colophon', label: '出版資料', en: 'Publication', page: 1, sheet: 2 },
  { id: 'particulars-1', label: '個人資料', en: 'Personal Particulars', page: 2, sheet: 3 },
  { id: 'particulars-2', label: '個人資料（續）', en: 'Personal Particulars', page: 3, sheet: 4 },
  { id: 'group', label: '旅部資料', en: 'Group Information', page: 4, sheet: 5 },
  { id: 'scouting', label: '童軍紀錄', en: 'Scouting Experience', page: 5, sheet: 6 },
  { id: 'changes', label: '轉旅 · 遷移地址 · 更改摘要', en: 'Transfer / Change of Address', page: 6, sheet: 7 },
  { id: 'renewals-1', label: '會員資格', en: 'Renewal of Membership', page: 7, sheet: 8 },
  { id: 'renewals-2', label: '會員資格（續）', en: 'Renewal of Membership', page: 8, sheet: 9 },
  { id: 'service-awards', label: '服務紀錄 · 獎章及獎勵', en: 'Service Record / Awards', page: 9, sheet: 10 },
  { id: 'scheme', label: '訓練綱要', en: 'Training Scheme', page: 10, sheet: 11 },
  { id: 'plan', label: '樂行童軍訓練計劃', en: 'Rover Scout Training Scheme', page: 11, sheet: 12 },
  { id: 'mb-intro', label: '會員章', en: 'Membership Badge', page: 12, sheet: 13, badge: 'L1' },
  { id: 'mb-activities', label: '會員章 (1) 活動', en: 'Activities', page: 13, sheet: 14, badge: 'L1' },
  { id: 'mb-understanding', label: '會員章 (2) 理解 · (3) 禮節', en: 'Understanding / Ceremonial', page: 14, sheet: 15, badge: 'L1' },
  { id: 'mb-commitment', label: '會員章 (4) 許諾 · (5) 保護童軍成員', en: 'Commitment / Safe From Harm', page: 15, sheet: 16, badge: 'L1' },
  { id: 'mb-presented', label: '會員章頒發', en: 'Membership Badge · Presented', page: 16, sheet: 17, badge: 'L1' },
  { id: 'ep-intro', label: '樂行童軍肩章', en: 'Rover Scout Epaulettes', page: 17, sheet: 18, badge: 'L2' },
  { id: 'ep-presented', label: '樂行童軍肩章頒發', en: 'Epaulettes · Presented', page: 18, sheet: 19, badge: 'L2' },
  { id: 'rsa-intro', label: '樂行童軍獎章及貝登堡獎章簡介', en: 'Award Introduction', page: 19, sheet: 20, badge: 'L3' },
  { id: 'rsa-awards', label: '樂行童軍獎章 · 貝登堡獎章', en: 'Awards', page: 20, sheet: 21, badge: 'L3' },
  { id: 'dedication', label: '(1) 準領袖培訓', en: 'Dedication', page: 21, sheet: 22, badge: 'L3' },
  { id: 'scoutcraft', label: '(2) 童軍技能', en: 'Scoutcraft', page: 22, sheet: 23, badge: 'L3' },
  { id: 'volunteerism', label: '(3) 服務', en: 'Volunteerism', page: 23, sheet: 24, badge: 'L3' },
  { id: 'global-vision', label: '(4) 國際視野', en: 'Global Vision', page: 24, sheet: 25, badge: 'L3' },
  { id: 'tenacity', label: '(5) 興趣及技能', en: 'Tenacity', page: 25, sheet: 26, badge: 'L3' },
  { id: 'wellness-1', label: '(6) 身心健康（一）', en: 'Mental and Physical Wellness', page: 26, sheet: 27, badge: 'L3' },
  { id: 'wellness-2', label: '(6) 身心健康（二）', en: 'Mental and Physical Wellness', page: 27, sheet: 28, badge: 'L3' },
  { id: 'intrepidity', label: '(7) 挑戰', en: 'Intrepidity', page: 28, sheet: 29, badge: 'L3' },
  { id: 'rsa-presented', label: '樂行童軍獎章頒發', en: 'Rover Scout Award · Presented', page: 29, sheet: 30, badge: 'L3' },
  { id: 'interview-district', label: '貝登堡獎章申請前會面（一）', en: 'Interview · District', page: 30, sheet: 31, badge: 'L4' },
  { id: 'interview-region', label: '貝登堡獎章申請前會面（二）', en: 'Interview · Region', page: 31, sheet: 32, badge: 'L4' },
  { id: 'bpa-presented', label: '貝登堡獎章頒發', en: 'Baden-Powell Award · Presented', page: 32, sheet: 33, badge: 'L4' },
  { id: 'wosm', label: '世界童軍組織獎章', en: 'Badges from the WOSM', page: 33, sheet: 34 },
  { id: 'other-badges-1', label: '其他獎章', en: 'Other Badges', page: 34, sheet: 35 },
  { id: 'other-badges-2', label: '其他獎章（續）', en: 'Other Badges', page: 35, sheet: 36 },
  { id: 'additional-1', label: '其他經驗', en: 'Additional Experiences', page: 36, sheet: 37 },
  { id: 'additional-2', label: '其他經驗（續）', en: 'Additional Experiences', page: 37, sheet: 38 },
  { id: 'expeditions-1', label: '遠足及海外活動', en: 'Expeditions and Overseas Activities', page: 38, sheet: 39 },
  { id: 'expeditions-2', label: '遠足及海外活動（續）', en: 'Expeditions and Overseas Activities', page: 39, sheet: 40 },
  { id: 'uniform', label: '樂行童軍制服', en: 'Rover Scout Uniform', page: 40, sheet: 41 },
  { id: 'promise', label: '童軍誓詞與規律', en: 'Scout Promise and Law', page: 41, sheet: 42 },
  { id: 'crest', label: '徽章圖', en: 'Emblem', page: 42, sheet: 43 },
  { id: 'appendix', label: '數位附錄', en: 'Digital Appendix', page: '—', sheet: null, digital: true },
];

export const SCOUTING_UNITS = [
  { key: 'grasshopper', label: '小童軍', en: 'Grasshopper Scout' },
  { key: 'cub', label: '幼童軍', en: 'Cub Scout' },
  { key: 'scout', label: '童軍', en: 'Scout' },
  { key: 'venture', label: '深資童軍', en: 'Venture Scout' },
  { key: 'instructor', label: '教練員', en: 'Instructor' },
  { key: 'leader', label: '領袖', en: 'Leader' },
];

/** 已印刷頁碼的內頁數（封面不計頁碼）。 */
export const PAGE_TOTAL = SECTIONS.filter((s) => typeof s.page === 'number').length; // 42
/** 實際列印張數 = 封面 + 內頁。 */
export const SHEET_TOTAL = SECTIONS.filter((s) => !s.digital).length; // 43
export const PRINT_PAGES = SECTIONS.filter((s) => !s.digital);

/** 紙本行數（照官方 PDF 量度；不得自行加減）。 */
export const PAGE_ROWS = {
  transfers: 3,
  addressChanges: 5,
  detailChanges: 3,
  renewals: [5, 6], // 第 7 頁 5 行、第 8 頁 6 行 = 官方 11 行
  service: 6,
  awards: 3,
  activities: 4,
  wellnessCerts: 4,
  badges: 9,
  additional: 11,
  expeditions: 12,
};

/** 示範紀錄冊：只供測試，禁止與正式系統同步。 */
export function isDemoBook(book) {
  return book?.meta?.demo === true;
}

// ------------------------------------------------------------------ 示範資料

const inkSvg = (path, tint = '#1c2b41') =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 80"><path d="${path}" fill="none" stroke="${tint}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  )}`;

/* 示範用「墨跡」：抽象線條，不是任何真人簽名。 */
const SIG_A = inkSvg(
  'M14 58 C 34 20, 52 14, 58 32 C 63 47, 46 60, 40 47 C 35 36, 54 30, 70 40 C 84 49, 88 60, 104 50 C 118 41, 112 24, 128 28 C 143 32, 132 56, 150 52 C 166 48, 168 30, 184 34 C 198 38, 196 52, 214 44',
);
const SIG_B = inkSvg(
  'M16 54 C 40 30, 50 20, 62 26 C 74 32, 52 52, 44 58 C 38 62, 52 62, 66 50 C 82 36, 92 22, 106 30 C 120 38, 100 58, 116 56 C 132 54, 134 30, 150 32 C 166 34, 156 54, 176 50 C 196 46, 200 30, 224 36',
  '#22324d',
);

const DEMO = {
  nameZh: '陳大文',
  nameEn: 'Chan Tai-man',
  scoutId: '0000000000',
  crew: '示範第 001 旅樂行童軍團',
  group: '示範第 001 旅',
  district: '九龍城',
  region: '九龍',
  issueDate: '2024-09-08',
  dob: '2004-03-18',
  gender: '男 Male',
  placeOfBirth: '香港',
  phone: '0000 0000',
  email: 'demo@example.org',
  address: '九龍紅磡示範路 1 號示範大廈 1 樓 A 室',
  addressEn: 'Flat A, 1/F, 1 Demo Road, Hung Hom, Kowloon',
  bloodType: 'O+',
  emergencyName: '陳小文（示範）',
  emergencyPhone: '0000 0000',
  sponsoringAuthority: '示範機構',
  groupAddress: '九龍紅磡示範路 1 號',
  gsl: '示範旅長',
  rsl: '示範團長',
  meetingPlace: '示範社區中心禮堂',
  dateJoined: '2024-09-01',
  dateScoutMovement: '2016-10-02',
};

/* 示範簽署：只顯示職位，不冒用任何真人姓名。 */
const demoSig = (role, at, png = SIG_A) => ({ png, name: role, title: role, at, demo: true });
const leaderSig = (at) => demoSig('示範團長', at);
const assessorSig = (at) => demoSig('示範審核員', at);

export function demoBook() {
  const book = newBook({
    member: { ...DEMO },
    scouting: [
      { id: uid('sco'), unit: 'grasshopper', post: '小童軍', highestAward: '金箭章（示範）', from: '2016-10', to: '2018-08' },
      { id: uid('sco'), unit: 'cub', post: '六仔隊長', highestAward: '金紫荊章（示範）', from: '2018-09', to: '2021-08' },
      { id: uid('sco'), unit: 'scout', post: '小隊副隊長', highestAward: '童軍標準章（示範）', from: '2021-09', to: '2023-08' },
      { id: uid('sco'), unit: 'venture', post: '副主席', highestAward: '深資童軍獎章（示範）', from: '2023-09', to: '2024-08' },
      { id: uid('sco'), unit: 'instructor', post: '小隊教練', highestAward: '—', from: '2024-09', to: '2025-08' },
      { id: uid('sco'), unit: 'leader', post: '小隊教練', highestAward: '—', from: '2025-09', to: '' },
    ],
    service: [
      { id: uid('srv'), post: '團秘書 Crew Secretary', from: '2025-01', to: '2025-12', appointedBy: '示範團長', signature: leaderSig('2025-02-01') },
      { id: uid('srv'), post: '小隊長 Patrol Leader', from: '2025-09', to: '', appointedBy: '示範團長', signature: null },
      { id: uid('srv'), post: '示範社區中心義工', from: '2025-03', to: '', appointedBy: '示範機構', signature: null },
    ],
    awards: [
      { id: uid('awd'), name: '會員章 Membership Badge（示範）', summary: '完成啟導班及三次團活動（示範）', date: '2024-12-15', org: '示範第 001 旅', signature: leaderSig('2024-12-16') },
      { id: uid('awd'), name: '樂行童軍肩章 Rover Scout Epaulettes（示範）', summary: '完成啟導項目（示範）', date: '2025-06-21', org: '九龍地域', signature: leaderSig('2025-06-22') },
      { id: uid('awd'), name: '示範地域優秀服務獎', summary: '2025 年度示範長者家居維修服務', date: '2025-11-02', org: '九龍地域', signature: null },
    ],
    expeditions: [
      { id: uid('exp'), period: '2025-12-27 至 2025-12-31', item: '示範台北交流團（示範）', description: '五天四夜，與示範童軍團交流，完成 32 公里縱走（示範資料）。' },
      { id: uid('exp'), period: '2026-04-04 至 2026-04-06', item: '示範三日兩夜遠足考驗（示範）', description: '西貢示範路線，3 日 2 夜，完成兩項事工（示範資料）。' },
    ],
    additional: [
      { id: uid('add'), period: '2026-03', item: '示範急救證書', description: '示範證書編號 DEMO-FA-0001，持有至 2028 年 3 月（示範資料）。' },
    ],
    progress: {},
    badges: {
      L1: { date: '2024-12-15', signature: leaderSig('2024-12-16') },
      L2: { date: '2025-06-21', signature: leaderSig('2025-06-22') },
      L3: { date: '2026-05-16', signature: leaderSig('2026-05-17') },
      // L4 貝登堡獎章尚未頒發：示範資料停留在「最高獎章申請」狀態。
    },
    renewals: [
      { id: uid('rnw'), year: 2025, validUntil: '2025-12-31', signature: leaderSig('2025-01-11') },
      { id: uid('rnw'), year: 2026, validUntil: '2026-12-31', signature: leaderSig('2026-01-04') },
    ],
    transfers: [{ id: uid('trf'), date: '2024-09-01', groupNo: '示範第 001 旅' }],
    addressChanges: [
      {
        id: uid('adr'),
        date: '2025-08-15',
        address: '九龍紅磡示範路 1 號示範大廈 1 樓 A 室（示範）',
      },
    ],
    detailChanges: [
      { id: uid('chg'), date: '2025-02-01', item: '電話', content: '0000 0000（示範）' },
    ],
    pages: {
      'mb-activities': {
        rows: [
          { id: uid('act'), date: '2024-09-21', place: '示範社區中心', summary: '迎新營火晚會（示範）', certifiedBy: '示範團長' },
          { id: uid('act'), date: '2024-10-05', place: '大埔滘', summary: '夜行訓練（戶外活動・示範）', certifiedBy: '示範團長' },
          { id: uid('act'), date: '2024-10-19', place: '西貢', summary: '獨木舟體驗（海上活動・示範）', certifiedBy: '示範審核員' },
          { id: uid('act'), date: '', place: '', summary: '', certifiedBy: '' },
        ],
      },
      'mb-presented': {
        presentedOn: '2024-12-15',
        place: '示範旅部週年大會',
        by: '示範主席',
        chair: demoSig('示範主席', '2024-12-15', SIG_B),
        sig: leaderSig('2024-12-15'),
        comment: '會員章已完成（示範）',
      },
      'mb-commitment': { investiture: '2024-12-15', rsl: leaderSig('2024-12-15') },
      'ep-intro': { chair: demoSig('示範主席', '2025-06-21', SIG_B) },
      'ep-presented': { presentedOn: '2025-06-21', place: '九龍地域樂行童軍大會（示範）', by: '示範總監', sig: leaderSig('2025-06-21') },
      dedication: {
        comment: '木章第一、二階段已完成，在職輔導至 2026 年 3 月（示範）。',
        sig: assessorSig('2026-02-01'),
        post: '示範審核員',
        date: '2026-02-01',
      },
      scoutcraft: {
        traditional: 'expedition',
        course1: '示範領袖遠足訓練班',
        cert1: 'DEMO-EXP-0001',
        date1: '2025-10-04',
        course2: '示範教練員訓練班',
        cert2: 'DEMO-INS-0001',
        date2: '2025-10-18',
        comment: '技能及教學法達標（示範）。',
        sig: assessorSig('2025-10-18'),
        post: '示範審核員',
        date: '2025-10-18',
      },
      volunteerism: {
        summary: '示範社區中心家居維修服務，全年 12 次（示範）。',
        comment: '服務態度良好（示範）。',
        sig: assessorSig('2025-11-29'),
        post: '示範審核員',
        date: '2025-11-29',
      },
      'global-vision': {
        selected: 'exchange',
        activity: '示範台北交流團（示範）',
        duration: '2025-12-27 至 2025-12-31',
        summary: '五日四夜交流，與當地示範樂行童軍合作完成社區服務（示範）。',
        comment: '具國際視野（示範）。',
        sig: assessorSig('2026-01-24'),
        post: '示範審核員',
        date: '2026-01-24',
      },
      tenacity: {
        activity: '攝影',
        duration: '2025-01 至 2025-12',
        summary: '完成 52 小時攝影課程及社區展覽（示範）。',
        comment: '持續進步（示範）。',
        sig: assessorSig('2026-02-07'),
        post: '示範審核員',
        date: '2026-02-07',
      },
      'wellness-1': {
        certs: [
          { id: uid('cert'), item: 'SOUL Keeper 精神健康守護者計劃（示範）', cert: 'DEMO-SK-0001', hours: '30', date: '2026-02-21' },
          { id: uid('cert'), item: '', cert: '', hours: '', date: '' },
          { id: uid('cert'), item: '', cert: '', hours: '', date: '' },
          { id: uid('cert'), item: '', cert: '', hours: '', date: '' },
        ],
        serviceHours: '22',
        summary: '於學校分享精神健康訊息 3 次（示範）。',
        comment: '課程及服務時數達標（示範）。',
        sig: assessorSig('2026-02-21'),
        post: '示範審核員',
        date: '2026-02-21',
      },
      'wellness-2': {
        activity: '長跑',
        hours: '52',
        summary: '全年每週兩課，完成半馬（示範）。',
        comment: '體能持續進步（示範）。',
        sig: assessorSig('2026-03-07'),
        post: '示範審核員',
        date: '2026-03-07',
      },
      intrepidity: {
        selected: 'wilderness',
        activity: '示範三日兩夜遠足考驗（示範）',
        duration: '2026-04-04 至 2026-04-06',
        summary: '3 日 2 夜，與 4 位團員完成 70 公里及兩項事工（示範）。',
        comment: '團隊合作及領導表現良好（示範）。',
        sig: assessorSig('2026-04-18'),
        post: '示範遠足審核員',
        date: '2026-04-18',
      },
      'rsa-presented': {
        presentedOn: '2026-05-16',
        place: '九龍地域總部（示範）',
        by: '示範總監',
        certNo: 'DEMO-RSA-0001',
        sig: leaderSig('2026-05-16'),
      },
      'interview-district': {
        comment: '表現成熟，對樂行童軍支部有清晰認識（示範）。',
        name: '示範區總監',
        unit: '九龍城區',
        date: '2026-06-13',
      },
      'interview-region': {
        comment: '推薦申請貝登堡獎章（示範）。',
        name: '示範地域總監',
        unit: '九龍地域',
        date: '2026-07-11',
      },
      'bpa-presented': {},
      uniform: { notes: '' },
    },
    holderSignature: { png: SIG_B, name: '陳大文（示範）', title: '', at: '2024-09-08', demo: true },
    endorsement: { ...leaderSig('2026-07-20'), validUntil: '2026-12-31' },
    meta: {
      demo: true,
      demoLabel: '示範樣本，只供測試，不可遞交',
      signLog: [],
      createdAt: '2024-09-08T02:00:00.000Z',
      updatedAt: new Date().toISOString(),
    },
  });

  const fill = (ids, dateList) => {
    ids.forEach((id, i) => {
      const date = dateList[i] || '2026-07-01';
      book.progress[id] = { date, signature: leaderSig(date), assessor: '示範審核員' };
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
      'L3-HEALTH-01', 'L3-HEALTH-02',
      'L3-CHALLENGE-01', 'L3-CHALLENGE-02',
    ],
    [
      '2025-08-16', '2026-02-01',
      '2025-10-04', '2025-10-18', '2025-10-25',
      '2025-11-01', '2025-11-15', '2025-11-29',
      '2026-01-10', '2026-01-24',
      '2026-02-07',
      '2026-02-21', '2026-03-07',
      '2026-04-18', '2026-04-18',
    ],
  );
  book.progress['L3-SERVICE-01'].cert = 'DEMO-FA-0001';
  book.progress['L3-SERVICE-02'].cert = 'DEMO-SWA-0001';
  book.progress['L3-SERVICE-03'].cert = 'DEMO-SWA-0002';
  book.progress['L3-INT-01'].cert = '';
  book.progress['L3-HEALTH-01'].cert = 'DEMO-SK-0001';
  book.progress['L4-ALL-01'] = { date: '2026-04-18', signature: leaderSig('2026-04-18'), assessor: '示範審核員' };
  book.progress['L4-ALL-02'] = { date: '2026-07-11', signature: leaderSig('2026-07-11'), assessor: '示範區總監' };
  book.progress['L4-ALL-03'] = { date: '', note: '已備妥申請表，待正式遞交（示範）' };

  return book;
}
