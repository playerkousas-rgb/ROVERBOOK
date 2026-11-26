import React from 'react';
import { useLang } from '../i18n.jsx';
import { Icon } from '../ui.jsx';

/**
 * SG18「讚好／收藏」一鍵返回 SCOUT APP STORE 詳情卡（開新分頁）。
 *
 * - 只連回主站；唔直連主站資料庫、唔複製任何密鑰、唔自行呼叫主站統計函式（SG18）。
 * - 網址一律由 `store_gate_v1.0.js` 的 `ScoutStoreGate.getAppStoreUrl()` 產生，前端零寫死網址；
 *   slug `roverbook` 對照主站 migration `20261116-app-slug-seed.sql`
 *   （`roverbook.vercel.app → roverbook`）核實，唔靠 repo 名猜。
 * - 閘腳本讀唔到（離線／舊快取／被攔截）時 `href` 為空字串 → 整粒掣隱藏，唔會出死連。
 * - 列印時隱藏；細螢幕只保留心形圖標，不收窄其他按鈕。
 */
export default function StoreSupport({ onDark = false, className = '' }) {
  const { isEn } = useLang();
  const helper = typeof window !== 'undefined' ? window.ScoutStoreGate?.getAppStoreUrl : null;
  const href = typeof helper === 'function' ? helper('roverbook') : '';
  const label = isEn
    ? 'Like or save ROVERBOOK on SCOUT APP STORE (opens a new tab)'
    : '前往 SCOUT APP STORE 讚好或收藏這本紀錄冊（開新分頁）';
  return (
    <a
      className={`store-support${onDark ? ' store-support--dark' : ''}${className ? ` ${className}` : ''}`}
      href={href || undefined}
      hidden={!href}
      target="_blank"
      rel="noopener"
      aria-label={label}
      title={label}
    >
      <span className="store-support__heart" aria-hidden="true">
        ♥
      </span>
      <span className="store-support__text">{isEn ? 'Like / Save' : '讚好／收藏'}</span>
      <Icon name="external" size={11} className="store-support__ext" />
    </a>
  );
}
