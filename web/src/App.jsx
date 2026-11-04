import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRoute, navigate, Link } from './router.jsx';
import { BookCtx } from './bookContext.js';
import { loadBook, persistBook, loadShares } from './bookStore.js';
import { ToastProvider, useToast, Crest, Icon } from './ui.jsx';
import { Tabs, Pager, CoverPage } from './components/Paper.jsx';
import Contents from './pages/Contents.jsx';
import Particulars from './pages/Particulars.jsx';
import GroupInfo from './pages/GroupInfo.jsx';
import Scouting from './pages/Scouting.jsx';
import Renewals from './pages/Renewals.jsx';
import Service from './pages/Service.jsx';
import Awards from './pages/Awards.jsx';
import Training from './pages/Training.jsx';
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
  training: Training,
  expeditions: Expeditions,
  additional: Additional,
  signatures: Signatures,
  appendix: Appendix,
};

function Chrome({ book }) {
  const path = useRoute();
  const [shareOpen, setShareOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [share, setShare] = useState(() => {
    const all = Object.values(loadShares()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return all[0] || null;
  });
  const [savedAt, setSavedAt] = useState(null);
  const { push } = useToast();

  const section = path.startsWith('/p/') ? path.slice(3) : null;
  const Page = section ? PAGES[section] : null;

  useEffect(() => {
    if (!book) return;
    const t = setTimeout(() => setSavedAt(new Date()), 400);
    return () => clearTimeout(t);
  }, [book]);

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="topbar__brand">
          <Crest size={30} />
          <span>
            <strong>ROVERBOOK</strong>
            <em>樂行童軍紀錄冊</em>
          </span>
        </Link>
        <div className="topbar__doc" aria-hidden="true">
          <span className="topbar__doc-label">持有人</span>
          <span className="topbar__doc-name">{book.member.nameZh || '未填姓名'}</span>
          <span className="topbar__doc-sub">{book.member.crew || '樂行童軍團'}</span>
        </div>
        <div className="topbar__actions">
          <span className="save">
            <i />
            {savedAt ? `已儲存 ${savedAt.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })}` : '本機儲存'}
          </span>
          <button className="btn btn--ghost btn--sm" onClick={() => window.print()}>
            <Icon name="print" size={15} /> <span className="hide-sm">列印</span>
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => setWalletOpen(true)}>
            <Icon name="wallet" size={15} /> <span className="hide-sm">錢包</span>
          </button>
          <button className="btn btn--primary btn--sm" onClick={() => setShareOpen(true)}>
            <Icon name="share" size={15} /> 分享
          </button>
          <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="更多">
            <Icon name="menu" size={18} />
          </button>
        </div>
      </header>

      <main className="desk">
        <div className="bookwrap">
          <Tabs current={section} />
          <div className="bookstage">
            {Page ? (
              <Page />
            ) : (
              <CoverPage
                book={book}
                onOpen={() => {
                  navigate('/p/contents');
                  push('已打開你的紀錄冊');
                }}
              />
            )}
          </div>
          {Page && <Pager current={section} />}
        </div>
      </main>

      {section && (
        <div className="mobiletabs">
          <Tabs current={section} />
        </div>
      )}

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
      <MenuDialog open={menuOpen} onClose={() => setMenuOpen(false)} />
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

  const replace = useCallback((next) => {
    setBook(next);
  }, []);

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
        <Chrome book={book} />
      </ToastProvider>
    </BookCtx.Provider>
  );
}
