import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { buildSnapshot, DEFAULT_SHARE } from '@shared/book.js';
import { useBook } from '../bookContext.js';
import { saveShare, latestShare } from '../bookStore.js';
import { Icon, Modal, useToast, fmtDate } from '../ui.jsx';

async function downloadPass(id, filename) {
  const res = await fetch('/api/wallet/apple', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  const type = res.headers.get('content-type') || '';
  if (!res.ok) {
    const data = type.includes('json') ? await res.json() : null;
    const err = new Error(data?.error || '未能產生 Apple Wallet 卡片');
    err.data = data;
    throw err;
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export default function WalletDialog({ open, onClose, share, setShare }) {
  const { book } = useBook();
  const { push } = useToast();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState(share);

  useEffect(() => setCurrent(share), [share]);

  useEffect(() => {
    if (!open) return;
    api.get('/wallet/status').then(setStatus).catch(() => setStatus(null));
  }, [open]);

  if (!open) return null;

  const ensureShare = async () => {
    if (current) return current;
    const snapshot = buildSnapshot(book, DEFAULT_SHARE);
    const res = await api.post('/share', { snapshot });
    const record = {
      id: res.id,
      path: res.path,
      url: res.url,
      deleteToken: res.deleteToken,
      include: DEFAULT_SHARE,
      createdAt: res.createdAt,
    };
    saveShare(record);
    setShare(record);
    setCurrent(record);
    return record;
  };

  const addApple = async () => {
    setBusy('apple');
    setError('');
    try {
      const s = await ensureShare();
      await downloadPass(s.id, `roverbook-${s.id}.pkpass`);
      push('已下載 .pkpass，於 iPhone 開啟即可加入錢包');
    } catch (e) {
      setError(e.message);
      if (e.data?.steps) setError(`${e.message}｜缺少：${(e.data.missing || []).join('、')}`);
    } finally {
      setBusy(null);
    }
  };

  const addGoogle = async () => {
    setBusy('google');
    setError('');
    try {
      const s = await ensureShare();
      const res = await fetch('/api/wallet/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        const err = new Error(data.error);
        err.data = data;
        throw err;
      }
      window.open(data.saveUrl, '_blank', 'noopener');
    } catch (e) {
      setError(e.message);
      if (e.data?.missing) setError(`${e.message}｜缺少：${e.data.missing.join('、')}`);
    } finally {
      setBusy(null);
    }
  };

  const appleReady = status?.apple?.configured;
  const googleReady = status?.google?.configured;

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="WALLET"
      title="把紀錄冊放進手機錢包"
      subtitle="Wallet 卡片上的二維碼只連到你分享的紀錄，成員可隨時刪除連結令它失效。"
      wide
    >
      <div className="walletgrid">
        <div className="walletcard">
          <div className="walletcard__top">
            <span>樂行童軍紀錄冊</span>
            <Icon name="wallet" size={16} />
          </div>
          <strong className="walletcard__name">{book.member.nameZh || '你的名字'}</strong>
          <span className="walletcard__crew">{book.member.crew || '樂行童軍團'}</span>
          <div className="walletcard__row">
            <span>會員編號</span>
            <strong>{book.member.memberNo || book.member.ymis || '—'}</strong>
          </div>
          <div className="walletcard__row">
            <span>會籍</span>
            <strong>{(book.renewals || []).slice(-1)[0]?.validUntil || '未續會'}</strong>
          </div>
          <div className="walletcard__qr">
            <Icon name="qr" size={40} />
          </div>
        </div>

        <div className="walletactions">
          <button className="walletbtn" onClick={addApple} disabled={busy === 'apple'}>
            <span className="walletbtn__logo walletbtn__logo--apple"></span>
            <span>
              <strong>{busy === 'apple' ? '產生中…' : '加入 Apple Wallet'}</strong>
              <em>{appleReady ? '已連接簽署憑證' : '需在伺服器設定 Pass Type ID 憑證'}</em>
            </span>
            <Icon name="chevron" size={16} />
          </button>

          <button className="walletbtn" onClick={addGoogle} disabled={busy === 'google'}>
            <span className="walletbtn__logo walletbtn__logo--google">G</span>
            <span>
              <strong>{busy === 'google' ? '產生中…' : '加入 Google Wallet'}</strong>
              <em>{googleReady ? '已連接簽發者帳戶' : '需設定 Issuer ID 及服務帳戶'}</em>
            </span>
            <Icon name="chevron" size={16} />
          </button>

          <div className="pwa">
            <strong>
              <Icon name="download" size={15} /> 加到主畫面（今日即可用）
            </strong>
            <p>
              iPhone：Safari 分享選單 →「加入主畫面」。 Android：Chrome 選單 →「安裝應用程式」。之後一按就開你的紀錄冊，毋須登入。
            </p>
          </div>

          {current && <p className="sharenote">目前連結：{current.path} · 建立於 {fmtDate(current.createdAt, true)}</p>}
          {error && <p className="form-error">{error}</p>}
        </div>
      </div>

      {status && (!appleReady || !googleReady) && (
        <details className="setup">
          <summary>錢包簽發憑證設定（管理員）</summary>
          <div className="setup__cols">
            <div>
              <h4>Apple Wallet</h4>
              <ol>
                {status.apple.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              {status.apple.missing.length > 0 && <p className="hint">尚未設定：{status.apple.missing.join('、')}</p>}
            </div>
            <div>
              <h4>Google Wallet</h4>
              <ol>
                {status.google.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              {status.google.missing.length > 0 && <p className="hint">尚未設定：{status.google.missing.join('、')}</p>}
            </div>
          </div>
          <p className="hint">
            設定好環境變數並重新啟動伺服器，即可直接在此按鈕簽發。詳細步驟見 README「錢包」一節。
          </p>
        </details>
      )}
    </Modal>
  );
}
