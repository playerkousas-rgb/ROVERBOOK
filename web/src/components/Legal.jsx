import React from 'react';
import { useLang } from '../i18n.jsx';

/** 非官方聲明（用家指定字句，勿自行改寫）。 */
export function LegalNote({ compact = false, className = '' }) {
  const { isEn } = useLang();
  return (
    <div className={`legal${compact ? ' legal--compact' : ''} ${className}`}>
      <p className="legal__copy">Copyright © 2026 SCOUT SYSTEM</p>
      <p>
        {isEn
          ? 'This site is an independent, unofficial tool for members, and has no official affiliation with The Scout Association of Hong Kong. All training syllabus and record-book content is the copyright of The Scout Association of Hong Kong.'
          : '本網站為非官方獨立工具，旨在方便成員，與香港童軍總會無任何官方從屬關係。所有訓練綱要及紀錄冊內容，版權歸香港童軍總會所有。'}
      </p>
    </div>
  );
}

export default LegalNote;
