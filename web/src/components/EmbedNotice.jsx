import React, { useState } from 'react';
import { EMBED_ACK_KEY, isEmbedded, standaloneHost, standaloneUrl } from '@shared/embed.js';
import { today } from '@shared/book.js';
import { download, slugify } from '../bookStore.js';
import { useLang } from '../i18n.jsx';
import { Icon, useToast } from '../ui.jsx';

const readAck = () => {
  try { return window.sessionStorage.getItem(EMBED_ACK_KEY) === '1'; } catch { return false; }
};
const writeAck = () => {
  try { window.sessionStorage.setItem(EMBED_ACK_KEY, '1'); } catch { /* storage may be blocked */ }
};

export function StandaloneLink({ className = 'btn btn--onpaper', children }) {
  return <a className={className} href={standaloneUrl()} target="_blank" rel="noopener noreferrer">{children}</a>;
}

export function EmbedWelcomeNote() {
  const { isEn } = useLang();
  if (!isEmbedded()) return null;
  const host = standaloneHost();
  return (
    <section className="embednote" role="note">
      <h2>{isEn ? 'Opened inside the Service Portal' : '你正在服務平台內開啟 ROVERBOOK'}</h2>
      <p>{isEn
        ? `This record book is stored separately from the standalone site (${host}). Existing data there will not appear here automatically.`
        : `平台內的紀錄冊與獨立版（${host}）分開儲存，原有資料不會自動出現在這裏。`}</p>
      {isEn ? <ol><li>Open the standalone site → Menu → “Export Backup”.</li><li>Come back here and choose “Import Backup” below.</li></ol>
        : <ol><li>開啟獨立版 → 選單 →「匯出備份」，下載 JSON 檔。</li><li>回到這裏，按下方「匯入備份」並選取該檔案。</li></ol>}
      <p className="embednote__warn">{isEn
        ? 'On iPhone, iPad and Safari, portal data may be cleared after the browser closes. Export a backup after every session, or use the standalone site for long-term records.'
        : 'iPhone／iPad 及 Safari 可能在關閉瀏覽器後清除平台內資料；每次填寫後請匯出備份，長期紀錄建議使用獨立版。'}</p>
      <StandaloneLink><Icon name="external" size={14} /> {isEn ? 'Open standalone site (new tab)' : '開啟獨立版（新分頁）'}</StandaloneLink>
    </section>
  );
}

export function EmbedRibbon({ book }) {
  const { isEn } = useLang();
  const { push } = useToast();
  const [ack, setAck] = useState(readAck);
  if (!isEmbedded() || ack) return null;
  const backup = () => {
    download(`roverbook-${slugify(book?.member?.nameZh || book?.member?.nameEn)}-${today()}.json`, book);
    push(isEn ? 'Backup exported' : '已匯出備份檔案');
  };
  return (
    <div className="embedbar no-print" role="status">
      <span><strong>{isEn ? 'Inside the Service Portal' : '服務平台內嵌模式'}</strong>{' '}{isEn
        ? 'Storage is separate from the standalone site. Export a backup before leaving.'
        : '資料與獨立版分開儲存；離開前請匯出備份。'}</span>
      <span className="embedbar__actions">
        <button type="button" className="embedbar__btn embedbar__btn--main" onClick={backup}><Icon name="download" size={13} /> {isEn ? 'Export Backup' : '匯出備份'}</button>
        <StandaloneLink className="embedbar__btn"><Icon name="external" size={13} /> {isEn ? 'Standalone site' : '開啟獨立版'}</StandaloneLink>
        <button type="button" className="embedbar__btn" onClick={() => { writeAck(); setAck(true); }}>{isEn ? 'Got it' : '知道了'}</button>
      </span>
    </div>
  );
}
