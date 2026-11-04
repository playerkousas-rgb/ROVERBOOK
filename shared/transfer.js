/**
 * QR 傳輸層 —— 成員端把「自己揀選的」資料壓縮成一隻二維碼，領袖端掃描後讀回。
 * 不經伺服器：內容只存在二維碼本身。
 *
 * 兩種格式：
 *   RB1.<base64url(gzip(JSON))>   壓縮（現代瀏覽器都有 CompressionStream）
 *   RB1P.<base64url(JSON)>        沒有壓縮時的後備
 */

export const TRANSFER_PREFIX = 'RB1';
export const TRANSFER_VERSION = 1;
export const KIND_MEMBER = 'roverbook/member';
export const KIND_SIGNOFF = 'roverbook/signoff';

/** 一隻 QR（version 40、L 級）最多 2,953 bytes；留些少餘裕方便鏡頭讀取。 */
export const QR_LIMIT = 2400;

/** 逐項揀選；預設全部不放入 QR（每次都要成員自己剔）。 */
export const TRANSFER_OPTIONS = [
  {
    key: 'particulars',
    label: '個人資料',
    en: 'Personal particulars',
    hint: '姓名、成員編號、旅團、入團日期',
  },
  {
    key: 'contact',
    label: '聯絡方法',
    en: 'Contact',
    hint: '電話、電郵、地址、緊急聯絡人',
    sensitive: true,
  },
  {
    key: 'progress',
    label: '訓練進度',
    en: 'Progress',
    hint: '32 項細項的完成日期、審核員、證書編號',
  },
  {
    key: 'summaries',
    label: '活動簡述',
    en: 'Activity summaries',
    hint: '七個考核項目的簡述及會面評語',
  },
  {
    key: 'presentations',
    label: '頒發及會面紀錄',
    en: 'Awards & interviews',
    hint: '樂行童軍獎章、貝登堡獎章頒發日期及會面紀錄',
  },
  {
    key: 'signatures',
    label: '領袖簽署',
    en: 'Leader signatures',
    hint: '各項旁邊的領袖墨跡（檔案較大）',
    heavy: true,
  },
  {
    key: 'holderSignature',
    label: '持有人簽名',
    en: 'Holder signature',
    hint: '紀錄冊內的持有人簽名',
    heavy: true,
  },
  {
    key: 'photo',
    label: '近照',
    en: 'Photo',
    hint: '紀錄冊內的個人相片（檔案最大）',
    heavy: true,
  },
];

const SUMMARY_FIELDS = [
  ['dedication', 'comment'],
  ['scoutcraft', 'course1'],
  ['scoutcraft', 'course2'],
  ['volunteerism', 'summary'],
  ['global-vision', 'summary'],
  ['tenacity', 'summary'],
  ['wellness-1', 'summary'],
  ['wellness-2', 'summary'],
  ['intrepidity', 'summary'],
];

const PRESENTATION_PAGES = ['rsa-presented', 'bpa-presented', 'interview-district', 'interview-region'];

const text = (v) => (typeof v === 'string' ? v.trim() : '');
const pick = (obj, keys) => {
  const out = {};
  keys.forEach((k) => {
    const v = text(obj?.[k]);
    if (v) out[k] = v;
  });
  return out;
};

export function buildPayload(book, selection = []) {
  const chosen = new Set(selection);
  const payload = {
    t: KIND_MEMBER,
    v: TRANSFER_VERSION,
    at: new Date().toISOString(),
    sel: TRANSFER_OPTIONS.filter((o) => chosen.has(o.key)).map((o) => o.key),
  };
  const m = book?.member || {};

  if (chosen.has('particulars')) {
    payload.member = pick(m, ['nameZh', 'nameEn', 'scoutId', 'memberNo', 'crew', 'group', 'district', 'region', 'issueDate', 'dateJoined']);
  }
  if (chosen.has('contact')) {
    payload.contact = pick(m, ['phone', 'email', 'address', 'emergencyName', 'emergencyPhone']);
  }
  if (chosen.has('progress')) {
    const progress = {};
    Object.entries(book?.progress || {}).forEach(([id, entry]) => {
      if (!entry) return;
      const row = pick(entry, ['date', 'assessor', 'cert']);
      if (Object.keys(row).length) progress[id] = row;
    });
    payload.progress = progress;
  }
  if (chosen.has('summaries')) {
    const summaries = {};
    SUMMARY_FIELDS.forEach(([page, field]) => {
      const v = text(book?.pages?.[page]?.[field]);
      if (v) summaries[`${page}.${field}`] = v;
    });
    payload.summaries = summaries;
  }
  if (chosen.has('presentations')) {
    const pages = {};
    PRESENTATION_PAGES.forEach((page) => {
      const src = book?.pages?.[page] || {};
      const row = pick(src, ['presentedOn', 'place', 'by', 'name', 'unit', 'date', 'comment', 'certNo']);
      if (Object.keys(row).length) pages[page] = row;
    });
    payload.pages = pages;
  }
  if (chosen.has('signatures')) {
    const signatures = {};
    Object.entries(book?.progress || {}).forEach(([id, entry]) => {
      if (entry?.signature?.png) signatures[id] = entry.signature;
    });
    if (book?.endorsement?.png) signatures.__endorsement = book.endorsement;
    payload.signatures = signatures;
  }
  if (chosen.has('holderSignature') && book?.holderSignature?.png) {
    payload.holderSignature = book.holderSignature;
  }
  if (chosen.has('photo') && m.photo) {
    payload.photo = m.photo;
  }

  payload.sums = { done: Object.keys(payload.progress || {}).length };
  return payload;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function toBase64Url(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    if (b1 === undefined) break;
    out += B64[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    if (b2 === undefined) break;
    out += B64[b2 & 63];
  }
  return out;
}

function fromBase64Url(str) {
  const clean = str.replace(/=+$/, '');
  const bytes = [];
  for (let i = 0; i < clean.length; i += 4) {
    const c0 = B64.indexOf(clean[i]);
    const c1 = B64.indexOf(clean[i + 1]);
    const c2 = B64.indexOf(clean[i + 2]);
    const c3 = B64.indexOf(clean[i + 3]);
    if (c0 < 0 || c1 < 0) throw new Error('二維碼內容有誤');
    bytes.push((c0 << 2) | (c1 >> 4));
    if (c2 >= 0) bytes.push(((c1 & 15) << 4) | (c2 >> 2));
    if (c3 >= 0) bytes.push(((c2 & 3) << 6) | c3);
  }
  return new Uint8Array(bytes);
}

const gzipAvailable = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

function byteStream(bytes) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

async function gzip(bytes) {
  const stream = byteStream(bytes).pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzip(bytes) {
  const stream = byteStream(bytes).pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function encodePayload(payload) {
  const json = JSON.stringify(payload);
  const raw = new TextEncoder().encode(json);
  let bytes = raw;
  let prefix = `${TRANSFER_PREFIX}P.`;
  if (gzipAvailable()) {
    try {
      const packed = await gzip(raw);
      if (packed.length < raw.length * 0.96) {
        bytes = packed;
        prefix = `${TRANSFER_PREFIX}.`;
      }
    } catch {
      /* 用未壓縮版本 */
    }
  }
  const body = toBase64Url(bytes);
  const value = prefix + body;
  return {
    value,
    payload,
    chars: value.length,
    rawBytes: raw.length,
    bytes: bytes.length,
    compressed: prefix === `${TRANSFER_PREFIX}.`,
    tooBig: value.length > QR_LIMIT,
  };
}

export async function encodeTransfer(book, selection) {
  return encodePayload(buildPayload(book, selection));
}

/** 領袖核簽單：一張簽名 + 一批項目，唔會傳整本紀錄冊。 */
export async function encodeSignoff({ member, leader, items, note }) {
  const payload = {
    t: KIND_SIGNOFF,
    v: TRANSFER_VERSION,
    at: new Date().toISOString(),
    seq: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    member: { nameZh: member?.nameZh || '', memberNo: member?.memberNo || '' },
    leader: {
      name: leader?.name || '',
      title: leader?.title || '樂行童軍團長',
      at: leader?.at || new Date().toISOString().slice(0, 10),
      png: leader?.png || null,
    },
    items: (items || []).map((it) => ({
      id: it.id,
      date: it.date || '',
      assessor: it.assessor || leader?.name || '',
      verified: true,
    })),
    note: note || '',
  };
  return encodePayload(payload);
}

export async function decodePayload(value) {
  const input = String(value || '').trim();
  const match = /^RB1(P?)\.([A-Za-z0-9_-]+)$/.exec(input);
  if (!match) throw new Error('這不是 ROVERBOOK 的二維碼');
  let bytes = fromBase64Url(match[2]);
  if (!match[1]) {
    if (!gzipAvailable()) throw new Error('這個二維碼需要較新的瀏覽器（Chrome）才能讀取');
    bytes = await gunzip(bytes);
  }
  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error('二維碼內容損壞，請重新產生');
  }
  if (payload?.v !== TRANSFER_VERSION || (payload.t !== KIND_MEMBER && payload.t !== KIND_SIGNOFF)) {
    throw new Error('二維碼版本未支援，請更新 ROVERBOOK');
  }
  return payload;
}

export async function decodeTransfer(value) {
  const payload = await decodePayload(value);
  if (payload.t !== KIND_MEMBER) throw new Error('這個二維碼不是成員紀錄冊');
  return payload;
}

/** 把核簽單寫入成員的紀錄冊（只改有核簽的項目）。 */
export function applySignoff(book, payload) {
  if (!payload || payload.t !== KIND_SIGNOFF) throw new Error('這不是核簽單');
  const next = structuredClone(book);
  const changes = [];
  (payload.items || []).forEach((item) => {
    if (!item?.id || !item.verified) return;
    const current = next.progress?.[item.id] || {};
    const before = { date: current.date || '', assessor: current.assessor || '' };
    next.progress = next.progress || {};
    next.progress[item.id] = {
      ...current,
      date: item.date || current.date || '',
      assessor: item.assessor || payload.leader?.name || current.assessor || '',
      at: new Date().toISOString(),
      signedAt: payload.at,
      ...(payload.leader?.png
        ? {
            signature: {
              png: payload.leader.png,
              name: payload.leader.name,
              title: payload.leader.title,
              at: payload.leader.at,
            },
          }
        : {}),
    };
    changes.push({
      id: item.id,
      before,
      after: { date: next.progress[item.id].date, assessor: next.progress[item.id].assessor },
      stamped: !!payload.leader?.png,
    });
  });
  next.meta = { ...(next.meta || {}), updatedAt: new Date().toISOString() };
  return { book: next, changes };
}

export function describeSelection(selection) {
  const chosen = TRANSFER_OPTIONS.filter((o) => selection.includes(o.key));
  return chosen.length ? chosen.map((o) => o.label).join('、') : '（未揀選任何資料）';
}
