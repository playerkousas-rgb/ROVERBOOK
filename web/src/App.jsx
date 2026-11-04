import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRoute, navigate, Link } from './router.jsx';
import { BookCtx } from './bookContext.js';
import { loadBook, persistBook, loadShares } from './bookStore.js';
import { ToastProvider, useToast, Crest, Icon, Modal, cx } from './ui.jsx';
import { Pager, CoverPage } from './components/Paper.jsx';
import { SECTIONS, PAGE_TOTAL, allStats } from '@shared/book.js';
import Contents from './pages/Contents.jsx';
import { Colophon, Particulars1, Particulars2, GroupInfo, Scouting, Changes, Renewals, ServiceAwards, Scheme, Plan, BadgeTable, Experience, Uniform } from './pages/Book.jsx';
import {
  MbIntro, MbActivities, MbUnderstanding, MbCommitment, MbPresented,
  EpIntro, EpPresented, RsaIntro, RsaAwards, Dedication, Scoutcraft, Volunteerism,
  GlobalVision, Tenacity, Wellness1, Wellness2, Intrepidity, RsaPresented,
  Interview, BpaPresented,
} from './pages/Training.jsx';
import Appendix from './pages/Appendix.jsx';
import Welcome from './pages/Welcome.jsx';
import SharedBook from './pages/SharedBook.jsx';
import ShareDialog from './components/ShareDialog.jsx';
import WalletDialog from './components/WalletDialog.jsx';
import MenuDialog from './components/MenuDialog.jsx';
import { FormsIndex, FormDoc, FormsAll } from './pages/Forms.jsx';

const PAGES = {
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
      lead="續上頁。"
      leadEn="Continued."
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
      lead="續上頁。"
      leadEn="Continued."
    />
  ),
  uniform: Uniform,
  appendix: Appendix,
};

const bookPages = SECTIONS.filter((s) => s.id !== 'contents');
const paperPages = SECTIONS.filter((s) => !s.digital);

function IndexSheet({ open, onClose, current }) {
  if (!open) return null;
  return (
    <Modal onClose={onClose} eyebrow="CONTENTS" title="目錄" subtitle={`紙本 41 頁，逐頁對應；另設數位附錄。`} wide>
      <div className="indexlist">
        <Link to="/" className="indexrow indexrow--cover" onClick={onClose}>
          <span className="indexrow__no">封面</span>
          <span className="indexrow__title">樂行童軍紀錄冊</span>
          <Icon name="book" size={14} />
        </Link>
        {bookPages.map((s) => (
          <Link
            key={s.id}
            to={`/p/${s.id}`}
            onClick={onClose}
            className={cx('indexrow', current === s.id && 'is-current')}
          >
            <span className="indexrow__no">{s.page === '—' ? '附錄' : s.page}</span>
            <span className="indexrow__title">
              {s.label}
              <em>{s.en}</em>
            </span>
            {current === s.id ? <span className="indexrow__now">現在</span> : <Icon name="chevron" size={12} />}
          </Link>
        ))}
        <Link to="/p/contents" onClick={onClose} className="indexrow indexrow--cover">
          <span className="indexrow__no">目錄</span>
          <span className="indexrow__title">使用說明及進度摘要</span>
          <Icon name="info" size={14} />
        </Link>
      </div>
    </Modal>
  );
}

function BookApp({ book }) {
  const path = useRoute();
  const { push } = useToast();
  const [shareOpen, setShareOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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

  const section = path.startsWith('/p/') ? path.slice(3) : null;
  const formId = path.startsWith('/forms') ? path.split('/').filter(Boolean)[1] || 'index' : null;
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
    <div className={cx('app', formId ? 'app--forms' : section ? 'app--book' : 'app--cover')}>
      <header className={cx('chipbar', section && 'chipbar--page')}>
        <Link to="/" className="chipbar__brand">
          <Crest size={26} />
          <span>
            <strong>ROVERBOOK</strong>
            <em>樂行童軍紀錄冊</em>
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
            <span>{meta?.page === '—' ? '數位' : `第 ${meta?.page} 頁`}</span>
            <strong>{meta?.label}</strong>
            <Icon name="down" size={12} />
          </button>
        )}

        <div className="chipbar__actions">
          {section && <span className="chipbar__save">{savedAt ? '已儲存' : '本機'}</span>}
          {section && (
            <>
              <button className="chipbtn" onClick={() => setIndexOpen(true)} title="目錄">
                <Icon name="book" size={15} /> <span className="hide-sm">目錄</span>
              </button>
              <button
                className={cx('chipbtn', zoom > 1 && 'is-on')}
                onClick={() => setZoom((z) => (z > 1 ? 1 : 1.4))}
                title="放大／縮小"
              >
                <Icon name="zoom" size={15} /> <span className="hide-sm">{zoom > 1 ? '還原' : '放大'}</span>
              </button>
              <button className="chipbtn chipbtn--gold" onClick={() => setShareOpen(true)}>
                <Icon name="share" size={15} /> <span className="hide-sm">分享</span>
              </button>
            </>
          )}
          <button className="chipbtn chipbtn--icon" onClick={() => setMenuOpen(true)} aria-label="更多">
            <Icon name="menu" size={16} />
          </button>
        </div>
      </header>

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
        <div className={cx('stage__inner', section && 'stage__inner--page', formId && 'stage__inner--forms')} style={{ zoom }}>
          {formId ? (
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
            />
          )}
        </div>
      </main>

      {section ? (
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
        onWallet={() => {
          setShareOpen(false);
          setWalletOpen(true);
        }}
      />
      <WalletDialog open={walletOpen} onClose={() => setWalletOpen(false)} share={share} setShare={setShare} />
      <MenuDialog
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onIndex={() => setIndexOpen(true)}
        onHome={() => {
          setMenuOpen(false);
          setWalletOpen(true);
        }}
      />
    </div>
  );
}

export default function App() {
  const path = useRoute();
  const [book, setBook] = useState(() => loadBook());

  const update = useCallback((updater) => {
    setBook((prev) => {
      if (!prev) return prev;
      const next = typeof updater === 'function' ? updater(structuredClone(prev)) : { ...prev, ...updater };
      next.meta = { ...(next.meta || {}), updatedAt: new Date().toISOString() };
      return next;
    });
  }, []);

  const replace = useCallback((next) => setBook(next), []);

  useEffect(() => {
    if (!book) return;
    const timer = setTimeout(() => persistBook(book), 250);
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
        <BookApp book={book} />
      </ToastProvider>
    </BookCtx.Provider>
  );
}
