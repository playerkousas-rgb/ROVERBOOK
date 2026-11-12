import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useBook } from '../bookContext.js';
import { useToast, Icon, cx } from '../ui.jsx';
import { download, slugify } from '../bookStore.js';
import { isLeader } from '../leader.js';
import { api } from '../api.js';
import { useLang } from '../i18n.jsx';
import {
  collectPendingForRoverBadge,
  exportForRoverBadge,
  importFromRoverBadge,
  isDemoBook,
  normalizeScoutId,
  scoutId,
} from '@shared/book.js';
import {
  DEFAULT_ROVERBADGE_URL,
  TROOP_NOT_FOUND,
  pickTroopId,
  probeRoverBadgeBridge,
  sortTroopEntries,
} from '../roverbadgeBridge.js';

const ROVERBADGE_MEMBER_SESSION_KEY = 'roverbook.roverbadge.member.v1';

function readMemberSession() {
  try {
    const sess = JSON.parse(window.sessionStorage.getItem(ROVERBADGE_MEMBER_SESSION_KEY) || 'null');
    // 只有完整的登入狀態才算「已連接」；殘缺資料一律當作未連接，進度檔匯出／匯入保持鎖定。
    return sess && typeof sess === 'object' && sess.token && sess.ymis && sess.troopId ? sess : null;
  } catch {
    return null;
  }
}

function writeMemberSession(sess) {
  try {
    if (!sess) window.sessionStorage.removeItem(ROVERBADGE_MEMBER_SESSION_KEY);
    else window.sessionStorage.setItem(ROVERBADGE_MEMBER_SESSION_KEY, JSON.stringify(sess));
  } catch {
    /* private mode */
  }
}

const T = {
  zh: {
    cardTitle: '可選：與 ROVERBADGE 同步個人進度（只同步進度 · 零個人資料）',
    cardSub:
      '不連接 ROVERBADGE 亦可使用完整紀錄冊、簽名、表格、列印與二維碼。連接後可免除重複輸入：由 BOOK 送往 ROVERBADGE 一律轉為「待領袖核實（pending）」；由 ROVERBADGE 錄入回 BOOK 時，只無條件相信領袖已核實的資料，未核實項目絕不錄入。',
    statsVerified: '已獲核實／簽署項目',
    statsPending: '本機新填待送交',
    statsAwaiting: 'ROVERBADGE 等候領袖 CONFIRM',
    connect: '連接我的 ROVERBADGE 帳戶',
    troop: '已登記旅團',
    manualTroopLabel: '旅團編號',
    scoutId: '我的童軍成員編號（SCOUT ID）',
    password: 'ROVERBADGE 密碼',
    loginBtn: '登入並錄入已核實進度',
    logoutBtn: '登出 ROVERBADGE',
    btnDownload: '從 ROVERBADGE 錄入「領袖已核實」進度',
    btnUpload: '送交 ROVERBADGE 待領袖核實（{n} 項）',
    exportFile: '匯出「待領袖核實」進度檔',
    importFile: '從 ROVERBADGE 匯入「領袖已核實」進度檔',
    leaderReadonly: '領袖只讀模式下不可修改本機紀錄冊',
    loggedInAs: '已連接 ROVERBADGE：{name}（{troop}）',
    imported: '已從 ROVERBADGE 錄入 {n} 項領袖已核實進度',
    importedNone: '沒有新的領袖已核實進度可錄入',
    submitted: '已送交 {n} 項進度至 ROVERBADGE 待領袖核實',
    submittedNone: '紀錄冊內的項目均已在 ROVERBADGE 核實或等候批核，無須重複送交',
    skippedPending: '（另有 {n} 項待領袖核實，未錄入）',
    errLogin: '登入失敗：{m}',
    errLoad: '讀取 ROVERBADGE 進度失敗：{m}',
    errSubmit: '送交 ROVERBADGE 失敗：{m}',
    errImport: '匯入 ROVERBADGE 失敗：{m}',
    offlineExport: '已匯出「待領袖核實」純進度檔（status: pending，不含個人資料）',
    offlineImport: '已從 ROVERBADGE 匯入 {n} 項領袖已核實進度',
    signedOut: '已登出 ROVERBADGE（本機紀錄冊資料完全保留）',
    demoLock: '示範紀錄冊不可與 ROVERBADGE 同步',
    demoLockBody:
      '目前載入的是示範樣本（只供測試，不可遞交）。為免虛構資料進入正式系統，登入、送交待核實、匯出及匯入進度檔一律停用；完整紀錄冊備份與還原仍可在下方離線使用。',
  },
  en: {
    cardTitle: 'Optional: Sync Personal Progress with ROVERBADGE (Progress Only · Zero PII)',
    cardSub:
      'Everything works without ROVERBADGE: full record book, signatures, forms, printing, and QR. Connecting saves double typing: BOOK → ROVERBADGE always submits as “Pending Leader Confirmation”; ROVERBADGE → BOOK trusts only leader-confirmed items.',
    statsVerified: 'Leader-verified items',
    statsPending: 'Locally filled, pending submission',
    statsAwaiting: 'Awaiting leader CONFIRM in ROVERBADGE',
    connect: 'Connect my ROVERBADGE account',
    troop: 'Registered Group / Unit',
    manualTroopLabel: 'Group ID',
    scoutId: 'My SCOUT member ID',
    password: 'ROVERBADGE password',
    loginBtn: 'Connect & Sync Confirmed',
    logoutBtn: 'Sign out of ROVERBADGE',
    btnDownload: 'Pull Leader-Confirmed from ROVERBADGE',
    btnUpload: 'Submit to ROVERBADGE as Pending ({n} items)',
    exportFile: 'Export pending-for-verification progress file',
    importFile: 'Import leader-confirmed progress file from ROVERBADGE',
    leaderReadonly: 'Leader mode is read-only: local record book cannot be modified',
    loggedInAs: 'Connected to ROVERBADGE: {name} ({troop})',
    imported: 'Imported {n} leader-verified items from ROVERBADGE',
    importedNone: 'No new leader-verified progress to import',
    submitted: 'Sent {n} items to ROVERBADGE for leader confirmation',
    submittedNone: 'All recorded items are already confirmed or pending in ROVERBADGE',
    skippedPending: ' ({n} pending items skipped)',
    errLogin: 'Sign-in failed: {m}',
    errLoad: 'Failed to load from ROVERBADGE: {m}',
    errSubmit: 'Failed to submit to ROVERBADGE: {m}',
    errImport: 'Import failed: {m}',
    offlineExport: 'Exported Pending submission JSON (status: pending, zero personal data)',
    offlineImport: 'Imported {n} leader-confirmed items from ROVERBADGE',
    signedOut: 'Signed out of ROVERBADGE (your local record book is untouched)',
    demoLock: 'Demo record book cannot sync with ROVERBADGE',
    demoLockBody:
      'This is a demo sample (for testing only, not for submission). Sign-in, pending submission, progress export and import are disabled so fictional data cannot enter the live system. Full record-book backup and restore remain available offline below.',
  },
};

export default function RoverBadgeSyncCard({ readOnly: readOnlyProp = false } = {}) {
  const { book, update } = useBook();
  const { isEn } = useLang();
  const { push } = useToast();
  const t = T[isEn ? 'en' : 'zh'];
  const fileRef = useRef(null);
  const troopFieldId = useId();

  const demo = isDemoBook(book);
  const mySid = scoutId(book?.member);
  const [bridge, setBridge] = useState('checking'); // 'checking' | 'ready' | 'unavailable'
  const [troops, setTroops] = useState({});
  const [badgeOrigin, setBadgeOrigin] = useState(DEFAULT_ROVERBADGE_URL);
  const [upstreamOk, setUpstreamOk] = useState(true);
  const [troopId, setTroopId] = useState(() => String(readMemberSession()?.troopId || ''));
  const [manualTroop, setManualTroop] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginScoutId, setLoginScoutId] = useState(() => mySid || readMemberSession()?.ymis || '');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState(() => readMemberSession());
  const [remoteConfirmed, setRemoteConfirmed] = useState([]);
  const [remotePendingIds, setRemotePendingIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const leaderMode = readOnlyProp || isLeader();
  const hasBadgeSession = Boolean(session?.token && session?.ymis);
  const troopEntries = useMemo(() => sortTroopEntries(troops), [troops]);

  useEffect(() => {
    if (mySid && !loginScoutId) setLoginScoutId(mySid);
  }, [mySid, loginScoutId]);

  const probeBridge = useCallback(async () => {
    setBridge('checking');
    const result = await probeRoverBadgeBridge();
    if (!result.available) {
      setBridge('unavailable');
      return;
    }
    const nextTroops = result.troops || {};
    setTroops(nextTroops);
    setBadgeOrigin(result.origin || DEFAULT_ROVERBADGE_URL);
    setUpstreamOk(result.upstreamOk !== false);
    setBridge('ready');
    if (sortTroopEntries(nextTroops).length > 0) setManualTroop(false);
    // 有多個旅團時不代為預選：必須由用戶在選單明確選擇自己的旅團。
    setTroopId((prev) => pickTroopId(prev, nextTroops));
  }, []);

  useEffect(() => {
    if (demo) return;
    probeBridge();
  }, [demo, probeBridge]);

  const verifiedCount = useMemo(
    () =>
      Object.values(book?.progress || {}).filter(
        (p) => p && (p.confirmedByBadge || (p.date && p.signature?.png)),
      ).length,
    [book],
  );

  const { pendingRequests, count: localPendingCount } = useMemo(
    () => collectPendingForRoverBadge(book, remoteConfirmed, remotePendingIds),
    [book, remoteConfirmed, remotePendingIds],
  );

  const handleLoadConfirmed = async (activeSession = session) => {
    if (demo) {
      push(t.demoLock, 'error');
      return;
    }
    if (!activeSession?.token || !activeSession?.ymis || !activeSession?.troopId) return;
    if (leaderMode) {
      push(t.leaderReadonly, 'error');
      return;
    }
    setBusy(true);
    setStatus('');
    try {
      const sid = activeSession.scoutId || activeSession.ymis;
      const data = await api.post('/roverbadge', {
        action: 'load',
        troopId: activeSession.troopId,
        scoutId: sid,
        token: activeSession.token,
      });
      if (!data.success) throw new Error(data.error || '讀取未成功');
      const progress = data.progress || {};
      const confirmedIds = Object.keys(progress);
      const pendingIds = (data.pendingRequests || []).map((p) => p.itemId).filter(Boolean);
      setRemoteConfirmed(confirmedIds);
      setRemotePendingIds(pendingIds);

      const json = { progress: { [sid]: progress } };
      const previewDraft = structuredClone(book);
      if (!previewDraft.member.scoutId) {
        previewDraft.member.scoutId = sid;
        previewDraft.member.memberNo = sid;
      }
      const result = importFromRoverBadge(json, previewDraft);

      update((prev) => {
        const draft = structuredClone(prev);
        if (!draft.member.scoutId) {
          draft.member.scoutId = sid;
          draft.member.memberNo = sid;
        }
        const applied = importFromRoverBadge(json, draft);
        draft.member = applied.member;
        return draft;
      });

      const pendingSuffix = result.skippedPending?.length
        ? t.skippedPending.replace('{n}', result.skippedPending.length)
        : '';
      if (result.imported) {
        push(t.imported.replace('{n}', result.imported) + pendingSuffix);
      } else {
        push(t.importedNone + pendingSuffix);
      }
    } catch (e) {
      if (e.status === 401) {
        setSession(null);
        writeMemberSession(null);
      }
      const msg = t.errLoad.replace('{m}', e.message || '');
      setStatus(msg);
      push(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (demo) {
      push(t.demoLock, 'error');
      return;
    }
    const cleanTroop = troopId.trim();
    const cleanScout = (loginScoutId || mySid || '').trim();
    if (!cleanTroop || cleanTroop === TROOP_NOT_FOUND || !cleanScout || !password) {
      push(
        isEn
          ? 'Select your registered group, then enter your Scout ID and ROVERBADGE password'
          : '請選擇已登記旅團，並填寫你的童軍成員編號及 ROVERBADGE 密碼',
        'error',
      );
      return;
    }
    setBusy(true);
    setStatus('');
    try {
      const data = await api.post('/roverbadge', {
        action: 'login',
        troopId: cleanTroop,
        scoutId: cleanScout,
        password,
      });
      if (!data.success || !data.token) throw new Error(data.error || '登入未成功');
      const ymis = normalizeScoutId(data.ymis || cleanScout);
      const troopName = troopEntries.find(([id]) => id === cleanTroop)?.[1]?.name || cleanTroop;
      const nextSess = {
        token: data.token,
        ymis,
        scoutId: ymis,
        troopId: cleanTroop,
        troopName,
      };
      // 綁定本人 SCOUT ID 到紀錄冊（空白簿亦可即連即用）
      update((b) => ({
        ...b,
        member: { ...b.member, scoutId: ymis, memberNo: ymis },
      }));
      setSession(nextSess);
      writeMemberSession(nextSess);
      setShowLogin(false);
      setPassword('');
      setStatus(t.loggedInAs.replace('{name}', ymis).replace('{troop}', troopName));
      if (!leaderMode) {
        await handleLoadConfirmed(nextSess);
      } else {
        push(isEn ? 'Connected to ROVERBADGE' : '已連接 ROVERBADGE');
      }
    } catch (e) {
      const msg = t.errLogin.replace('{m}', e.message || '');
      setStatus(msg);
      push(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = () => {
    if (session?.token && session?.troopId) {
      api.post('/roverbadge', {
        action: 'logout',
        troopId: session.troopId,
        token: session.token,
      }).catch(() => {});
    }
    setSession(null);
    writeMemberSession(null);
    setRemoteConfirmed([]);
    setRemotePendingIds([]);
    setStatus('');
    push(t.signedOut);
  };

  const handleSubmitPending = async () => {
    if (demo) {
      push(t.demoLock, 'error');
      return;
    }
    if (!session?.token || !session?.ymis || !session?.troopId) {
      setShowLogin(true);
      push(
        isEn
          ? 'Sign in to your ROVERBADGE account first before submitting pending items'
          : '請先連接並登入你的 ROVERBADGE 帳戶，再送交待核實進度',
        'error',
      );
      return;
    }
    if (!pendingRequests.length) {
      push(t.submittedNone);
      return;
    }
    setBusy(true);
    setStatus('');
    try {
      const data = await api.post('/roverbadge', {
        action: 'submitPending',
        troopId: session.troopId,
        scoutId: session.scoutId || session.ymis,
        token: session.token,
        items: pendingRequests,
      });
      if (!data.success) throw new Error(data.error || '送交未成功');
      setRemotePendingIds((prev) => [
        ...new Set([...prev, ...pendingRequests.map((x) => x.itemId)]),
      ]);
      push(t.submitted.replace('{n}', data.ok || pendingRequests.length));
    } catch (e) {
      const msg = t.errSubmit.replace('{m}', e.message || '');
      setStatus(msg);
      push(msg, 'error');
    } finally {
      setBusy(false);
    }
  };

  // ROVERBADGE 進度檔交換（匯出「待領袖核實」／匯入「領袖已核實」）必須先連接並登入 ROVERBADGE。
  // 完整紀錄冊備份與還原不經這裡，永遠可離線使用。
  const onExportFile = () => {
    if (demo) {
      push(t.demoLock, 'error');
      return;
    }
    if (!session?.token || !session?.ymis) {
      push(
        isEn
          ? 'Connect and sign in to your ROVERBADGE account before exporting a progress file'
          : '請先連接並登入 ROVERBADGE 帳戶，方可匯出「待領袖核實」進度檔',
        'error',
      );
      return;
    }
    const payload = exportForRoverBadge(book, session.troopId || troopId || '');
    download(
      `roverbadge-pending-${slugify(session.scoutId || session.ymis || mySid || 'member')}-${new Date().toISOString().slice(0, 10)}.json`,
      payload,
    );
    push(t.offlineExport);
  };

  const onImportFile = (e) => {
    if (demo) {
      push(t.demoLock, 'error');
      return;
    }
    const file = e?.target?.files?.[0];
    if (e?.target) e.target.value = '';
    if (!file) return;
    if (!session?.token || !session?.ymis) {
      push(
        isEn
          ? 'Connect and sign in to your ROVERBADGE account before importing a progress file'
          : '請先連接並登入 ROVERBADGE 帳戶，方可從 ROVERBADGE 匯入進度檔',
        'error',
      );
      return;
    }
    if (leaderMode) {
      push(t.leaderReadonly, 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        const previewDraft = structuredClone(book);
        const result = importFromRoverBadge(data, previewDraft);
        update((prev) => {
          const draft = structuredClone(prev);
          const applied = importFromRoverBadge(data, draft);
          draft.member = applied.member;
          return draft;
        });
        const pendingSuffix = result.skippedPending?.length
          ? t.skippedPending.replace('{n}', result.skippedPending.length)
          : '';
        if (result.imported) push(t.offlineImport.replace('{n}', result.imported) + pendingSuffix);
        else push(t.importedNone + pendingSuffix);
      } catch (err) {
        push(t.errImport.replace('{m}', err.message || ''), 'error');
      }
    };
    reader.readAsText(file);
  };

  const hasTroops = troopEntries.length > 0;
  const noTroopsFound = bridge === 'ready' && !hasTroops;
  const troopNotListed = hasTroops && troopId === TROOP_NOT_FOUND;
  const listUnreachable = bridge === 'ready' && !upstreamOk;
  const showOpenAccountNotice =
    bridge === 'ready' && !hasBadgeSession && ((noTroopsFound && !manualTroop) || (troopNotListed && showLogin));

  if (demo) {
    return (
      <section className="appendix-card appendix-card--dark roversync">
        <h4>
          <Icon name="seam" size={13} /> {t.cardTitle}
        </h4>
        <p className="roversync__sub">{t.cardSub}</p>
        <div className="roversync__demo" role="alert">
          <Icon name="lock" size={15} />
          <div>
            <strong>{t.demoLock}</strong>
            <p>{t.demoLockBody}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="appendix-card appendix-card--dark roversync">
      <h4>
        <Icon name="seam" size={13} /> {t.cardTitle}
      </h4>
      <p className="roversync__sub">{t.cardSub}</p>

      {bridge === 'unavailable' && (
        <div className="roversync__offline" role="status">
          <Icon name="lock" size={15} />
          <div className="roversync__offline-body">
            <strong>{isEn ? 'Running in standalone mode' : '現時以獨立模式運作'}</strong>
            <p>
              {isEn
                ? 'This deployment has no ROVERBADGE bridge (static hosting or offline). Your record book is fully usable: pages, signatures, forms, printing, QR and the full book backup & restore below all work offline.'
                : '此部署未接駁 ROVERBADGE（純靜態主機或離線環境）。紀錄冊全部功能照常運作：逐頁填寫、簽名、表格、列印、二維碼及下方完整備份與還原均可離線使用。'}
            </p>
          </div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={probeBridge}>
            <Icon name="refresh" size={13} /> {isEn ? 'Retry' : '重新偵測'}
          </button>
        </div>
      )}

      {/* 統計列 */}
      <dl className="kv roversync__stats">
        <div>
          <dt>{t.statsVerified}</dt>
          <dd>{verifiedCount}</dd>
        </div>
        <div>
          <dt>{t.statsPending}</dt>
          <dd>{localPendingCount}</dd>
        </div>
        <div>
          <dt>{t.statsAwaiting}</dt>
          <dd>{remotePendingIds.length}</dd>
        </div>
      </dl>

      <div className="aside-actions roversync__actions">
        {hasBadgeSession ? (
          <>
            <span className="roversync__session">
              <Icon name="verified" size={13} />
              {t.loggedInAs
                .replace('{name}', session.ymis)
                .replace('{troop}', session.troopName || session.troopId)}
            </span>
            <button
              type="button"
              className={cx('btn', 'btn--ghost', 'btn--sm', leaderMode && 'is-off')}
              onClick={() => handleLoadConfirmed(session)}
              disabled={leaderMode || busy}
            >
              <Icon name="download" size={13} />{' '}
              {leaderMode ? t.leaderReadonly : busy ? (isEn ? 'Loading…' : '讀取中…') : t.btnDownload}
            </button>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={handleSubmitPending}
              disabled={busy || !localPendingCount}
            >
              <Icon name="upload" size={13} />{' '}
              {busy
                ? isEn
                  ? 'Submitting…'
                  : '送交中…'
                : t.btnUpload.replace('{n}', localPendingCount)}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={handleLogout}
              disabled={busy}
            >
              {t.logoutBtn}
            </button>
          </>
        ) : (
          bridge !== 'unavailable' &&
          (hasTroops || manualTroop || bridge === 'checking') && (
            <button
              type="button"
              className="btn btn--gold btn--sm"
              disabled={bridge === 'checking'}
              aria-expanded={showLogin}
              onClick={() => setShowLogin((v) => !v)}
            >
              <Icon name="link" size={13} />{' '}
              {bridge === 'checking'
                ? isEn
                  ? 'Checking ROVERBADGE…'
                  : '正在偵測 ROVERBADGE…'
                : hasTroops
                  ? isEn
                    ? `Connect my ROVERBADGE account (${troopEntries.length} ${
                        troopEntries.length === 1 ? 'group' : 'groups'
                      } found)`
                    : `連接我的 ROVERBADGE 帳戶（已自動讀取 ${troopEntries.length} 個旅團）`
                  : t.connect}
            </button>
          )
        )}
      </div>

      {showLogin && !hasBadgeSession && (hasTroops || manualTroop) && (
        <form onSubmit={handleLogin} className="roversync__login">
          <div className="roversync__fields">
            <div className="roversync__field">
              <div className="roversync__labelrow">
                <label htmlFor={troopFieldId}>
                  {hasTroops ? t.troop : t.manualTroopLabel}
                </label>
                {hasTroops ? (
                  <button
                    type="button"
                    className="roversync__hintlink"
                    onClick={() => setTroopId(TROOP_NOT_FOUND)}
                  >
                    {isEn ? 'Not listed?' : '找不到旅團？'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="roversync__hintlink"
                    onClick={() => setManualTroop(false)}
                  >
                    {isEn ? 'Back' : '返回開戶提示'}
                  </button>
                )}
              </div>
              {hasTroops ? (
                <select
                  id={troopFieldId}
                  name="troopId"
                  value={troopId}
                  onChange={(e) => setTroopId(e.target.value)}
                >
                  <option value="">
                    {isEn
                      ? `— Select registered group (${troopEntries.length}) —`
                      : `— 請選擇已登記旅團（共 ${troopEntries.length} 個）—`}
                  </option>
                  {troopEntries.map(([id, info]) => (
                    <option key={id} value={id}>
                      {id} · {isEn && info.en ? info.en : info.name || id}
                    </option>
                  ))}
                  <option value={TROOP_NOT_FOUND}>
                    {isEn
                      ? '— Group not listed (Open account on ROVERBADGE) —'
                      : '— 找不到我的旅團（前往 ROVERBADGE 開戶）—'}
                  </option>
                </select>
              ) : (
                <input
                  id={troopFieldId}
                  name="troopId"
                  type="text"
                  value={troopId}
                  onChange={(e) => setTroopId(e.target.value)}
                  placeholder={isEn ? 'e.g. 0082' : '旅團編號（如 0082）'}
                />
              )}
            </div>

            {!troopNotListed && (
              <>
                <label>
                  <span>{t.scoutId}</span>
                  <input
                    name="scoutId"
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={loginScoutId}
                    onChange={(e) => setLoginScoutId(e.target.value)}
                    placeholder={isEn ? '10-digit Scout ID' : '10 位童軍成員編號'}
                  />
                </label>
                <label>
                  <span>{t.password}</span>
                  <input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </label>
                <button
                  className="btn btn--primary btn--sm"
                  type="submit"
                  disabled={busy || !troopId.trim()}
                >
                  {busy ? (isEn ? 'Connecting…' : '登入中…') : t.loginBtn}
                </button>
              </>
            )}
          </div>
        </form>
      )}

      {showOpenAccountNotice && (
        <div className="roversync__notfound">
          <Icon name="info" size={16} />
          <div className="roversync__notfound-body">
            <strong>
              {listUnreachable
                ? isEn
                  ? 'Could not load the registered group list right now'
                  : '暫時未能讀取已登記旅團清單'
                : noTroopsFound
                  ? isEn
                    ? 'No registered groups found — please open an account on ROVERBADGE first'
                    : '未找到已登記旅團，請先前往 ROVERBADGE 開戶'
                  : isEn
                    ? 'Group not listed? Please register your group and open an account on ROVERBADGE first'
                    : '找不到你的旅團？請先前往 ROVERBADGE 開戶及登記旅團'}
            </strong>
            <p>
              {listUnreachable
                ? isEn
                  ? 'The list of registered groups could not be fetched from ROVERBADGE right now. Click “Refresh Group List” to try again, or visit ROVERBADGE to verify your group is registered and open an account first.'
                  : '連接 ROVERBADGE 時未能取得已登記旅團清單，可能只是暫時的網絡問題。請按「重新讀取旅團清單」再試；如旅團尚未登記，必須先在 ROVERBADGE 完成旅團登記及成員開戶。'
                : isEn
                  ? 'Your group must be registered and your member account opened on ROVERBADGE first before selecting your group and syncing progress here.'
                  : '必須先在 ROVERBADGE 完成旅團登記及成員開戶，方可於此自動選取旅團並連接帳戶同步進度。'}
            </p>
            <div className="roversync__notfound-actions">
              <a
                className="btn btn--gold btn--sm"
                href={badgeOrigin}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="external" size={14} />{' '}
                {isEn ? 'Open an Account on ROVERBADGE' : '前往 ROVERBADGE 開戶'}
              </a>
              <button type="button" className="btn btn--ghost btn--sm" onClick={probeBridge}>
                <Icon name="refresh" size={13} /> {isEn ? 'Refresh List' : '重新讀取旅團清單'}
              </button>
              {noTroopsFound && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    setManualTroop(true);
                    setShowLogin(true);
                  }}
                >
                  {isEn ? 'Enter Group ID Manually' : '手動輸入旅團編號'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {status && <p className="roversync__status">{status}</p>}

      {/* ROVERBADGE 進度檔交換（必須先連接並登入 ROVERBADGE 帳戶方可使用；本機完整備份維持離線可用） */}
      {hasBadgeSession ? (
        <div className="aside-actions roversync__files">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onExportFile}>
            <Icon name="download" size={13} /> {t.exportFile}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={onImportFile}
          />
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={leaderMode}
            onClick={() => fileRef.current?.click()}
          >
            <Icon name="upload" size={13} /> {t.importFile}
          </button>
        </div>
      ) : (
        <div className="roversync__locked" role="note">
          <Icon name="lock" size={14} />
          <div>
            <strong>
              {isEn ? 'ROVERBADGE progress-file exchange is locked' : 'ROVERBADGE 進度檔匯出／匯入已鎖定'}
            </strong>
            <p>
              {isEn
                ? 'Connect and sign in to your ROVERBADGE account above to unlock “Export pending progress file” and “Import leader-confirmed progress file”. Full record-book backup & restore below still works offline.'
                : '須先於上方連接並登入 ROVERBADGE 帳戶，方可匯出「待領袖核實」或從 ROVERBADGE 匯入「領袖已核實」進度檔。（下方「本機儲存」的完整備份 JSON／還原備份 JSON 仍可完全離線使用）'}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
