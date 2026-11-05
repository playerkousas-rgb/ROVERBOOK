import React, { useCallback, useRef, useState } from 'react';
import { useBook } from '../bookContext.js';
import { useToast, Icon } from '../ui.jsx';
import { download } from '../bookStore.js';
import { navigate } from '../router.jsx';
import { isLeader } from '../leader.js';
import { api } from '../api.js';
import { useLang } from '../i18n.jsx';
import {
  collectPendingForRoverBadge,
  exportForRoverBadge,
  importFromRoverBadge,
  normalizeScoutId,
} from '@shared/book.js';

const T = {
  zh: {
    cardTitle: 'ROVERBADGE 個人進度同步',
    cardSub: '僅同步本人訓練進度（項目＋日期），不上傳姓名、團籍或任何個人資料。',
    statsVerified: '已獲核實／簽署項目',
    statsPending: '本機新填待送交',
    statsAwaiting: 'ROVERBADGE 等候領袖 CONFIRM',
    connect: '連接我的 ROVERBADGE 帳戶',
    troop: '所屬旅團',
    scoutId: '我的童軍成員編號（SCOUT ID）',
    password: 'ROVERBADGE 密碼',
    loginBtn: '登入並載入本人進度',
    logoutBtn: '斷開連接',
    btnDownload: '⬇️ 從 ROVERBADGE 錄入「領袖已核實」進度',
    btnUpload: '⬆️ 送交 ROVERBADGE 待領袖核實（{n} 項）',
    btnUploadNone: '⬆️ 送交 ROVERBADGE 待領袖核實（無新項目）',
    exportFile: '匯出待領袖核實進度檔',
    importFile: '匯入領袖已核實進度檔',
    leaderReadonly: '領袖模式僅讀：不可修改本機紀錄冊',
    loggedInAs: '已連接：{name}（{troop}）',
    imported: '已從 ROVERBADGE 錄入 {n} 項領袖已核實進度',
    importedNone: '沒有新的已核實進度可錄入',
    submitted: '已送交 {n} 項進度待領袖核實',
    submittedNone: '沒有新進度需要送交',
    skippedPending: '已略過 {n} 項尚未核實的進度',
    errLogin: '登入失敗：{m}',
    errLoad: '讀取進度失敗：{m}',
    errSubmit: '送交失敗：{m}',
    errImport: '匯入失敗：{m}',
    offlineExport: '已匯出待領袖核實進度檔',
    offlineImport: '已匯入 {n} 項領袖已核實進度',
  },
  en: {
    cardTitle: 'ROVERBADGE Personal Progress Sync',
    cardSub: 'Syncs your own training progress only (item + date) — no name, troop, or any personal data is uploaded.',
    statsVerified: 'Leader-verified items',
    statsPending: 'Locally filled, pending submission',
    statsAwaiting: 'Awaiting leader CONFIRM in ROVERBADGE',
    connect: 'Connect my ROVERBADGE account',
    troop: 'My troop',
    scoutId: 'My SCOUT member ID',
    password: 'ROVERBADGE password',
    loginBtn: 'Sign in and load my progress',
    logoutBtn: 'Disconnect',
    btnDownload: '⬇️ Import leader-verified progress from ROVERBADGE',
    btnUpload: '⬆️ Submit to ROVERBADGE for leader verification ({n} items)',
    btnUploadNone: '⬆️ Submit to ROVERBADGE for leader verification (no new items)',
    exportFile: 'Export pending-for-verification progress file',
    importFile: 'Import leader-confirmed progress file',
    leaderReadonly: 'Leader mode is read-only: local record book cannot be modified',
    loggedInAs: 'Connected: {name} ({troop})',
    imported: 'Imported {n} leader-verified items from ROVERBADGE',
    importedNone: 'No new leader-verified progress to import',
    submitted: 'Submitted {n} items for leader verification',
    submittedNone: 'No new items to submit',
    skippedPending: 'Skipped {n} items not yet verified',
    errLogin: 'Sign-in failed: {m}',
    errLoad: 'Failed to load progress: {m}',
    errSubmit: 'Submission failed: {m}',
    errImport: 'Import failed: {m}',
    offlineExport: 'Pending-for-verification progress file exported',
    offlineImport: 'Imported {n} leader-confirmed items',
  },
};

export default function RoverBadgeSyncCard() {
  const { book, update } = useBook();
  const { isEn } = useLang();
  const { push } = useToast();
  const t = T[isEn ? 'en' : 'zh'];
  const fileRef = useRef(null);

  const [troops, setTroops] = useState({});
  const [loadingTroops, setLoadingTroops] = useState(false);
  const [session, setSession] = useState(null); // { token, ymis, scoutId, troopId }
  const [remoteConfirmed, setRemoteConfirmed] = useState([]);
  const [remotePendingIds, setRemotePendingIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const leaderMode = isLeader();

  const verifiedCount = Object.values(book.progress || {}).filter(
    (p) => p && p.confirmedByBadge,
  ).length;

  const { count: localPendingCount } = collectPendingForRoverBadge(
    book,
    remoteConfirmed,
    remotePendingIds,
  );

  const loadTroops = useCallback(async () => {
    setLoadingTroops(true);
    setStatus('');
    try {
      const data = await api.get('/roverbadge'); // GET → { troops }
      setTroops(data.troops || {});
    } catch (e) {
      // 旅團清單非必須：仍可手動填寫 troopId
      setTroops({});
      setStatus(String(e.message || '無法讀取旅團清單，可手動填寫旅團編號'));
    } finally {
      setLoadingTroops(false);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    const form = e.target.elements;
    const troopId = String(form.troopId.value || '').trim();
    const scoutIdRaw = String(form.scoutId.value || '').trim();
    const password = String(form.password.value || '');
    if (!troopId || !scoutIdRaw || !password) return;
    setBusy(true);
    setStatus('');
    try {
      const data = await api.post('/roverbadge', {
        action: 'login',
        troopId,
        scoutId: scoutIdRaw,
        password,
      });
      if (!data.success) throw new Error(data.error || '登入未成功');
      const ymis = normalizeScoutId(data.ymis || scoutIdRaw);
      // 綁定本人 SCOUT ID 到紀錄冊（空白簿亦可即連即用）
      update((b) => ({
        ...b,
        member: { ...b.member, scoutId: ymis, memberNo: ymis },
      }));
      setSession({ token: data.token, ymis, scoutId: ymis, troopId });
      setStatus(t.loggedInAs.replace('{name}', ymis).replace('{troop}', troopId));
      push(t.connect);
    } catch (e) {
      setStatus(t.errLogin.replace('{m}', e.message));
      push(t.errLogin.replace('{m}', e.message), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    setRemoteConfirmed([]);
    setRemotePendingIds([]);
    setStatus('');
    push('已斷開 ROVERBADGE 連接');
  };

  const handleLoadConfirmed = async () => {
    if (!session) return;
    if (leaderMode) {
      push(t.leaderReadonly);
      return;
    }
    setBusy(true);
    setStatus('');
    try {
      const data = await api.post('/roverbadge', {
        action: 'load',
        troopId: session.troopId,
        scoutId: session.scoutId,
        token: session.token,
      });
      if (!data.success) throw new Error(data.error || '讀取未成功');
      const progress = data.progress || {};
      const confirmedIds = Object.keys(progress);
      const pendingIds = (data.pendingRequests || []).map((p) => p.itemId).filter(Boolean);
      setRemoteConfirmed(confirmedIds);
      setRemotePendingIds(pendingIds);

      // 寫入本機：僅本人已核實進度，標記 confirmedByBadge，保留本機簽名
      const draft = structuredClone(book);
      const json = { progress: { [session.scoutId]: progress } };
      const result = importFromRoverBadge(json, draft);
      draft.member = result.member;
      update(() => draft);

      if (result.imported) push(t.imported.replace('{n}', result.imported));
      else push(t.importedNone);
      if (result.skippedPending)
        push(t.skippedPending.replace('{n}', result.skippedPending));
    } catch (e) {
      setStatus(t.errLoad.replace('{m}', e.message));
      push(t.errLoad.replace('{m}', e.message), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitPending = async () => {
    if (!session) return;
    setBusy(true);
    setStatus('');
    try {
      const { pendingRequests } = collectPendingForRoverBadge(
        book,
        remoteConfirmed,
        remotePendingIds,
      );
      if (!pendingRequests.length) {
        push(t.submittedNone);
        return;
      }
      const data = await api.post('/roverbadge', {
        action: 'submitPending',
        troopId: session.troopId,
        scoutId: session.scoutId,
        token: session.token,
        items: pendingRequests,
      });
      if (!data.success) throw new Error(data.error || '送交未成功');
      push(t.submitted.replace('{n}', data.ok || pendingRequests.length));
    } catch (e) {
      setStatus(t.errSubmit.replace('{m}', e.message));
      push(t.errSubmit.replace('{m}', e.message), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleExportPending = () => {
    const payload = exportForRoverBadge(book, session ? session.troopId : book.member.troopId || '');
    download(
      `roverbadge-pending-${session?.scoutId || book.member.scoutId || 'member'}-${new Date().toISOString().slice(0, 10)}.json`,
      payload,
    );
    push(t.offlineExport);
  };

  const handleImportFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        const draft = structuredClone(book);
        const result = importFromRoverBadge(data, draft);
        draft.member = result.member;
        update(() => draft);
        if (result.imported) push(t.offlineImport.replace('{n}', result.imported));
        else push(t.importedNone);
        if (result.skippedPending)
          push(t.skippedPending.replace('{n}', result.skippedPending));
      } catch (e) {
        push(t.errImport.replace('{m}', e.message), 'error');
      }
    };
    reader.readAsText(file);
  };

  const troopOptions = Object.entries(troops).map(([id, info]) => ({
    id,
    label: (isEn && info.en ? info.en : info.name) || id,
  }));

  const disabledDownload = leaderMode || !session;

  return (
    <div className="appendix-card appendix-card--dark">
      <h4>
        <Icon name="seam" size={13} /> {t.cardTitle}
      </h4>
      <p className="tiny">{t.cardSub}</p>

      {/* 統計列 */}
      <dl className="kv" style={{ marginTop: 6 }}>
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

      {!session ? (
        <>
          <p className="tiny" style={{ margin: '6px 0 2px' }}>{t.connect}</p>
          <form onSubmit={handleLogin} className="rb-form" style={{ display: 'grid', gap: 5 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 9 }}>
              {t.troop}
              <select name="troopId" required style={{ marginTop: 2, fontSize: 11, padding: 3 }}>
                <option value="">{isEn ? 'Select troop' : '請選擇旅團'}</option>
                {troopOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 9 }}>
              {t.scoutId}
              <input
                name="scoutId"
                required
                type="text"
                inputMode="numeric"
                maxLength="10"
                style={{ marginTop: 2, fontSize: 11, padding: 3 }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 9 }}>
              {t.password}
              <input name="password" required type="password" style={{ marginTop: 2, fontSize: 11, padding: 3 }} />
            </label>
            <button
              className="btn btn--primary btn--sm"
              type="submit"
              disabled={busy || loadingTroops}
            >
              {busy ? (isEn ? 'Signing in…' : '登入中…') : t.loginBtn}
            </button>
          </form>
          {status && <p className="tiny" style={{ color: '#b3541e', marginTop: 5 }}>{status}</p>}
        </>
      ) : (
        <>
          <p className="tiny" style={{ margin: '6px 0 2px' }}>
            {t.loggedInAs.replace('{name}', session.scoutId).replace('{troop}', session.troopId)}
          </p>
          <div className="aside-actions" style={{ gap: 6, marginTop: 6 }}>
            <button
              className={cx('btn', 'btn--ghost', 'btn--sm', disabledDownload && 'is-off')}
              onClick={handleLoadConfirmed}
              disabled={disabledDownload || busy}
            >
              <Icon name="download" size={13} />
              {disabledDownload
                ? t.leaderReadonly
                : busy ? (isEn ? 'Loading…' : '讀取中…') : t.btnDownload}
            </button>
            <button
              className="btn btn--primary btn--sm"
              onClick={handleSubmitPending}
              disabled={busy || !localPendingCount}
            >
              <Icon name="upload" size={13} />
              {busy ? (isEn ? 'Submitting…' : '送交中…') : t.btnUpload.replace('{n}', localPendingCount)}
            </button>
          </div>
          <button
            className="linkbtn linkbtn--danger linkbtn--small"
            onClick={handleLogout}
            style={{ marginTop: 6 }}
          >
            <Icon name="lock" size={12} /> {t.logoutBtn}
          </button>
          {status && <p className="tiny" style={{ color: '#b3541e', marginTop: 5 }}>{status}</p>}
        </>
      )}

      {/* 離線 JSON 輔助 */}
      <hr style={{ border: 0, borderTop: '1px solid var(--rule-soft)', margin: '8px 0 4px' }} />
      <p className="tiny">{isEn ? 'Offline JSON fallback' : '離線 JSON 輔助'}</p>
      <div className="aside-actions" style={{ gap: 6 }}>
        <button className="btn btn--ghost btn--sm" onClick={handleExportPending}>
          <Icon name="download" size={13} /> {t.exportFile}
        </button>
        <button className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" size={13} /> {t.importFile}
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => handleImportFile(e.target.files?.[0])} />
      </div>
    </div>
  );
}

function cx(...p) {
  return p.filter(Boolean).join(' ');
}
