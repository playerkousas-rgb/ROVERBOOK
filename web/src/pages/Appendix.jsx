import React, { useRef, useState } from 'react';
import { useBook } from '../bookContext.js';
import { Spread } from '../components/Paper.jsx';
import { Field } from '../components/Edit.jsx';
import { Icon, Modal, useToast } from '../ui.jsx';
import { download, clearBook, latestShare, slugify } from '../bookStore.js';
import { navigate } from '../router.jsx';
import {
  today,
  progressedCount,
  newBook,
  exportForRoverBadge,
  importFromRoverBadge,
} from '@shared/book.js';

export default function Appendix() {
  const { book, update, replace } = useBook();
  const { push } = useToast();
  const backupRef = useRef(null);
  const rbRef = useRef(null);
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
        if (!confirm('匯入備份會覆蓋目前這本紀錄冊，確定嗎？')) return;
        replace(newBook(data));
        push('已匯入紀錄冊');
      } catch (e) {
        push(e.message || '無法讀取檔案', 'error');
      }
    };
    reader.readAsText(file);
  };

  const exportRb = () => {
    download(
      `roverbadge-progress-${book.member.ymis || 'member'}-${today()}.json`,
      exportForRoverBadge(book, book.member.troopId || ''),
    );
    push('已匯出 ROVERBADGE 進度檔');
  };

  const importRb = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        const draft = structuredClone(book);
        const result = importFromRoverBadge(data, draft);
        draft.member = result.member;
        update(() => draft);
        push(result.imported ? `已匯入 ${result.imported} 項進度（${result.matchedBy}）` : `沒有新進度（${result.matchedBy}）`);
      } catch (e) {
        push(e.message || '無法讀取檔案', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <Spread
      section="appendix"
      right={
        <>
          <div className="appx-grid">
            <div className="appendix-card">
              <h4>
                <Icon name="book" size={13} /> 本機儲存
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
              <div className="aside-actions">
                <button className="btn btn--ghost btn--sm" onClick={exportJson}>
                  <Icon name="download" size={13} /> 匯出備份
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => backupRef.current?.click()}>
                  <Icon name="upload" size={13} /> 匯入備份
                </button>
                <input ref={backupRef} type="file" accept="application/json,.json" hidden onChange={(e) => importJson(e.target.files?.[0])} />
              </div>
            </div>

            <div className="appendix-card">
              <h4>
                <Icon name="qr" size={13} /> 分享
              </h4>
              {share ? (
                <div className="appx-share">
                  <img src={`/api/qr.svg?d=${encodeURIComponent(url)}`} alt="分享二維碼" width="86" height="86" />
                  <div>
                    <code>{url.replace(/^https?:\/\//, '')}</code>
                    <p className="tiny">建立於 {share.createdAt?.slice(0, 10)}</p>
                  </div>
                </div>
              ) : (
                <p className="tiny">尚未建立分享。用右上角「分享」即可產生二維碼及連結。</p>
              )}
            </div>

            <div className="appendix-card">
              <h4>
                <Icon name="seam" size={13} /> ROVERBADGE 互通
              </h4>
              <Field
                label="旅團編號"
                value={book.member.troopId || ''}
                onChange={(v) => update((b) => ({ ...b, member: { ...b.member, troopId: v.trim() } }))}
                placeholder="0082"
              />
              <div className="aside-actions">
                <button className="btn btn--ghost btn--sm" onClick={exportRb}>
                  <Icon name="download" size={13} /> 匯出進度
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => rbRef.current?.click()}>
                  <Icon name="upload" size={13} /> 匯入進度
                </button>
                <input ref={rbRef} type="file" accept="application/json,.json" hidden onChange={(e) => importRb(e.target.files?.[0])} />
              </div>
              <p className="tiny">只交換「項目編號 + 日期」，不交換簽名。</p>
            </div>

            <div className="appendix-card appendix-card--dark">
              <h4>
                <Icon name="wallet" size={13} /> 錢包
              </h4>
              <p className="tiny">
                Wallet 卡片由伺服器簽發，需要 Apple／Google 憑證。未設定時可按「加到主畫面」，效果一樣快。
              </p>
            </div>
          </div>

          <div className="dangerline">
            <span className="tiny">清除本機資料後無法復原（已建立的分享連結亦會失效）。</span>
            <button className="btn btn--danger btn--sm" onClick={() => setConfirmClear(true)}>
              <Icon name="trash" size={13} /> 清除
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
