import React, { useRef, useState } from 'react';
import { useBook } from '../bookContext.js';
import { useToast, Icon, Modal } from '../ui.jsx';
import { download, clearBook, slugify } from '../bookStore.js';
import { APP_VERSION, PAGE_TOTAL, SHEET_TOTAL, demoBook, newBook, today } from '@shared/book.js';
import { LegalNote } from './Legal.jsx';
import { navigate } from '../router.jsx';
import { useLang } from '../i18n.jsx';
import { exitLeaderMode } from '../leader.js';
import { isBadgeProgressFile, isBookBackupFile } from '../roverbadgeBridge.js';
import { StandaloneLink } from './EmbedNotice.jsx';
import { isEmbedded } from '@shared/embed.js';

export default function MenuDialog({ open, onClose, onShowQr, leader = false, leaderReady = null }) {
  const { book, replace } = useBook();
  const { isEn } = useLang();
  const { push } = useToast();
  const backupRef = useRef(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showHome, setShowHome] = useState(false);

  if (!open) return null;

  const embedded = isEmbedded();

  const backup = () => {
    download(`roverbook-${slugify(book.member.nameZh)}-${today()}.json`, book);
    push('已匯出備份檔案');
  };

  const importBackup = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (isBadgeProgressFile(data)) {
          throw new Error(
            isEn
              ? 'ROVERBADGE progress files cannot be restored here. Open Digital Appendix and connect your ROVERBADGE account before importing.'
              : 'ROVERBADGE 進度檔不能在此還原，請到「數位附錄」連接並登入 ROVERBADGE 後匯入。',
          );
        }
        if (!isBookBackupFile(data)) {
          throw new Error(isEn ? 'Not a complete ROVERBOOK backup JSON file' : '這不是完整的 ROVERBOOK 紀錄冊備份檔');
        }
        if (!confirm(isEn ? 'Overwrite current record book with this backup?' : '匯入備份會覆蓋目前這本紀錄冊，確定嗎？')) return;
        replace(newBook(data));
        push(isEn ? 'Backup restored' : '備份已還原');
        onClose();
      } catch (e) {
        push(e.message || (isEn ? 'Invalid file format' : '檔案格式不正確'), 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <Modal open={open} onClose={onClose} eyebrow="MENU" title="紀錄冊選項">
      <div className="menu">
        {embedded ? (
          <StandaloneLink className="menu__item menu__item--accent">
            <Icon name="external" size={18} />
            <span>
              <strong>{isEn ? 'Open standalone site (new tab)' : '開啟獨立版（新分頁）'}</strong>
              <em>{isEn ? 'Portal storage is separate; use backup export/import to move data.' : '平台內資料與獨立版分開；請以匯出／匯入備份搬移資料'}</em>
            </span>
          </StandaloneLink>
        ) : (
          <button className="menu__item menu__item--accent" onClick={() => setShowHome((v) => !v)}>
            <Icon name={showHome ? 'down' : 'download'} size={18} />
            <span><strong>{isEn ? 'Add to home screen' : '加到手機主畫面'}</strong><em>{isEn ? 'One tap to open; no certificate, no fee, no server.' : '一按即開，毋須憑證、毋須付費、毋須伺服器'}</em></span>
          </button>
        )}
        {!embedded && showHome && (
          <div className="menuguide">
            <ol>
              <li>
                <b>iPhone</b>：用 <b>Safari</b> 開啟本頁 → 底部「分享」→「加入主畫面」→「新增」。
              </li>
              <li>
                <b>Android</b>：用 <b>Chrome</b> 開啟本頁 → 右上三點 →「安裝應用程式」或「加到主畫面」。
              </li>
            </ol>
            <p>
              {isEn
                ? 'Same as an app afterwards: full screen, no login, works offline. This is the only way recommended — no wallet pass, no developer account.'
                : '之後同 App 一樣：全螢幕、毋須登入、離線照用。這是唯一建議的做法（不需要任何錢包或開發者帳戶）。'}
            </p>
          </div>
        )}

        {leader ? (
          <button
            className="menu__item menu__item--accent"
            onClick={() => {
              onClose();
              navigate('/scan');
            }}
          >
            <Icon name="qr" size={18} />
            <span>
              <strong>{isEn ? 'Scan a QR code' : '掃描二維碼（領袖）'}</strong>
              <em>
                {isEn
                  ? 'Read a member’s book, then sign off the items'
                  : '讀取成員的紀錄冊，核對後簽署'}
              </em>
            </span>
          </button>
        ) : null}

        <button className="menu__item" onClick={() => onShowQr?.()}>
          <Icon name="qr" size={18} />
          <span>
            <strong>{isEn ? 'Show my QR code' : '出示二維碼（給領袖掃描）'}</strong>
            <em>
              {isEn
                ? 'Members can only share. Tick what to send; nothing is sent by default.'
                : '成員只有分享功能。每次自行剔選要傳送的資料，預設不傳任何內容。'}
            </em>
          </span>
        </button>
        {leader ? (
          <button
            className="menu__item"
            onClick={() => {
              exitLeaderMode();
              push(isEn ? 'Leader mode closed' : '已退出領袖模式');
              onClose();
            }}
          >
            <Icon name="lock" size={18} />
            <span>
              <strong>{isEn ? 'Leave leader mode' : '退出領袖模式'}</strong>
              <em>
                {isEn
                  ? 'Scanning and signing are hidden again on this device'
                  : '這部裝置不再顯示掃描及核簽功能'}
              </em>
            </span>
          </button>
        ) : leaderReady ? (
          <button
            className="menu__item"
            onClick={() => {
              onClose();
              navigate('/leader');
            }}
          >
            <Icon name="lock" size={18} />
            <span>
              <strong>{isEn ? 'Leader mode' : '領袖模式'}</strong>
              <em>
                {isEn
                  ? 'For leaders: scan a member’s book and sign items off'
                  : '領袖專用：掃描成員紀錄冊並核簽'}
              </em>
            </span>
          </button>
        ) : null}

        <button
          className="menu__item"
          onClick={() => {
            onClose();
            navigate('/forms');
          }}
        >
          <Icon name="seal" size={18} />
          <span>
            <strong>三張官方申請表（一鍵生成）</strong>
            <em>PT/69、PT/21、PT/22，個人資料及考核紀錄自動填入</em>
          </span>
        </button>
        <button
          className="menu__item"
          onClick={() => {
            onClose();
            navigate('/print');
          }}
        >
          <Icon name="print" size={18} />
          <span>
            <strong>{isEn ? 'Print whole book / Save PDF' : '列印整本 / 儲存 PDF'}</strong>
            <em>
              {isEn
                ? `${SHEET_TOTAL} sheets: unnumbered cover + printed pages 1–${PAGE_TOTAL}; page numbers print top-right.`
                : `${SHEET_TOTAL} 張紙：封面不印頁碼 + 內頁第 1–${PAGE_TOTAL} 頁；內頁右上角印有頁碼，可直接對回 PDF。`}
            </em>
          </span>
        </button>

        <button className="menu__item" onClick={backup}>
          <Icon name="download" size={18} />
          <span>
            <strong>匯出備份</strong>
            <em>下載完整紀錄冊 JSON，可存雲端或換機還原</em>
          </span>
        </button>

        <button className="menu__item" onClick={() => backupRef.current?.click()}>
          <Icon name="upload" size={18} />
          <span>
            <strong>匯入備份</strong>
            <em>從 ROVERBOOK 備份檔還原</em>
          </span>
        </button>

        <button className="menu__item" onClick={() => { onClose(); navigate('/p/appendix'); }}>
          <Icon name="seam" size={18} />
          <span>
            <strong>ROVERBADGE 個人同步</strong>
            <em>雲端直連本人進度（僅本人，零個人資料）</em>
          </span>
        </button>

        <button
          className="menu__item"
          onClick={() => {
            if (!confirm('載入示範紀錄冊會覆蓋目前內容，確定嗎？')) return;
            replace(demoBook());
            push('已載入示範紀錄冊（只供測試，不可遞交）');
            navigate('/p/contents');
            onClose();
          }}
        >
          <Icon name="book" size={18} />
          <span>
            <strong>載入示範紀錄冊</strong>
            <em>陳大文（示範）· 貝登堡獎章申請狀態 · 不會同步至 ROVERBADGE</em>
          </span>
        </button>

        <button className="menu__item" onClick={() => setShowAbout((v) => !v)}>
          <Icon name="info" size={18} />
          <span>
            <strong>關於 ROVERBOOK</strong>
            <em>版本、資料儲存方式及聲明</em>
          </span>
        </button>

        {showAbout && (
          <div className="about">
            <p>
              <strong>ROVERBOOK {APP_VERSION}</strong> · 樂行童軍電子紀錄冊。所有內容只儲存在你這部裝置的瀏覽器
              （localStorage），不會自動上載。只有你主動建立的分享連結會放到伺服器，並可隨時刪除。
            </p>
            <p>
              訓練綱要結構及項目編號對應 ROVERBADGE（第五版綱要），可與該系統交換進度資料。
              正式使用前請自行核對綱要版本。
            </p>
            <LegalNote compact />
          </div>
        )}

        <button
          className="menu__item menu__item--danger"
          onClick={() => {
            if (!confirm('清除本機紀錄冊？所有未備份的內容會永久消失。')) return;
            clearBook();
            replace(null);
            navigate('/');
            onClose();
          }}
        >
          <Icon name="trash" size={18} />
          <span>
            <strong>清除本機資料</strong>
            <em>刪除這部裝置上的紀錄冊</em>
          </span>
        </button>
      </div>

      <input
        ref={backupRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          importBackup(file);
        }}
      />
    </Modal>
  );
}
