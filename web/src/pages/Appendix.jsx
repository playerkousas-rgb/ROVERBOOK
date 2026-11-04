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
import { FORM_META, FORM_ORDER, formStatus } from '@shared/forms.js';
import { ShowQrButton } from '../components/ShowQrDialog.jsx';
import { compressBookImages, imageSizeLabel, storageUsage, stripFieldInk } from '../storageHealth.js';
import { LegalNote } from '../components/Legal.jsx';
import { useLang } from '../i18n.jsx';

export default function Appendix() {
  const { book, update, replace } = useBook();
  const { isEn } = useLang();
  const { push } = useToast();
  const backupRef = useRef(null);
  const rbRef = useRef(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const share = latestShare();
  const size = new Blob([JSON.stringify(book)]).size;
  const forms = formStatus(book);
  const storage = storageUsage(book);
  const [compressing, setCompressing] = useState(false);

  const runCompress = async () => {
    setCompressing(true);
    try {
      const res = await compressBookImages(book);
      if (res.changed) {
        replace(res.book);
        push(`已壓縮 ${res.changed} 項，節省約 ${Math.round((res.savedChars * 2) / 1024)} KB`);
      } else {
        push('圖片已經夠細，毋須壓縮');
      }
    } catch {
      push('壓縮失敗，請先匯出備份', 'error');
    } finally {
      setCompressing(false);
    }
  };
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
      `roverbadge-progress-${book.member.scoutId || book.member.memberNo || 'member'}-${today()}.json`,
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
            <div className={`appendix-card appendix-card--storage${storage.ratio > 0.8 ? ' is-full' : ''}`}>
              <h4>
                <Icon name="lock" size={13} /> {isEn ? 'Storage health' : '儲存健康'}
              </h4>
              <div className="storebar">
                <i style={{ width: `${Math.max(2, Math.round(storage.ratio * 100))}%` }} />
              </div>
              <p className="tiny">
                {isEn ? 'About ' : '已用約 '}
                {((storage.bytes / 1024) / 1024).toFixed(2)} MB / 5 MB（{Math.round(storage.ratio * 100)}%）
              </p>
              {storage.images.length > 0 ? (
                <ul className="storelist">
                  {storage.images.slice(0, 3).map((img) => (
                    <li key={img.path}>
                      <span>{img.label}</span>
                      <b>{imageSizeLabel(img.chars)}</b>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="tiny">{isEn ? 'No images stored yet — plenty of room.' : '未有圖片資料，空間充足。'}</p>
              )}
              <div className="aside-actions">
                <button className="btn btn--ghost btn--sm" onClick={runCompress} disabled={compressing}>
                  <Icon name="download" size={13} /> {isEn ? (compressing ? 'Compressing…' : 'Compress photos & ink') : compressing ? '壓縮中…' : '壓縮圖片／墨跡'}
                </button>
                <button className="btn btn--ghost btn--sm" onClick={exportJson}>
                  <Icon name="download" size={13} /> {isEn ? 'Export backup' : '匯出備份'}
                </button>
              </div>
              <button
                className="linkbtn linkbtn--danger linkbtn--small"
                onClick={() => {
                  if (!confirm('清除所有「頁面手寫墨跡」，只保留簽名？手寫內容無法復原（文字不受影響）。')) return;
                  const res = stripFieldInk(book);
                  if (res.removed === 0) return push('沒有手寫墨跡需要清除');
                  replace(res.book);
                  push(`已清除 ${res.removed} 處手寫墨跡，簽名保留`);
                }}
              >
                {isEn ? 'Signatures only (clear handwriting)' : '只保留簽名（清除頁面手寫）'}
              </button>
            </div>

            <div className="appendix-card appendix-card--forms">
              <h4>
                <Icon name="seal" size={13} /> {isEn ? 'Three official forms' : '三張官方表格'}
              </h4>
              <ul className="formshort">
                {FORM_ORDER.map((id) => (
                  <li key={id} className={forms[id].ready ? 'is-ready' : ''}>
                    <button onClick={() => navigate(`/forms/${id}`)}>
                      <span>{FORM_META[id].code}</span>
                      <em>{isEn ? FORM_META[id].en || FORM_META[id].zh : FORM_META[id].zh}</em>
                      <b>{forms[id].ready ? (isEn ? 'Ready' : '可生成') : isEn ? 'Incomplete' : '未齊'}</b>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="aside-actions">
                <button className="btn btn--gold btn--sm" onClick={() => navigate('/forms')}>
                  <Icon name="seal" size={13} /> {isEn ? 'Generate' : '一鍵生成'}
                </button>
              </div>
            </div>

            <div className="appendix-card">
              <h4>
                <Icon name="book" size={13} /> {isEn ? 'On this device' : '本機儲存'}
              </h4>
              <dl className="kv">
                <div>
                  <dt>{isEn ? 'Holder' : '持有人'}</dt>
                  <dd>{book.member.nameZh || (isEn ? 'No name yet' : '未填姓名')}</dd>
                </div>
                <div>
                  <dt>{isEn ? 'Created' : '建立日期'}</dt>
                  <dd>{book.meta?.createdAt ? book.meta.createdAt.slice(0, 10) : '—'}</dd>
                </div>
                <div>
                  <dt>{isEn ? 'Updated' : '最後更新'}</dt>
                  <dd>{book.meta?.updatedAt ? book.meta.updatedAt.slice(0, 16).replace('T', ' ') : '—'}</dd>
                </div>
                <div>
                  <dt>{isEn ? 'Items done' : '已完成項目'}</dt>
                  <dd>{progressedCount(book)} / 32</dd>
                </div>
                <div>
                  <dt>{isEn ? 'Data size' : '資料大小'}</dt>
                  <dd>{(size / 1024).toFixed(1)} KB</dd>
                </div>
              </dl>
              <div className="aside-actions">
                <button className="btn btn--ghost btn--sm" onClick={exportJson}>
                  <Icon name="download" size={13} /> {isEn ? 'Export backup' : '匯出備份'}
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => backupRef.current?.click()}>
                  <Icon name="upload" size={13} /> {isEn ? 'Import backup' : '匯入備份'}
                </button>
                <input ref={backupRef} type="file" accept="application/json,.json" hidden onChange={(e) => importJson(e.target.files?.[0])} />
              </div>
            </div>

            <div className="appendix-card">
              <h4>
                <Icon name="qr" size={13} /> {isEn ? 'Share' : '分享'}
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
                <p className="tiny">{isEn ? 'No share link yet. Use “Share” at the top right to create a QR code and link.' : '尚未建立分享。用右上角「分享」即可產生二維碼及連結。'}</p>
              )}
              <div className="aside-actions">
                <ShowQrButton
                  label={isEn ? 'Show QR code for a leader' : '出示二維碼（給領袖掃描）'}
                  className="btn btn--ghost btn--sm"
                />
              </div>
            </div>

            <div className="appendix-card">
              <h4>
                <Icon name="seam" size={13} /> {isEn ? 'ROVERBADGE exchange' : 'ROVERBADGE 互通'}
              </h4>
              <Field
                label="旅團編號"
                value={book.member.troopId || ''}
                onChange={(v) => update((b) => ({ ...b, member: { ...b.member, troopId: v.trim() } }))}
                placeholder="0082"
              />
              <div className="aside-actions">
                <button className="btn btn--ghost btn--sm" onClick={exportRb}>
                  <Icon name="download" size={13} /> {isEn ? 'Export progress' : '匯出進度'}
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => rbRef.current?.click()}>
                  <Icon name="upload" size={13} /> {isEn ? 'Import progress' : '匯入進度'}
                </button>
                <input ref={rbRef} type="file" accept="application/json,.json" hidden onChange={(e) => importRb(e.target.files?.[0])} />
              </div>
              <p className="tiny">{isEn ? 'Only item IDs and dates are exchanged — never signatures.' : '只交換「項目編號 + 日期」，不交換簽名。'}</p>
            </div>
          </div>

          <LegalNote />

          <div className="dangerline">
            <span className="tiny">{isEn ? 'Clearing is permanent and will also break any share links you created.' : '清除本機資料後無法復原（已建立的分享連結亦會失效）。'}</span>
            <button className="btn btn--danger btn--sm" onClick={() => setConfirmClear(true)}>
              <Icon name="trash" size={13} /> {isEn ? 'Clear' : '清除'}
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
