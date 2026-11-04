import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRoute, navigate, Link } from './router.jsx';
import { BookCtx } from './bookContext.js';
import { loadBook, persistBook, loadShares } from './bookStore.js';
import { ToastProvider, useToast, Crest, Icon, Modal, cx } from './ui.jsx';
import { Pager, CoverPage } from './components/Paper.jsx';
import { SECTIONS, PAGE_TOTAL, allStats, syncIdentity } from '@shared/book.js';
import Contents from './pages/Contents.jsx';
import { Emblem, PromiseLaw, Cover, Colophon, Particulars1, Particulars2, GroupInfo, Scouting, Changes, Renewals, ServiceAwards, Scheme, Plan, BadgeTable, Experience, Uniform } from './pages/Book.jsx';
import {
  MbIntro, MbActivities, MbUnderstanding, MbCommitment, MbPresented,
  EpIntro, EpPresented, RsaIntro, RsaAwards, Dedication, Scoutcraft, Volunteerism,
  GlobalVision, Tenacity, Wellness1, Wellness2, Intrepidity, RsaPresented,
  Interview, BpaPresented,
} from './pages/Training.jsx';
import Appendix from './pages/Appendix.jsx';
import PrintBook from './pages/PrintBook.jsx';
import Welcome from './pages/Welcome.jsx';
import SharedBook from './pages/SharedBook.jsx';
import ShareDialog from './components/ShareDialog.jsx';
import MenuDialog from './components/MenuDialog.jsx';
import { FormsIndex, FormDoc, FormsAll } from './pages/Forms.jsx';
import Scan, { ScanView } from './pages/Scan.jsx';
import Signoff from './pages/Signoff.jsx';
import ShowQrDialog from './components/ShowQrDialog.jsx';
import LeaderGate from './components/LeaderGate.jsx';
import { LEADER_ENABLED, isLeader, exitLeaderMode, onLeaderChange } from './leader.js';
import { UPDATE_EVENT, applyPwaUpdate } from './pwa.js';
import { LangProvider, useLang } from './i18n.jsx';

const PAGES = {
  cover: Cover,
  contents: Contents,
  colophon: Colophon,
  'particulars-1': Particulars1,
  'particulars-2': Particulars2,
  group: GroupInfo,
  scouting: Scouting,
  changes: Changes,
  'renewals-1': () => <Renewals part={0} />,
  'renewals-2': () => <Renewals part={1} />,
  'service-awards': ServiceAwards,
  scheme: Scheme,
  plan: Plan,
  'mb-intro': MbIntro,
  'mb-activities': MbActivities,
  'mb-understanding': MbUnderstanding,
  'mb-commitment': MbCommitment,
  'mb-presented': MbPresented,
  'ep-intro': EpIntro,
  'ep-presented': EpPresented,
  'rsa-intro': RsaIntro,
  'rsa-awards': RsaAwards,
  dedication: Dedication,
  scoutcraft: Scoutcraft,
  volunteerism: Volunteerism,
  'global-vision': GlobalVision,
  tenacity: Tenacity,
  'wellness-1': Wellness1,
  'wellness-2': Wellness2,
  intrepidity: Intrepidity,
  'rsa-presented': RsaPresented,
  'interview-district': () => <Interview kind="district" />,
  'interview-region': () => <Interview kind="region" />,
  'bpa-presented': BpaPresented,
  wosm: () => <BadgeTable id="wosm" title="世界童軍組織推出的獎章" en="BADGES FROM THE WOSM" path="pages.wosm.rows" />,
  'other-badges-1': () => <BadgeTable id="other-badges-1" title="其他獎章" en="OTHER BADGES" path="pages.other-badges-1.rows" />,
  'other-badges-2': () => <BadgeTable id="other-badges-2" title="其他獎章（續）" en="OTHER BADGES" path="pages.other-badges-2.rows" />,
  'additional-1': () => (
    <Experience
      id="additional-1"
      title="其他經驗"
      en="ADDITIONAL EXPERIENCES"
      path="additional"
      lead="在此紀錄你在樂行童軍支部所獲得之其他經驗，包括但不限於參加之活動、在樂行童軍團所負責之特別任務、在管理委員會所擔任之職位等。"
      leadEn="Record here additional experiences gained and any qualifications obtained in this Section. These activities include but not limited to activities attempted, special responsibilities in the Crew and positions held in the Management Committee."
    />
  ),
  'additional-2': () => (
    <Experience
      id="additional-2"
      title="其他經驗（續）"
      en="ADDITIONAL EXPERIENCES"
      path="pages.additional-2.rows"
      lead="在此紀錄你在樂行童軍支部所獲得之其他經驗，包括但不限於參加之活動、在樂行童軍團所負責之特別任務、在管理委員會所擔任之職位等。"
      leadEn="Record here additional experiences gained and any qualifications obtained in this Section. These activities include but not limited to activities attempted, special responsibilities in the Crew and positions held in the Management Committee."
    />
  ),
  'expeditions-1': () => (
    <Experience
      id="expeditions-1"
      title="遠足及海外活動"
      en="EXPEDITIONS AND OVERSEAS ACTIVITIES"
      path="expeditions"
      lead="在此紀錄你在本港或海外進行遠足或參與國際童軍活動。"
      leadEn="Record here any expeditions in Hong Kong or overseas or international Scouting activities undertaken abroad."
    />
  ),
  'expeditions-2': () => (
    <Experience
      id="expeditions-2"
      title="遠足及海外活動（續）"
      en="EXPEDITIONS AND OVERSEAS ACTIVITIES"
      path="pages.expeditions-2.rows"
      min={12}
      lead="在此紀錄你在本港或海外進行遠足或參與國際童軍活動。"
      leadEn="Record here any expeditions in Hong Kong or overseas or International Scouting activities undertaken abroad."
    />
  ),
  uniform: Uniform,
  promise: PromiseLaw,
  crest: Emblem,
  appendix: Appendix,
};

const bookPages = SECTIONS.filter((s) => s.id !== 'contents');
const paperPages = SECTIONS.filter((s) => !s.digital);

function IndexSheet({ open, onClose, current }) {
  const { isEn } = useLang();
  if (!open) return null;
  return (
    <Modal
      onClose={onClose}
      eyebrow="CONTENTS"
      title={isEn ? 'Contents' : '目錄'}
      subtitle={isEn ? '43 printed pages, one to one; plus a digital appendix.' : '紙本 43 頁，逐頁對應；另設數位附錄。'}
      wide
    >
      <div className="indexlist">
        <Link to="/p/cover" className="indexrow indexrow--cover" onClick={onClose}>
          <span className="indexrow__no">1</span>
          <span className="indexrow__title">{isEn ? 'Rover Scout Record Book' : '樂行童軍紀錄冊'}</span>
          <Icon name="book" size={14} />
        </Link>
        {bookPages.map((s) => (
          <Link
            key={s.id}
            to={`/p/${s.id}`}
            onClick={onClose}
            className={cx('indexrow', current === s.id && 'is-current')}
          >
            <span className="indexrow__no">{s.page === '—' ? (isEn ? 'App.' : '附錄') : s.page}</span>
            <span className="indexrow__title">
              {isEn ? s.en || s.label : s.label}
              {!isEn && <em>{s.en}</em>}
            </span>
            {current === s.id ? <span className="indexrow__now">{isEn ? 'NOW' : '現在'}</span> : <Icon name="chevron" size={12} />}
          </Link>
        ))}
        <Link to="/p/contents" onClick={onClose} className="indexrow indexrow--cover">
          <span className="indexrow__no">{isEn ? 'Notes' : '目錄'}</span>
          <span className="indexrow__title">{isEn ? 'How to use & progress summary' : '使用說明及進度摘要'}</span>
          <Icon name="info" size={14} />
        </Link>
      </div>
    </Modal>
  );
}

function BookApp({ book, saveIssue }) {
  const path = useRoute();
  const { isEn, toggle } = useLang();
  const { push } = useToast();
  const [shareOpen, setShareOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));

  useEffect(() => {
    const onUpdate = () => setUpdateReady(true);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener(UPDATE_EVENT, onUpdate);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener(UPDATE_EVENT, onUpdate);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);
  const [leader, setLeader] = useState(() => isLeader());
  useEffect(() => onLeaderChange(() => setLeader(isLeader())), []);
  const [indexOpen, setIndexOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [savedAt, setSavedAt] = useState(null);
  const touch = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [path]);
  const [share, setShare] = useState(() => {
    const all = Object.values(loadShares()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return all[0] || null;
  });

  const printAll = path === '/print';
  const section = path.startsWith('/p/') ? path.slice(3) : null;
  const formId = path.startsWith('/forms') ? path.split('/').filter(Boolean)[1] || 'index' : null;
  const leaderPath = path === '/leader';
  const scanPath = ['/scan', '/scan/view', '/scan/signoff'].includes(path) ? path : null;
  const [lastSection, setLastSection] = useState(() => {
    try {
      return localStorage.getItem('roverbook.last') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    if (!section) return;
    try {
      localStorage.setItem('roverbook.last', section);
    } catch {
      /* private mode */
    }
    setLastSection(section);
  }, [section]);

  const lastMeta = SECTIONS.find((s) => s.id === lastSection && !s.digital);
  const stats = allStats(book);
  const coverHint = !book.member.nameZh
    ? '第一步：寫上你的名字'
    : `已完成 ${stats.done} / ${stats.total} 項 · 下一步：${
        stats.nextBadge?.badge?.name ? `完成${stats.nextBadge.badge.name}` : '全部完成，等領袖簽署'
      }`;
  const Page = section ? PAGES[section] : null;
  const meta = SECTIONS.find((s) => s.id === section);
  const index = bookPages.findIndex((s) => s.id === section);

  useEffect(() => {
    if (!book) return;
    const t = setTimeout(() => setSavedAt(new Date()), 500);
    return () => clearTimeout(t);
  }, [book]);

  const go = useCallback((delta) => {
    if (!section) {
      navigate('/p/particulars-1');
      return;
    }
    const next = bookPages[index + delta];
    if (next) navigate(`/p/${next.id}`);
    else if (delta < 0 && index === 0) navigate('/');
  }, [section, index]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.matches('input, textarea, [contenteditable]')) return;
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  return (
    <div
      className={cx(
        'app',
        printAll
          ? 'app--print'
          : scanPath || leaderPath
            ? cx('app--scan', (leaderPath || !leader) && 'app--gate')
            : formId
              ? 'app--forms'
              : section
                ? 'app--book'
                : 'app--cover',
        leader && 'app--leader',
      )}
    >
      <header className={cx('chipbar', section && 'chipbar--page')}>
        <Link to="/" className="chipbar__brand">
          <Crest size={26} />
          <span>
            <strong>ROVERBOOK</strong>
            <em>{isEn ? 'Rover Scout Record Book' : '樂行童軍紀錄冊'}</em>
          </span>
        </Link>

        {formId && (
          <span className="chipbar__page chipbar__page--static">
            <span>表格</span>
            <strong>{formId === 'index' ? '三張官方表格' : formId === 'all' ? '全部三張' : 'PT/' + formId.slice(2)}</strong>
          </span>
        )}

        {section && (
          <button className="chipbar__page" onClick={() => setIndexOpen(true)}>
            <span>{meta?.page === '—' ? (isEn ? 'Digital' : '數位') : isEn ? `Page ${meta?.page}` : `第 ${meta?.page} 頁`}</span>
            <strong>{isEn ? meta?.en || meta?.label : meta?.label}</strong>
            <Icon name="down" size={12} />
          </button>
        )}

        <div className="chipbar__actions">
          {leader && (
            <button
              className="chipbtn chipbtn--leader is-on"
              onClick={() => {
                setMenuOpen(true);
              }}
              title={isEn ? 'Leader mode is on' : '領袖模式已開啟'}
            >
              <Icon name="verified" size={15} /> <span className="hide-sm">{isEn ? 'Leader' : '領袖'}</span>
            </button>
          )}
          {section && (
            <span className={cx('chipbar__save', saveIssue && 'is-error')}>
              {saveIssue ? (isEn ? 'NOT SAVED' : '未儲存') : savedAt ? (isEn ? 'SAVED' : '已儲存') : isEn ? 'LOCAL' : '本機'}
            </span>
          )}
          {section && (
            <>
              <button
                className={cx('chipbtn', zoom > 1 && 'is-on')}
                onClick={() => setZoom((z) => (z > 1 ? 1 : 1.4))}
                title={isEn ? 'Zoom' : '放大／縮小'}
              >
                <Icon name="zoom" size={15} /> <span className="hide-sm">{zoom > 1 ? (isEn ? 'Reset' : '還原') : isEn ? 'Zoom' : '放大'}</span>
              </button>
              <button className="chipbtn chipbtn--gold" onClick={() => setShareOpen(true)}>
                <Icon name="share" size={15} /> <span className="hide-sm">{isEn ? 'Share' : '分享'}</span>
              </button>
            </>
          )}
          <button
            className="chipbtn chipbtn--lang"
            onClick={toggle}
            title={isEn ? '切換中文／English' : 'Switch 中文／English'}
            aria-label={isEn ? 'Switch to Chinese' : '切換到英文'}
          >
            <Icon name="globe" size={15} /> <span>{isEn ? 'EN' : '中'}</span>
          </button>
          <button className="chipbtn chipbtn--icon" onClick={() => setMenuOpen(true)} aria-label="更多">
            <Icon name="menu" size={16} />
          </button>
        </div>
      </header>

      {!online && (
        <div className="offlinebar" role="status">
          <Icon name="lock" size={14} />
          <span>
            {isEn
              ? 'Offline: the whole book lives on this phone — keep filling, signing, generating forms and printing.'
              : '離線模式：紀錄冊全部在這部手機，照樣可以填寫、簽名、生成表格及列印。'}
          </span>
        </div>
      )}

      {saveIssue && (
        <div className="savealert" role="alert">
          <Icon name="alert" size={16} />
          <span>
            {saveIssue === 'quota'
              ? '儲存空間不足：最新的修改未寫入。請到附錄「儲存健康」壓縮圖片／墨跡，或先匯出備份。'
              : '未能儲存：瀏覽器可能封鎖了本機儲存（例如私人模式）。請匯出備份以免流失。'}
          </span>
          <button
            className="savealert__btn"
            onClick={() => {
              if (section) navigate('/p/appendix');
              else setMenuOpen(true);
            }}
          >
            處理
          </button>
        </div>
      )}

      <main
        className={cx('stage', zoom > 1 && 'stage--zoom')}
        style={{ '--zoom': zoom }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          touch.current = t ? { x: t.clientX, y: t.clientY } : null;
        }}
        onTouchEnd={(e) => {
          if (!touch.current) return;
          const t = e.changedTouches[0] || {};
          const dx = (t.clientX ?? 0) - touch.current.x;
          const dy = (t.clientY ?? 0) - touch.current.y;
          touch.current = null;
          if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) go(dx < 0 ? 1 : -1);
        }}
      >
        <div
          className={cx(
            'stage__inner',
            section && 'stage__inner--page',
            formId && 'stage__inner--forms',
            (scanPath || leaderPath) && 'stage__inner--scan',
          )}
          style={{ zoom }}
        >
          {printAll ? (
            <PrintBook pages={PAGES} />
          ) : leaderPath ? (
            <LeaderGate />
          ) : scanPath ? (
            leader ? (
            scanPath === '/scan/view' ? (
              <ScanView />
            ) : scanPath === '/scan/signoff' ? (
              <Signoff />
            ) : (
              <Scan />
            )) : (
              <LeaderGate mode="gate" />
            )
          ) : formId ? (
            <div className="turn" key={formId}>
              {formId === 'index' ? <FormsIndex /> : formId === 'all' ? <FormsAll /> : <FormDoc id={formId} />}
            </div>
          ) : Page ? (
            <div className="turn" key={section}>
              <Page />
            </div>
          ) : (
            <CoverPage
              book={book}
              onOpen={() => {
                navigate('/p/particulars-1');
                push('已打開你的紀錄冊');
              }}
              last={lastMeta}
              hint={coverHint}
              onContinue={() => lastMeta && navigate(`/p/${lastMeta.id}`)}
              onLeader={LEADER_ENABLED && !leader ? () => navigate('/leader') : undefined}
            />
          )}
        </div>
      </main>

      {scanPath || leaderPath || printAll ? null : section ? (
        <Pager current={section} />
      ) : (
        <div className="coverhint">
          <span className="coverhint__dot" />
          {formId ? '三張官方表格 · 資料由紀錄冊自動帶入' : `${PAGE_TOTAL} 頁 · 點擊「打開紀錄冊」或按 → 開始`}
        </div>
      )}

      <IndexSheet open={indexOpen} onClose={() => setIndexOpen(false)} current={section} />
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        share={share}
        setShare={setShare}
      />
      {updateReady && (
        <div className="updatebar" role="status">
          <span>有新版本</span>
          <button className="btn btn--primary btn--sm" onClick={() => applyPwaUpdate()}>
            重新載入
          </button>
          <button className="updatebar__x" aria-label="稍後" onClick={() => setUpdateReady(false)}>
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      <ShowQrDialog open={qrOpen} onClose={() => setQrOpen(false)} />
      <MenuDialog
        open={menuOpen}
        leader={leader}
        onClose={() => setMenuOpen(false)}
        onShowQr={() => {
          setMenuOpen(false);
          setQrOpen(true);
        }}
        onIndex={() => setIndexOpen(true)}
      />
    </div>
  );
}

function AppInner() {
  const path = useRoute();
  const [book, setBook] = useState(() => loadBook());

  const update = useCallback((updater) => {
    setBook((prev) => {
      if (!prev) return prev;
      const next = typeof updater === 'function' ? updater(structuredClone(prev)) : { ...prev, ...updater };
      syncIdentity(next.member);
      next.meta = { ...(next.meta || {}), updatedAt: new Date().toISOString() };
      return next;
    });
  }, []);

  const replace = useCallback((next) => setBook(next), []);

  const [saveIssue, setSaveIssue] = useState(null);

  useEffect(() => {
    if (!book) return;
    const timer = setTimeout(() => {
      const err = persistBook(book);
      setSaveIssue(err ? (err.name === 'QuotaExceededError' ? 'quota' : 'error') : null);
    }, 250);
    return () => clearTimeout(timer);
  }, [book]);

  const ctx = useMemo(() => ({ book, update, replace }), [book, update, replace]);

  if (path.startsWith('/v/')) {
    return (
      <ToastProvider>
        <SharedBook id={path.slice(3)} />
      </ToastProvider>
    );
  }

  if (!book) {
    return (
      <ToastProvider>
        <Welcome onReady={(next) => replace(next)} />
      </ToastProvider>
    );
  }

  return (
    <BookCtx.Provider value={ctx}>
      <ToastProvider>
        <BookApp book={book} saveIssue={saveIssue} />
      </ToastProvider>
    </BookCtx.Provider>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AppInner />
    </LangProvider>
  );
}
