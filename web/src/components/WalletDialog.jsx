import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { buildSnapshot, DEFAULT_SHARE } from '@shared/book.js';
import { useBook } from '../bookContext.js';
import { saveShare } from '../bookStore.js';
import { Icon, Modal, useToast, fmtDate, cx } from '../ui.jsx';

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
  const [guide, setGuide] = useState(true);
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
      setGuide(true);
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
      setGuide(true);
    } finally {
      setBusy(null);
    }
  };

  const appleReady = !!status?.apple?.configured;
  const googleReady = !!status?.google?.configured;

  return (
    <Modal
      onClose={onClose}
      eyebrow="WALLET"
      title="手機錢包"
      subtitle="錢包卡上的二維碼只連到你分享的紀錄；你隨時可以刪除連結令它失效。"
      wide
    >
      <div className="walletgrid">
        <div className="walletcard">
          <div className="walletcard__top">
            <span>樂行童軍紀錄冊</span>
            <Icon name="wallet" size={15} />
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
            <Icon name="qr" size={36} />
          </div>
        </div>

        <div className="walletactions">
          <button className="walletbtn" onClick={addApple} disabled={busy === 'apple'}>
            <span className="walletbtn__logo walletbtn__logo--apple">&#63743;</span>
            <span>
              <strong>{busy === 'apple' ? '產生中…' : '加入 Apple Wallet'}</strong>
              <em>{appleReady ? '已連接簽署憑證' : '未設定憑證 · 需 Apple Developer 帳戶'}</em>
            </span>
            <span className={cx('dot', appleReady ? 'dot--ok' : 'dot--off')} />
          </button>

          <button className="walletbtn" onClick={addGoogle} disabled={busy === 'google'}>
            <span className="walletbtn__logo walletbtn__logo--google">G</span>
            <span>
              <strong>{busy === 'google' ? '產生中…' : '加入 Google Wallet'}</strong>
              <em>{googleReady ? '已連接簽發者帳戶' : '未設定 · 需 Google Wallet 帳戶'}</em>
            </span>
            <span className={cx('dot', googleReady ? 'dot--ok' : 'dot--off')} />
          </button>

          <div className="pwa">
            <strong>
              <Icon name="download" size={14} /> 今日就可以用：加到主畫面
            </strong>
            <p>
              iPhone：用 Safari 開啟本頁 → 分享 →「加入主畫面」。Android：Chrome 右上選單 →「安裝應用程式」。
              之後一按就開，毋須登入、毋須憑證。
            </p>
          </div>

          {current && (
            <p className="sharenote">
              目前分享連結：{current.path} · 建立於 {fmtDate(current.createdAt, true)}
            </p>
          )}
          {error && <p className="form-error">{error}</p>}
        </div>
      </div>

      <button className="guidetoggle" onClick={() => setGuide((g) => !g)}>
        <Icon name={guide ? 'down' : 'chevron'} size={13} />
        我需要準備甚麼？（用家版說明）
      </button>

      {guide && (
        <div className="guide">
          <div className="guide__row">
            <span className="guide__tag">最快</span>
            <div>
              <strong>不加憑證都可以用</strong>
              <p>
                紀錄冊本身、二維碼分享、列印全部都唔需要 Wallet。只要「加到主畫面」，開啟速度同 App 一樣。
              </p>
            </div>
          </div>

          <div className="guide__row">
            <span className="guide__tag guide__tag--apple">Apple</span>
            <div>
              <strong>Apple Wallet 需要一個付費開發者帳戶</strong>
              <ol>
                <li>用 Apple ID 登記 Apple Developer Program（個人名義，年費約 US$99）。</li>
                <li>在 Certificates → Identifiers → Pass Type IDs 建立一個 ID，例如 <code>pass.hk.yourname.roverbook</code>。</li>
                <li>下載對應的 <code>.p12</code> 憑證，連同 Apple WWDR 憑證，放上伺服器。</li>
                <li>設定 5 個環境變數（Pass Type ID、Team ID、憑證路徑、憑證密碼、WWDR 路徑）並重啟。</li>
              </ol>
              <p className="tiny">
                這一步只做一次；係 Apple 的規則，任何 App 都一樣。你唔想付費，用「加到主畫面」即可。
              </p>
            </div>
          </div>

          <div className="guide__row">
            <span className="guide__tag guide__tag--google">Google</span>
            <div>
              <strong>Google Wallet 免費，但要開通 Issuer 帳戶</strong>
              <ol>
                <li>用 Google 帳戶登入 Google Wallet Business Console，取得 Issuer ID（免費）。</li>
                <li>建立一個 Generic Class（例如 <code>roverbook.card</code>）。</li>
                <li>建立服務帳戶並下載 JSON 金鑰。</li>
                <li>設定 3 個環境變數（Issuer ID、Class ID、JSON 路徑）並重啟。</li>
              </ol>
            </div>
          </div>

          <div className="guide__row guide__row--status">
            <span className="guide__tag guide__tag--status">現況</span>
            <div>
              <strong>這部伺服器</strong>
              <div className="chips">
                <span className={cx('chip', appleReady ? 'chip--ok' : 'chip--off')}>
                  Apple：{appleReady ? '已設定' : `欠 ${status?.apple?.missing?.length ?? 5} 項`}
                </span>
                <span className={cx('chip', googleReady ? 'chip--ok' : 'chip--off')}>
                  Google：{googleReady ? '已設定' : `欠 ${status?.google?.missing?.length ?? 3} 項`}
                </span>
              </div>
              {status && (
                <details className="setup">
                  <summary>技術細節（給管理員）</summary>
                  <div className="setup__cols">
                    <div>
                      <h4>Apple</h4>
                      <ol>
                        {status.apple.steps.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ol>
                      {status.apple.missing.length > 0 && <p className="hint">尚未設定：{status.apple.missing.join('、')}</p>}
                    </div>
                    <div>
                      <h4>Google</h4>
                      <ol>
                        {status.google.steps.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ol>
                      {status.google.missing.length > 0 && <p className="hint">尚未設定：{status.google.missing.join('、')}</p>}
                    </div>
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
