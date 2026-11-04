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
