import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRoute, navigate, Link } from './router.jsx';
import { BookCtx } from './bookContext.js';
import { loadBook, persistBook, loadShares } from './bookStore.js';
import { ToastProvider, useToast, Crest, Icon, Modal, cx } from './ui.jsx';
import { Pager, CoverPage } from './components/Paper.jsx';
import { SECTIONS, PAGE_TOTAL } from '@shared/book.js';
import Contents from './pages/Contents.jsx';
import Particulars from './pages/Particulars.jsx';
import GroupInfo from './pages/GroupInfo.jsx';
import Scouting from './pages/Scouting.jsx';
import Renewals from './pages/Renewals.jsx';
import Service from './pages/Service.jsx';
import Awards from './pages/Awards.jsx';
import TrainingPage from './pages/TrainingPage.jsx';
import Expeditions from './pages/Expeditions.jsx';
import Additional from './pages/Additional.jsx';
import Signatures from './pages/Signatures.jsx';
import Appendix from './pages/Appendix.jsx';
import Welcome from './pages/Welcome.jsx';
import SharedBook from './pages/SharedBook.jsx';
import ShareDialog from './components/ShareDialog.jsx';
import WalletDialog from './components/WalletDialog.jsx';
import MenuDialog from './components/MenuDialog.jsx';

const PAGES = {
  contents: Contents,
  particulars: Particulars,
  group: GroupInfo,
  scouting: Scouting,
  renewals: Renewals,
  service: Service,
  awards: Awards,
  'training-1': () => <TrainingPage sectionId="training-1" badgeId="L1" />,
  'training-2': () => <TrainingPage sectionId="training-2" badgeId="L2" />,
  'training-3': () => <TrainingPage sectionId="training-3" badgeId="L3" part={0} />,
  'training-4': () => <TrainingPage sectionId="training-4" badgeId="L3" part={1} />,
  'training-5': () => <TrainingPage sectionId="training-5" badgeId="L4" />,
  expeditions: Expeditions,
  additional: Additional,
  signatures: Signatures,
  appendix: Appendix,
};

const bookPages = SECTIONS.filter((s) => s.id !== 'contents');

function IndexSheet({ open, onClose, current }) {
  if (!open) return null;
  return (
    <Modal onClose={onClose} eyebrow="CONTENTS" title="目錄" subtitle={`本冊共 ${PAGE_TOTAL} 頁，逐頁對應紀錄冊。`} wide>
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
            <span className="indexrow__no">{s.page}</span>
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
  const [share, setShare] = useState(() => {
    const all = Object.values(loadShares()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return all[0] || null;
  });

  const section = path.startsWith('/p/') ? path.slice(3) : null;
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
      navigate('/p/particulars');
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
    <div className={cx('app', section ? 'app--book' : 'app--cover')}>
      <header className={cx('chipbar', section && 'chipbar--page')}>
        <Link to="/" className="chipbar__brand">
          <Crest size={26} />
          <span>
            <strong>ROVERBOOK</strong>
            <em>樂行童軍紀錄冊</em>
          </span>
        </Link>

        {section && (
          <button className="chipbar__page" onClick={() => setIndexOpen(true)}>
            <span>第 {meta?.page} 頁</span>
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
          touch.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          if (touch.current == null) return;
          const dx = (e.changedTouches[0]?.clientX ?? 0) - touch.current;
          touch.current = null;
          if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
        }}
      >
        <div className={cx('stage__inner', section && 'stage__inner--page')} style={{ zoom }}>
          {Page ? (
            <div className="turn" key={section}>
              <Page />
            </div>
          ) : (
            <CoverPage
              book={book}
              onOpen={() => {
                navigate('/p/particulars');
                push('已打開你的紀錄冊');
              }}
            />
          )}
        </div>
      </main>

      {section ? (
        <Pager current={section} />
      ) : (
        <div className="coverhint">
          <span className="coverhint__dot" />
          {PAGE_TOTAL} 頁 · 點擊「打開紀錄冊」或按 → 開始
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
      <MenuDialog open={menuOpen} onClose={() => setMenuOpen(false)} onIndex={() => setIndexOpen(true)} />
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
