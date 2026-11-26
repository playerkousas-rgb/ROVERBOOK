import React, { useCallback, useEffect, useState } from 'react';
import { Icon, useToast } from '../ui.jsx';
import { useLang } from '../i18n.jsx';
import {
  checkEmbedOrigin,
  iframeSnippet,
  localWhitelistInfo,
  probeEmbedWhitelist,
} from '../embedWhitelist.js';

/**
 * 嵌入白名單系統（數位附錄）：
 *   - 顯示部署生效的嵌入白名單（/api/embed；離線退回 shared/embed.js 預設）；
 *   - 一鍵複製 CSP 值與平台 iframe 範例；
 *   - 即場核實任何來源是否獲准嵌入；
 *   - 交代管理方法（自架 EMBED_WHITELIST；Vercel sync:embed + redeploy）。
 * 白名單屬公開資訊，只讀不寫；成員離線填寫、簽名、列印完全不受影響。
 */
export default function EmbedWhitelistCard() {
  const { isEn } = useLang();
  const { push } = useToast();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await probeEmbedWhitelist();
    setInfo(data || localWhitelistInfo());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const copy = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      push(isEn ? `${label} copied` : `已複製${label}`);
    } catch {
      push(isEn ? 'Clipboard blocked — long-press to select' : '瀏覽器未允許複製，請長按選取', 'error');
    }
  };

  const runCheck = async () => {
    const raw = origin.trim();
    if (!raw) {
      push(isEn ? 'Enter an origin, e.g. https://portal.example.com' : '請輸入來源，例如 https://portal.example.com', 'error');
      return;
    }
    setChecking(true);
    setResult(await checkEmbedOrigin(raw, info));
    setChecking(false);
  };

  if (!info) {
    return (
      <div className="appendix-card embedwl no-print">
        <h4><Icon name="external" size={13} /> {isEn ? 'Embed whitelist' : '嵌入白名單'}</h4>
        <p className="tiny">{isEn ? 'Reading the deployed whitelist…' : '正在讀取部署白名單…'}</p>
      </div>
    );
  }

  const snippet = iframeSnippet(typeof window === 'undefined' ? '' : window.location.origin);
  const online = !info.offline;

  return (
    <div className="appendix-card embedwl no-print">
      <h4>
        <Icon name="external" size={13} /> {isEn ? 'Embed whitelist · service platforms' : '嵌入白名單 · 服務平台'}
      </h4>
      <p className="embedwl__sub">
        {isEn
          ? 'Only ROVERBOOK itself and the origins below may embed this book in an iframe (CSP frame-ancestors). Anyone else is blocked by the browser before the app loads.'
          : '只有 ROVERBOOK 自身及下列來源可以用 iframe 嵌入本紀錄冊（CSP frame-ancestors）；其他來源會被瀏覽器直接擋下，連程式都不会載入。'}
      </p>

      <div className="embedwl__statusrow">
        <span className={`embedwl__status${online ? '' : ' embedwl__status--offline'}`}>
          <Icon name={online ? 'verified' : 'info'} size={11} />
          {online
            ? isEn ? 'Connected to the deployed whitelist' : '已連接部署白名單'
            : isEn ? 'Offline — showing the built-in default whitelist' : '離線／獨立模式 — 顯示內建預設白名單'}
        </span>
        <button type="button" className="btn btn--ghost btn--sm" onClick={refresh} disabled={loading}>
          <Icon name="refresh" size={12} /> {isEn ? (loading ? 'Reading…' : 'Reload') : loading ? '讀取中…' : '重新讀取'}
        </button>
      </div>

      <ul className="embedwl__list">
        {info.origins.map((o) => (
          <li key={o} className="embedwl__origin">
            <code>{o}</code>
            <span className="embedwl__badge">
              {o === info.portal
                ? isEn ? 'Official portal' : '正式服務平台'
                : (info.extraOrigins || []).includes(o)
                  ? isEn ? 'Env override' : '環境變數追加'
                  : isEn ? 'Default' : '預設'}
            </span>
          </li>
        ))}
      </ul>

      {info.invalid?.length > 0 && (
        <p className="embedwl__warn">
          <Icon name="alert" size={11} />{' '}
          {isEn
            ? `Ignored ${info.invalid.length} invalid EMBED_WHITELIST entries: ${info.invalid.join(', ')}`
            : `EMBED_WHITELIST 有 ${info.invalid.length} 項不合格已忽略：${info.invalid.join('、')}`}
        </p>
      )}

      <div className="embedwl__csp">
        <span className="embedwl__csplabel">{isEn ? 'Deployed header' : '部署標頭'}</span>
        <code>{info.frameAncestors}</code>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => copy(info.frameAncestors, isEn ? 'CSP header' : 'CSP 標頭')}
        >
          <Icon name="copy" size={12} /> {isEn ? 'Copy' : '複製'}
        </button>
      </div>

      <div className="embedwl__csp">
        <span className="embedwl__csplabel">{isEn ? 'Platform iframe' : '平台 iframe 範例'}</span>
        <code>{snippet}</code>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => copy(snippet, isEn ? 'iframe snippet' : 'iframe 範例')}
        >
          <Icon name="copy" size={12} /> {isEn ? 'Copy' : '複製'}
        </button>
      </div>

      <div className="embedwl__check">
        <label className="embedwl__checklabel" htmlFor="embedwl-origin">
          {isEn ? 'Check an origin' : '核實來源'}
        </label>
        <div className="embedwl__checkrow">
          <input
            id="embedwl-origin"
            type="url"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="https://portal.example.com"
            value={origin}
            onChange={(e) => {
              setOrigin(e.target.value);
              setResult(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runCheck();
            }}
          />
          <button type="button" className="btn btn--gold btn--sm" onClick={runCheck} disabled={checking}>
            <Icon name="verified" size={12} /> {isEn ? (checking ? 'Checking…' : 'Check') : checking ? '核實中…' : '核實'}
          </button>
        </div>
        {result && (
          <p className={`embedwl__result${result.allowed ? ' embedwl__result--ok' : ' embedwl__result--no'}`} role="status">
            <Icon name={result.allowed ? 'check' : 'x'} size={12} />
            {result.allowed
              ? isEn
                ? `${result.normalized} is whitelisted — embedding allowed.`
                : `${result.normalized} 已在白名單 — 獲准嵌入。`
              : result.reason === 'invalid-origin'
                ? isEn
                  ? 'Not a valid origin. Use https://host (no path, no wildcard, no credentials).'
                  : '不是合格來源：請用 https://主機（不含路徑、萬用字元或帳號密碼）。'
                : isEn
                  ? `${result.normalized} is NOT whitelisted — the browser will block the iframe.`
                  : `${result.normalized} 未列入白名單 — 瀏覽器會擋下 iframe。`}
            {result.source === 'local' && (
              <em>{isEn ? ' (checked against the local default list)' : '（以本地預設清單比對）'}</em>
            )}
          </p>
        )}
      </div>

      <p className="embedwl__note">
        {isEn
          ? 'To add a platform: self-hosted — set EMBED_WHITELIST="https://a.app https://b.app" and restart; Vercel — add the origin to EMBED_WHITELIST in shared/embed.js, run npm run sync:embed, then redeploy. Only https origins are accepted (localhost http for dev/testing).'
          : '追加平台：自架伺服器 — 設定 EMBED_WHITELIST="https://a.app https://b.app" 後重啟；Vercel — 把來源加入 shared/embed.js 的 EMBED_WHITELIST，執行 npm run sync:embed 後 redeploy。只接受 https 來源（本機開發／測試先容許 http://localhost）。'}
      </p>
    </div>
  );
}
