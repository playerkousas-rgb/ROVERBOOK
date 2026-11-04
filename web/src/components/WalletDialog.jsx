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
      subtitle="最快的方法：把紀錄冊加到手機主畫面。錢包卡只是額外選項，完全可以跳過。"
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
          <div className="pwa pwa--primary">
            <strong>
              <Icon name="download" size={15} /> 加到主畫面（建議，今日就可以用）
            </strong>
            <ol className="pwa__steps">
              <li>
                <span className="pwa__os">iPhone</span>用 <b>Safari</b> 開啟本頁 → 底部「分享」掣 → 揀「加入主畫面」→ 右上「新增」。
              </li>
              <li>
                <span className="pwa__os">Android</span>用 <b>Chrome</b> 開啟本頁 → 右上三點 → 揀「安裝應用程式」或「加到主畫面」。
              </li>
            </ol>
            <p className="pwa__note">
              之後由主畫面一按即開，全螢幕、毋須登入、毋須任何憑證，亦唔會過期。
              開完之後，紀錄冊會用你手機嘅儲存空間，離線都開得。
            </p>
          </div>

          <button className="walletbtn" onClick={addApple} disabled={busy === 'apple'}>
            <span className="walletbtn__logo walletbtn__logo--apple">&#63743;</span>
            <span>
              <strong>{busy === 'apple' ? '產生中…' : '（可選）加入 Apple Wallet'}</strong>
              <em>{appleReady ? '已連接簽署憑證' : '要付費開發者帳戶；唔想付費可略過'}</em>
            </span>
            <span className={cx('dot', appleReady ? 'dot--ok' : 'dot--off')} />
          </button>

          <button className="walletbtn" onClick={addGoogle} disabled={busy === 'google'}>
            <span className="walletbtn__logo walletbtn__logo--google">G</span>
            <span>
              <strong>{busy === 'google' ? '產生中…' : '（可選）加入 Google Wallet'}</strong>
              <em>{googleReady ? '已連接簽發者帳戶' : '免費但要開通 Issuer 帳戶'}</em>
            </span>
            <span className={cx('dot', googleReady ? 'dot--ok' : 'dot--off')} />
          </button>

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
        三條路有咩分別？（用家版說明）
      </button>

      {guide && (
        <div className="guide">
          <div className="guide__row">
            <span className="guide__tag">建議</span>
            <div>
              <strong>「加到主畫面」已經等於一個 App</strong>
              <p>
                唔需要開發者帳戶、唔需要付費、唔需要設定任何東西。圖示會出現喺你手機主畫面，
                一按即開；填寫、簽名、分享、列印全部照用。Apple／Google Wallet 只係「多一個入口」，唔加都完全正常。
              </p>
            </div>
          </div>

          <div className="guide__row">
            <span className="guide__tag guide__tag--apple">Apple</span>
            <div>
              <strong>Apple Wallet：必須有付費開發者帳戶（唔急就唔好搞）</strong>
              <ol>
                <li>用 Apple ID 登記 Apple Developer Program（個人名義，年費約 US$99）。</li>
                <li>登入開發者網站，建立一個 Pass Type ID（例如 <code>pass.hk.你的名.roverbook</code>）。</li>
                <li>下載對應的簽署憑證（.p12），連同 Apple WWDR 憑證交給管理員放上伺服器。</li>
                <li>管理員設定 5 個環境變數後重啟，之後「加入 Apple Wallet」就會work。</li>
              </ol>
              <p className="tiny">
                這一步只做一次；係 Apple 的規則，任何 App 都一樣。你唔想付費，用「加到主畫面」即可。
              </p>
            </div>
          </div>

          <div className="guide__row">
            <span className="guide__tag guide__tag--google">Google</span>
            <div>
              <strong>Google Wallet：免費，但要開通 Issuer 帳戶</strong>
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
