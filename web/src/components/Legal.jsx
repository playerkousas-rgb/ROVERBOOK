import React from 'react';
import { useLang } from '../i18n.jsx';

/**
 * 版權與聲明：應用程式屬本工具作者；通告、綱要及紀錄冊內容屬香港童軍總會。
 * 不是官方產品，這一點要講清楚。
 */
export function LegalNote({ compact = false, className = '' }) {
  const { isEn } = useLang();
  return (
    <div className={`legal${compact ? ' legal--compact' : ''} ${className}`}>
      <p>
        <strong>{isEn ? 'Unofficial tool' : '非官方工具'}</strong>
        {isEn
          ? ' — ROVERBOOK is an independent, unofficial tool that helps members read public information. It has no official affiliation with The Scout Association of Hong Kong.'
          : ' — 本網站為非官方獨立工具，旨在方便成員瀏覽公開資訊，與香港童軍總會無任何官方從屬關係。'}
      </p>
      <p>
        {isEn
          ? 'All circulars, training syllabi and record-book content are copyright of The Scout Association of Hong Kong.'
          : '所有通告、訓練綱要及紀錄冊內容，版權歸香港童軍總會所有。'}
      </p>
      <p className="legal__app">
        {isEn
          ? 'Application, interface design and source code © 2026 ROVERBOOK.'
          : '應用程式、介面設計及程式碼版權 © 2026 ROVERBOOK。'}
      </p>
    </div>
  );
}

export default LegalNote;
