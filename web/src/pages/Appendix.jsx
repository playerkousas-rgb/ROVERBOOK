import React, { useRef, useState } from 'react';
import { useBook } from '../bookContext.js';
import { Spread, ChapterMark } from '../components/Paper.jsx';
import { Field } from '../components/Edit.jsx';
import { Icon, Modal, useToast } from '../ui.jsx';
import { download, clearBook, latestShare, slugify } from '../bookStore.js';
import { navigate } from '../router.jsx';
import { today, progressedCount, newBook } from '@shared/book.js';

export default function Appendix() {
  const { book, update, replace } = useBook();
  const { push } = useToast();
  const fileRef = useRef(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const share = latestShare();
  const size = new Blob([JSON.stringify(book)]).size;
  const url = share ? `${window.location.origin}/v/${share.id}` : '';

  const exportJson = () => {
    download(`roverbook-${slugify(book.member.nameZh || book.member.nameEn || 'member')}-${today()}.json`, book);
    push('已匯出紀錄冊備份');
  };

  const importJson = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || !data.member) throw new Error('這不是 ROVERBOOK 備份檔');
        replace(newBook(data));
        push('已匯入紀錄冊');
      } catch (e) {
        push(e.message || '無法讀取檔案', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <Spread
      section="appendix"
      folioLeft="18"
      folioRight="18"
      left={
        <>
          <ChapterMark
            no="12"
            title="數位附錄"
            en="DIGITAL APPENDIX"
            lead="這一頁不屬於紙本紀錄冊，但它是整本冊子的「後台」：備份、分享、錢包、與 ROVERBADGE 連動。"
          />

          <div className="appendix-card">
            <h4>
              <Icon name="book" size={14} /> 本機儲存
            </h4>
            <dl className="kv">
              <div>
                <dt>持有人</dt>
                <dd>{book.member.nameZh || '未填姓名'}</dd>
              </div>
              <div>
                <dt>建立日期</dt>
                <dd>{book.meta?.createdAt ? book.meta.createdAt.slice(0, 10) : '—'}</dd>
              </div>
              <div>
                <dt>最後更新</dt>
                <dd>{book.meta?.updatedAt ? book.meta.updatedAt.slice(0, 16).replace('T', ' ') : '—'}</dd>
              </div>
              <div>
                <dt>已完成項目</dt>
                <dd>{progressedCount(book)} / 32</dd>
              </div>
              <div>
                <dt>資料大小</dt>
                <dd>{(size / 1024).toFixed(1)} KB</dd>
              </div>
            </dl>
            <p className="tiny">資料只存在這部裝置的瀏覽器（localStorage）。清除瀏覽器資料即會失去，請定期備份。</p>
            <div className="aside-actions">
              <button className="btn btn--ghost btn--sm" onClick={exportJson}>
                <Icon name="download" size={14} /> 匯出備份
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()}>
                <Icon name="upload" size={14} /> 匯入備份
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => importJson(e.target.files?.[0])}
              />
            </div>
          </div>

          <div className="appendix-card">
            <h4>
              <Icon name="seam" size={14} /> 與 ROVERBADGE 連動
            </h4>
            <Field
              label="ROVERBADGE 旅團編號"
              en="Troop ID"
              value={book.member.troopId || ''}
              onChange={(v) => update((b) => ({ ...b, member: { ...b.member, troopId: v.trim() } }))}
              placeholder="0082"
            />
            <p className="tiny">
              匯出進度時會附上這個編號，領袖可直接在 ROVERBADGE 匯入。兩個系統各自獨立運作，不需要同時使用。
            </p>
          </div>
        </>
      }
      right={
        <>
          <div className="formhead">
            <h3>分享與錢包</h3>
            <span>表格 K</span>
          </div>

          {share ? (
            <div className="sharecard">
              <img className="sharecard__qr" src={`/api/qr.svg?d=${encodeURIComponent(url)}`} alt="分享二維碼" width="132" height="132" />
              <div className="sharecard__body">
                <span className="eyebrow">目前的分享連結</span>
                <code>{url.replace(/^https?:\/\//, '')}</code>
                <p>
                  建立於 {share.createdAt?.slice(0, 10)} ·{' '}
                  {Object.entries(share.include || {})
                    .filter(([, v]) => v)
                    .length}{' '}
                  個章節
                </p>
                <p className="tiny">如要更改範圍或作廢連結，請用右上角「分享」。</p>
              </div>
            </div>
          ) : (
            <div className="sharecard sharecard--empty">
              <div className="sharecard__qr sharecard__qr--empty">
                <Icon name="qr" size={26} />
              </div>
              <div className="sharecard__body">
                <span className="eyebrow">尚未建立分享</span>
                <p>按右上角「分享」即可產生二維碼及連結，並自選公開的章節。</p>
              </div>
            </div>
          )}

          <div className="appendix-card appendix-card--dark">
            <h4>
              <Icon name="wallet" size={14} /> 錢包卡
            </h4>
            <p>
              Apple Wallet 及 Google Wallet 的 pass 會顯示姓名、團籍、會員有效日期及分享二維碼。
              憑證由伺服器簽發，不會包含完整紀錄。
            </p>
          </div>

          <div className="appendix-card">
            <h4>
              <Icon name="alert" size={14} /> 危險操作
            </h4>
            <p className="tiny">清除後本機資料無法復原（已建立的分享連結亦會失效）。</p>
            <button className="btn btn--danger btn--sm" onClick={() => setConfirmClear(true)}>
              <Icon name="trash" size={14} /> 清除本機紀錄冊
            </button>
          </div>

          {confirmClear && (
          <Modal onClose={() => setConfirmClear(false)} title="確定要清除？" eyebrow="不可復原">
            <p className="modal__text">
              這會刪除這部裝置上的整本紀錄冊，包括所有簽名及進度。建議先「匯出備份」。
            </p>
            <div className="modal__actions">
              <button className="btn btn--ghost" onClick={() => setConfirmClear(false)}>
                取消
              </button>
              <button
                className="btn btn--danger"
                onClick={() => {
                  clearBook();
                  push('已清除本機資料');
                  replace(null);
                  navigate('/');
                }}
              >
                確定清除
              </button>
            </div>
          </Modal>
          )}
        </>
      }
    />
  );
}
