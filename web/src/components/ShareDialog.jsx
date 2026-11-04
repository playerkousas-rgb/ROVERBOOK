import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { buildSnapshot, SHARE_SECTIONS, DEFAULT_SHARE } from '@shared/book.js';
import { useBook } from '../bookContext.js';
import { saveShare, forgetShare } from '../bookStore.js';
import { Icon, Modal, useToast, cx, fmtDate } from '../ui.jsx';

export default function ShareDialog({ open, onClose, share, setShare }) {
  const { book } = useBook();
  const { push } = useToast();
  const [include, setInclude] = useState(share?.include || DEFAULT_SHARE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setInclude(share?.include || DEFAULT_SHARE);
      setError('');
    }
  }, [open, share]);

  const url = useMemo(() => (share ? `${window.location.origin}${share.path}` : ''), [share]);

  if (!open) return null;

  const publish = async () => {
    setBusy(true);
    setError('');
    try {
      const snapshot = buildSnapshot(book, include);
      const res = await api.post('/share', { snapshot });
      const record = {
        id: res.id,
        path: res.path,
        url: res.url,
        deleteToken: res.deleteToken,
        include,
        createdAt: res.createdAt,
      };
      saveShare(record);
      setShare(record);
      if (share?.deleteToken && share.id !== res.id) {
        api.del(`/share/${share.id}`, { deleteToken: share.deleteToken }).catch(() => {});
      }
      push('分享連結已更新');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!share) return;
    if (!confirm('刪除這個分享連結？已傳出去的網址及二維碼會即時失效。')) return;
    try {
      await api.del(`/share/${share.id}`, { deleteToken: share.deleteToken });
      forgetShare(share.id);
      setShare(null);
      push('連結已刪除');
    } catch (e) {
      push(e.message, 'error');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      push('已複製連結');
    } catch {
      push('瀏覽器未允許複製，請長按選取', 'error');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="SHARE"
      title="分享我的紀錄"
      subtitle="對方毋須登入或安裝程式，開啟連結即可讀取你勾選的章節。你隨時可以刪除連結。"
      wide
    >
      <div className="sharegrid">
        <div className="sharegrid__main">
          <h3 className="subhead">分享內容</h3>
          <ul className="shareopts">
            {SHARE_SECTIONS.map((s) => (
              <li key={s.key}>
                <label className={cx('shareopt', include[s.key] && 'is-on')}>
                  <input
                    type="checkbox"
                    checked={!!include[s.key]}
                    onChange={(e) => setInclude((prev) => ({ ...prev, [s.key]: e.target.checked }))}
                  />
                  <span>
                    <strong>{s.label}</strong>
                    <em>{s.note || s.en}</em>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {include.contact && (
            <p className="warnline">
              <Icon name="alert" size={14} /> 你正在分享電話、地址及緊急聯絡人，請確認對方值得信任。
            </p>
          )}
          <div className="form-actions">
            <button className="btn btn--primary" onClick={publish} disabled={busy}>
              <Icon name="link" size={16} /> {busy ? '產生中…' : share ? '更新連結內容' : '建立分享連結'}
            </button>
          </div>
          {error && <p className="form-error">{error}</p>}
        </div>

        <div className="sharegrid__side">
          {share ? (
            <>
              <div className="shareqr">
                <img src={`/api/qr.svg?d=${encodeURIComponent(url)}`} alt="分享二維碼" />
              </div>
              <code className="shareurl">{url}</code>
              <p className="sharenote">更新內容會產生新連結，舊連結即時失效。</p>
              <div className="sharebtns">
                <button className="btn btn--ghost btn--sm" onClick={copy}>
                  <Icon name="copy" size={14} /> 複製
                </button>
                <a className="btn btn--ghost btn--sm" href={share.path} target="_blank" rel="noreferrer">
                  <Icon name="external" size={14} /> 預覽
                </a>
              </div>
              <p className="sharestamp">
                建立於 {fmtDate(share.createdAt, true)}
                <button className="linkbtn linkbtn--danger linkbtn--small" onClick={remove}>
                  刪除連結
                </button>
              </p>
            </>
          ) : (
            <div className="shareempty">
              <Icon name="qr" size={30} />
              <p>建立連結後，這裡會出現二維碼；領袖用 ROVERBOOK 的「掃描二維碼」即可讀取你的紀錄。</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
