import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export const LANG_KEY = 'roverbook.lang';

const LangCtx = createContext({ lang: 'zh', isEn: false, setLang() {}, toggle() {} });

function readLang() {
  try {
    return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'zh';
  } catch {
    return 'zh';
  }
}

export function LangProvider({ children }) {
  const [lang, setLang] = useState(readLang);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang === 'en' ? 'en' : 'zh-Hant-HK');
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* private mode */
    }
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      isEn: lang === 'en',
      setLang,
      toggle: () => setLang((l) => (l === 'en' ? 'zh' : 'en')),
    }),
    [lang],
  );

  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useLang() {
  return useContext(LangCtx);
}

/** 中英二選一：英文模式而該處有英文就出英文，否則保留中文（不會漏字）。 */
export function bi(lang, zh, en) {
  return lang === 'en' && en ? en : zh;
}

/**
 * 很多欄位標籤原本寫成「出生日期 Date of Birth」。英文模式下自動拆出英文部分，
 * 中文模式下照舊整套顯示。
 */
export function englishOf(text) {
  if (!text) return '';
  const m = String(text).match(/^([^A-Za-z]*?[\u4e00-\u9fff][^A-Za-z]*)\s+([A-Za-z].*)$/);
  return m ? m[2].trim() : '';
}

export function labelFor(lang, text, en) {
  if (lang !== 'en') return text;
  const english = en || englishOf(text);
  return english || text;
}

const ADD_LABELS = {
  加一行: 'Add row',
  加一項: 'Add entry',
  加一個獎章: 'Add badge',
  加一項獎章: 'Add award',
  加一項服務: 'Add service',
  加一次轉旅: 'Add transfer',
  加一次搬遷: 'Add address change',
  加一次更改: 'Add change',
  加一次活動: 'Add activity',
  '加一項證書／課程': 'Add certificate / course',
};

export function addLabelFor(lang, text) {
  if (lang !== 'en') return text;
  if (!text) return 'Add row';
  return ADD_LABELS[text] || englishOf(text) || text.replace(/^加/, 'Add ');
}

/** 單字級詞彙（欄位、表頭）——沒有現成英譯時的最小字典。 */
const TERMS = {
  '項目': 'Item',
  '完成': 'Done',
  '日期': 'Date',
  '審核員': 'Assessor',
  '審核員簽署': "Assessor's signature",
  '證書編號': 'Certificate No.',
  '證書及日期': 'Certificate & date',
  '完成並經審核': 'Completed and assessed',
  '地點': 'Place',
  '期間': 'Period',
  '崗位／職位': 'Post / Rank',
  '旅': 'Group',
  '區': 'District',
  '地域': 'Region',
  '姓名': 'Name',
  '內容': 'Content',
  '備註': 'Notes',
  '簽署': 'Signature',
  '精神健康': 'Mental Health',
  '目的': 'Aim',
  '訓練方法': 'Method',
  '銘言': 'Motto',
  '小童軍': 'Grasshopper Scout',
};

export function termFor(lang, text) {
  if (lang !== 'en' || !text) return text;
  return TERMS[text] || text;
}
