import React, { useEffect, useState } from 'react';
import { navigate } from '../router.jsx';
import { Icon } from '../ui.jsx';
import { useLang } from '../i18n.jsx';
import { enterLeaderMode, leaderAvailable } from '../leader.js';

/**
 * 領袖模式入口。可以當成一頁（/leader）用，亦可以在掃描頁前面當閘門。
 *
 * @param {'page'|'gate'} mode  gate = 由掃描頁擋落嚟，成功後直接去掃描
 * @param {() => void} onDone   成功後回呼（預設跳去 /scan）
 */
export default function LeaderGate({ mode = 'page', onDone }) {
  const { isEn } = useLang();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [available, setAvailable] = useState(null);

  useEffect(() => {
    let live = true;
    leaderAvailable().then((v) => live && setAvailable(v));
    return () => {
      live = false;
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const result = await enterLeaderMode(code);
    setBusy(false);
    if (result.ok) {
      setError('');
      if (onDone) onDone();
      else navigate('/scan');
      return;
    }
    setError(
      result.reason === 'unset'
        ? isEn
          ? 'This deployment has no leader code yet. Set LEADER_CODE in Vercel and redeploy.'
          : '這個部署還未設定領袖密碼。請在 Vercel 加入環境變數 LEADER_CODE（唔要 VITE_ 前綴），然後重新部署。'
        : result.reason === 'offline'
          ? isEn
            ? 'Cannot reach the server. Connect to the internet once to enter leader mode.'
            : '連不到伺服器。請先連上網絡一次，才可進入領袖模式。'
          : isEn
            ? 'Wrong code. Ask your Group Scout Leader for the current one.'
            : '密碼不正確，請向團長或旅長查詢。',
    );
  };

  return (
    <div className="leadergate">
      <div className="leadergate__card">
        <span className="leadergate__eyebrow">LEADER MODE</span>
        <h2 className="leadergate__title">{isEn ? 'Leader mode' : '領袖模式'}</h2>
        <p className="leadergate__lead">
          {isEn
            ? 'Members can only show their QR code. Scanning a member’s book and signing it off are leader functions — enter the leader code to continue.'
            : '成員只可以出示自己的二維碼；掃描成員的紀錄冊、核對及簽署，都是領袖的功能。輸入領袖密碼即可使用。'}
        </p>

        {available === false && (
          <p className="leadergate__note">
            <Icon name="alert" size={14} />
            <span>
              {isEn
                ? 'LEADER_CODE is not set for this deployment, so leader mode is closed.'
                : '此部署未設定 LEADER_CODE，領袖模式暫時關閉。'}
            </span>
          </p>
        )}

        <form className="leadergate__form" onSubmit={submit}>
          <label className="leadergate__label" htmlFor="leader-code">
            {isEn ? 'Leader code' : '領袖密碼'}
          </label>
          <div className="leadergate__row">
            <input
              id="leader-code"
              className="leadergate__input"
              type={show ? 'text' : 'password'}
              inputMode="numeric"
              autoComplete="off"
              placeholder={isEn ? 'Enter code' : '輸入密碼'}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError('');
              }}
              disabled={available === false || busy}
            />
            <button
              type="button"
              className="leadergate__eye"
              aria-label={isEn ? 'Show code' : '顯示密碼'}
              onClick={() => setShow((v) => !v)}
            >
              <Icon name={show ? 'x' : 'zoom'} size={15} />
            </button>
          </div>
          {error && <p className="leadergate__error">{error}</p>}
          <button
            className="btn btn--primary leadergate__go"
            type="button"
            onClick={submit}
            disabled={available === false || busy}
          >
            {busy
              ? isEn ? 'Checking…' : '核對中…'
              : isEn ? 'Enter leader mode' : '進入領袖模式'}
          </button>
        </form>

        <button className="leadergate__back" onClick={() => navigate('/')} type="button">
          {isEn ? 'Back to the book' : '返回紀錄冊'}
        </button>
      </div>
    </div>
  );
}
