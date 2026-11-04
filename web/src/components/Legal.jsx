import React from 'react';
import { useLang } from '../i18n.jsx';

/**
 * 非官方聲明。只講清楚一件事：這不是總會官方產品。
 * 不宣告任何版權誰屬（書內引用的官方內容，權利屬其原擁有者）。
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
    </div>
  );
}

export default LegalNote;
