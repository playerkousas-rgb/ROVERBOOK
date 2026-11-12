import { BADGE_SYLLABUS } from './syllabus.js';

/**
 * 表格資料層 —— 由紀錄冊衍生 PT/69、PT/21、PT/22 的內容。
 * 只做純資料整理，方便日後新增表格或輸出其他格式。
 */

const ITEM_INDEX = (() => {
  const map = new Map();
  for (const level of BADGE_SYLLABUS) {
    for (const segment of level.segments) {
      for (const item of segment.items) map.set(item.id, { ...item, level: level.id, segment: segment.name });
    }
  }
  return map;
})();

export function syllabusItem(id) {
  return ITEM_INDEX.get(id) || null;
}

/* 樂行童軍獎章七個考核項目 */
export const COMPONENTS = [
  {
    key: 'dedication',
    no: '1',
    zh: '準領袖培訓',
    en: 'Dedication',
    ids: ['L3-LEADER-01', 'L3-LEADER-02'],
    summary: (b) => [b.pages?.dedication?.comment].filter(Boolean).join(' '),
  },
  {
    key: 'scoutcraft',
    no: '2',
    zh: '童軍技能',
    en: 'Scoutcraft',
    ids: ['L3-SCOUT-01', 'L3-SCOUT-02', 'L3-SCOUT-03'],
    summary: (b) =>
      [b.pages?.scoutcraft?.course1, b.pages?.scoutcraft?.course2].filter(Boolean).join('、'),
  },
  {
    key: 'volunteerism',
    no: '3',
    zh: '服務',
    en: 'Volunteerism',
    ids: ['L3-SERVICE-01', 'L3-SERVICE-02', 'L3-SERVICE-03'],
    summary: (b) => b.pages?.volunteerism?.summary || '',
  },
  {
    key: 'global-vision',
    no: '4',
    zh: '國際視野',
    en: 'Global Vision',
    ids: ['L3-INTL-01', 'L3-INTL-02'],
    summary: (b) => b.pages?.['global-vision']?.summary || b.pages?.['global-vision']?.activity || '',
  },
  {
    key: 'tenacity',
    no: '5',
    zh: '興趣及技能',
    en: 'Tenacity',
    ids: ['L3-INT-01'],
    summary: (b) => b.pages?.tenacity?.summary || b.pages?.tenacity?.activity || '',
  },
  {
    key: 'wellness',
    no: '6',
    zh: '身心健康',
    en: 'Mental and Physical Wellness',
    ids: ['L3-HEALTH-01', 'L3-HEALTH-02'],
    summary: (b) =>
      [b.pages?.['wellness-1']?.summary, b.pages?.['wellness-2']?.summary].filter(Boolean).join(' '),
  },
  {
    key: 'intrepidity',
    no: '7',
    zh: '挑戰',
    en: 'Intrepidity',
    ids: ['L3-CHALLENGE-01', 'L3-CHALLENGE-02'],
    summary: (b) => b.pages?.intrepidity?.summary || '',
  },
];

const clean = (value) => {
  if (value == null) return '';
  if (typeof value === 'object') return value.ink ? '' : '';
  return String(value).trim();
};

const dateOf = (entry) => clean(entry?.date) || '';
const certOf = (entry) => clean(entry?.cert) || '';

function ageOf(dob) {
  const d = new Date(dob);
  if (!dob || Number.isNaN(d.getTime())) return '';
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const before = now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate());
  if (before) age -= 1;
  return age >= 0 && age < 130 ? String(age) : '';
}

/* 逐個考核項目：是否完成、最早及最晚日期、審核員、活動簡述 */
export function componentsOf(book) {
  const progress = book?.progress || {};
  return COMPONENTS.map((component) => {
    const items = component.ids.map((id) => {
      const meta = syllabusItem(id);
      const entry = progress[id] || {};
      return {
        id,
        name: meta?.name || '',
        segment: meta?.segment || '',
        date: dateOf(entry),
        cert: certOf(entry),
        assessor: clean(entry.assessor),
      };
    });
    const dates = items.map((i) => i.date).filter(Boolean).sort();
    const assessors = items.map((i) => i.assessor).filter(Boolean);
    const done = component.ids.every((id) => !!dateOf(progress[id]));
    return {
      ...component,
      items,
      done,
      from: dates[0] || '',
      to: dates[dates.length - 1] || '',
      assessor: assessors[assessors.length - 1] || '',
      summary:
        component.summary(book) ||
        items
          .filter((i) => i.date)
          .map((i) => i.name)
          .filter(Boolean)
          .join('；'),
    };
  });
}

export function personalOf(book) {
  const m = book?.member || {};
  return {
    nameZh: clean(m.nameZh),
    nameEn: clean(m.nameEn),
    memberNo: clean(m.memberNo),
    issueDate: clean(m.issueDate),
    dob: clean(m.dob),
    age: ageOf(m.dob),
    gender: clean(m.gender),
    region: clean(m.region),
    district: clean(m.district),
    group: clean(m.group),
    crew: clean(m.crew),
    address: clean(m.address),
    addressEn: clean(m.addressEn),
    phone: clean(m.phone),
    email: clean(m.email),
    photo: m.photo || null,
  };
}

/* 急救證書：優先取服務項目證書，其次身心健康課程 */
export function firstAidCert(book) {
  const progress = book?.progress || {};
  const fromService = ['L3-SERVICE-01', 'L3-SERVICE-02', 'L3-SERVICE-03']
    .map((id) => clean(progress[id]?.cert))
    .find(Boolean);
  if (fromService) return fromService;
  const certs = book?.pages?.['wellness-1']?.certs || [];
  const found = certs.find((c) => /急救|first\s*aid/i.test(`${c.item} ${c.cert}`));
  return clean(found?.cert);
}

export function roverAwardRecord(book) {
  const page = book?.pages?.['rsa-presented'] || {};
  return {
    certNo: clean(page.certNo),
    presentedOn: clean(page.presentedOn),
    by: clean(page.by),
    place: clean(page.place),
  };
}

/**
 * 每張表格的狀態。
 * PT/69 只需個人資料（考試計劃屬新資料）；PT/21 完成 4 項可生成；PT/22 完成 7 項可生成。
 */
export function formStatus(book) {
  const personal = personalOf(book);
  const components = componentsOf(book);
  const done = components.filter((c) => c.done);
  const personalMissing = ['nameZh', 'memberNo', 'dob', 'group']
    .filter((k) => !personal[k])
    .map((k) => ({ nameZh: '中文姓名', memberNo: '童軍成員編號', dob: '出生日期', group: '所屬旅' }[k]));

  return {
    components,
    personal,
    doneCount: done.length,
    pt69: {
      id: 'pt69',
      ready: personalMissing.length === 0,
      missing: personalMissing,
      note:
        personalMissing.length === 0
          ? '個人資料已備妥；考試計劃的日期會由紀錄冊自動帶入。'
          : `還欠：${personalMissing.join('、')}`,
      noteEn:
        personalMissing.length === 0
          ? 'Personal particulars are complete; assessment dates are filled in automatically.'
          : `Still missing: ${personalMissing.length} item(s)`,
    },
    pt21: {
      id: 'pt21',
      ready: done.length >= 4,
      missing: done.length >= 4 ? [] : ['再完成 ' + (4 - done.length) + ' 個考核項目'],
      note:
        done.length >= 4
          ? `已自動揀出 4 個完成項目（${done.slice(0, 4).map((c) => c.zh).join('、')}）。`
          : `已完成 ${done.length} / 4 項，完成後一按即生成整份表格。`,
      noteEn:
        done.length >= 4
          ? `Four completed components selected automatically (${done.slice(0, 4).map((c) => c.en || c.zh).join(', ')}).`
          : `${done.length} / 4 components done — the whole form is generated in one tap once complete.`,
    },
    pt22: {
      id: 'pt22',
      ready: done.length >= 7,
      missing: done.length >= 7 ? [] : ['再完成 ' + (7 - done.length) + ' 個考核項目', '急救證書編號'],
      note:
        done.length >= 7
          ? '七項全部完成，可一鍵生成貝登堡獎章申請表。'
          : `已完成 ${done.length} / 7 項。`,
      noteEn:
        done.length >= 7
          ? 'All seven components complete — the Baden-Powell Award form can be generated in one tap.'
          : `${done.length} / 7 components done.`,
    },
  };
}

const chosenFour = (components) => components.filter((c) => c.done).slice(0, 4);
const remainingThree = (components) => components.filter((c) => c.done).slice(4, 7);

export function formData(book, id) {
  const personal = personalOf(book);
  const components = componentsOf(book);
  const chosen = chosenFour(components);
  const remaining = remainingThree(components);
  const rsl = {
    name: clean(book?.endorsement?.name) || clean(book?.member?.rsl),
    date: clean(book?.endorsement?.at) || clean(book?.endorsement?.date),
    signature: book?.endorsement?.png || null,
  };
  const holder = {
    signature: book?.holderSignature?.png || null,
    name: clean(book?.holderSignature?.name) || personal.nameZh,
    date: clean(book?.holderSignature?.at),
  };
  return {
    id,
    personal,
    components,
    chosen,
    remaining,
    rsl,
    holder,
    firstAid: firstAidCert(book),
    rsa: roverAwardRecord(book),
    demo: book?.meta?.demo === true,
    demoLabel: book?.meta?.demoLabel || '示範樣本，只供測試，不可遞交',
  };
}

export const FORM_META = {
  pt69: {
    code: 'PT/69',
    zh: '樂行童軍獎章及貝登堡獎章考試申請',
    en: 'Application for Assessment of the Rover Scout Award and Baden-Powell Award',
    when: '開始七項考核之前提交',
    pages: 1,
  },
  pt21: {
    code: 'PT/21',
    zh: '樂行童軍獎章及證書申請表',
    en: 'Application Form for the Rover Scout Award and Certificate',
    when: '完成七項其中四項之後',
    pages: 1,
  },
  pt22: {
    code: 'PT/22',
    zh: '貝登堡獎章及證書申請表',
    en: 'Application Form for the Baden-Powell Award and Certificate',
    when: '七項全部完成之後',
    pages: 1,
  },
};

export const FORM_ORDER = ['pt69', 'pt21', 'pt22'];
