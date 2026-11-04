import React, { useRef, useState } from 'react';
import { useBook } from '../bookContext.js';
import { useToast, Icon, Modal } from '../ui.jsx';
import { download, clearBook, slugify } from '../bookStore.js';
import { demoBook, importFromRoverBadge, newBook, today } from '@shared/book.js';
import { navigate } from '../router.jsx';

export default function MenuDialog({ open, onClose, onShowQr, onHome }) {
  const { book, replace } = useBook();
  const { push } = useToast();
  const backupRef = useRef(null);
  const rbRef = useRef(null);
  const [showAbout, setShowAbout] = useState(false);

  if (!open) return null;

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
        if (!data?.member) throw new Error('這不是 ROVERBOOK 備份檔');
        if (!confirm('匯入備份會覆蓋目前這本紀錄冊，確定嗎？')) return;
        replace(newBook(data));
        push('備份已還原');
        onClose();
      } catch (e) {
        push(e.message || '檔案格式不正確', 'error');
      }
    };
    reader.readAsText(file);
  };

  const importBadge = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        const draft = structuredClone(book);
        const result = importFromRoverBadge(data, draft);
        draft.member = result.member;
        replace(newBook(draft));
        push(`已從 ROVERBADGE 匯入 ${result.imported} 項進度（${result.matchedBy}）`);
        navigate('/p/mb-intro');
        onClose();
      } catch (e) {
        push(e.message || '無法讀取 ROVERBADGE 檔案', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <Modal open={open} onClose={onClose} eyebrow="MENU" title="紀錄冊選項">
      <div className="menu">
        {onHome && (
          <button className="menu__item menu__item--accent" onClick={onHome}>
            <Icon name="download" size={18} />
            <span>
              <strong>加到手機主畫面</strong>
              <em>建議做法：一按即開，毋須憑證、毋須付費</em>
            </span>
          </button>
        )}

        <button
          className="menu__item menu__item--accent"
          onClick={() => {
            onClose();
            navigate('/scan');
          }}
        >
          <Icon name="qr" size={18} />
          <span>
            <strong>掃描二維碼</strong>
            <em>領袖掃成員紀錄冊；成員掃領袖的核簽回傳碼</em>
          </span>
        </button>
        <button className="menu__item" onClick={() => onShowQr?.()}>
          <Icon name="qr" size={18} />
          <span>
            <strong>出示二維碼（給領袖掃描）</strong>
            <em>每次自行剔選要傳送的資料，預設不傳任何內容</em>
          </span>
        </button>
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
        <button className="menu__item" onClick={() => window.print()}>
          <Icon name="print" size={18} />
          <span>
            <strong>列印整本 / 儲存 PDF</strong>
            <em>每頁對應紙本一頁，已設 A4 分頁</em>
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

        <button className="menu__item" onClick={() => rbRef.current?.click()}>
          <Icon name="link" size={18} />
          <span>
            <strong>從 ROVERBADGE 匯入進度</strong>
            <em>讀取 ROVERBADGE 的 members／progress JSON</em>
          </span>
        </button>

        <button
          className="menu__item"
          onClick={() => {
            if (!confirm('載入示範紀錄冊會覆蓋目前內容，確定嗎？')) return;
            replace(demoBook());
            push('已載入示範紀錄冊');
            navigate('/p/contents');
            onClose();
          }}
        >
          <Icon name="book" size={18} />
          <span>
            <strong>載入示範紀錄冊</strong>
            <em>以林卓瑤的資料試玩所有功能</em>
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
              <strong>ROVERBOOK v2</strong> · 樂行童軍電子紀錄冊。所有內容只儲存在你這部裝置的瀏覽器
              （localStorage），不會自動上載。只有你主動建立的分享連結會放到伺服器，並可隨時刪除。
            </p>
            <p>
              非香港童軍總會官方產品。訓練綱要結構及項目編號對應 ROVERBADGE（第五版綱要），
              可與該系統交換進度資料。正式使用前請自行核對綱要版本。
            </p>
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

      <input ref={backupRef} type="file" accept="application/json,.json" hidden onChange={(e) => importBackup(e.target.files?.[0])} />
      <input ref={rbRef} type="file" accept="application/json,.json" hidden onChange={(e) => importBadge(e.target.files?.[0])} />
    </Modal>
  );
}
