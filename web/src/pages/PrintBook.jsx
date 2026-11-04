import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { navigate } from '../router.jsx';
import { Icon } from '../ui.jsx';
import { SECTIONS } from '@shared/book.js';
import { useLang } from '../i18n.jsx';

/* A4 直向、上下邊界各 10mm → 內文高度 = 277mm */
const PAGE_LIMIT_PX = Math.round((277 / 25.4) * 96);
const MIN_ZOOM = 0.62;

/**
 * 一次過印出整本：一節一張 .sheet，一張紙對一頁紀錄冊。
 * 每頁右上角印有「第 N 頁 · 共 41 頁」，可以直接對回紙本／PDF 頁數。
 * 內容超出一頁 A4 的頁面會自動縮小少許，確保一頁紙 = 一頁紀錄冊。
 */
export default function PrintBook({ pages, auto = true }) {
  const { isEn } = useLang();
  const sheets = SECTIONS.filter((s) => !s.digital);
  const printed = useRef(false);
  const bookRef = useRef(null);
  const [fits, setFits] = useState({});

  /* 量度 → 只對超高的頁套用 zoom，令每一節剛好一頁紙 */
  useLayoutEffect(() => {
    let alive = true;
    const measure = () => {
      if (!alive || !bookRef.current) return;
      const next = {};
      bookRef.current.querySelectorAll('[data-fit]').forEach((el) => {
        const rect = el.getBoundingClientRect();
        /* 小螢幕預覽會用 zoom 縮細，量度時要還原成 100% 的實際高度 */
        const scale = el.offsetWidth ? rect.width / el.offsetWidth : 1;
        const h = scale > 0 ? rect.height / scale : rect.height;
        if (h > PAGE_LIMIT_PX) {
          next[el.dataset.fit] = Math.max(MIN_ZOOM, (PAGE_LIMIT_PX / h) * 0.98);
        }
      });
      setFits(next);
    };
    const raf = requestAnimationFrame(() => requestAnimationFrame(measure));
    window.addEventListener('resize', measure);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, [isEn]);

  useEffect(() => {
    if (!auto || printed.current) return;
    printed.current = true;
    const t = setTimeout(() => {
      try {
        window.print();
      } catch {
        /* 環境唔支援時，用家可按掣 */
      }
    }, 900);
    return () => clearTimeout(t);
  }, [auto]);

  return (
    <div className="printall">
      <div className="printall__bar">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate(-1)}>
          <Icon name="back" size={14} /> {isEn ? 'Back' : '返回'}
        </button>
        <div className="printall__text">
          <strong>{isEn ? 'Whole book · 43 sheets' : '整本 · 43 頁'}</strong>
          <em>
            {isEn
              ? 'One sheet = one page of the record book; the page number is printed top-right.'
              : '一頁紙 = 一頁紀錄冊；右上角印有頁碼，可直接對回紙本／PDF 第幾頁。'}
          </em>
        </div>
        <button type="button" className="btn btn--gold btn--sm" onClick={() => window.print()}>
          <Icon name="print" size={14} /> {isEn ? 'Print / PDF' : '列印 / 存 PDF'}
        </button>
      </div>

      <div className="printall__book" ref={bookRef}>
        {sheets.map((s, i) => {
          const Page = pages[s.id];
          if (!Page) return null;
          const z = fits[s.id];
          const last = i === sheets.length - 1;
          return (
            <div
              className="printall__one"
              key={s.id}
              data-fit={s.id}
              style={{
                ...(z ? { zoom: z } : null),
                breakAfter: last ? 'auto' : 'page',
                pageBreakAfter: last ? 'auto' : 'always',
                breakInside: 'avoid',
              }}
            >
              <Page />
            </div>
          );
        })}
      </div>
    </div>
  );
}
