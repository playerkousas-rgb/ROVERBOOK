import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const cx = (...p) => p.filter(Boolean).join(' ');

const PATHS = {
  edit: 'M4 20h4l10-10-4-4L4 16v4Z M14.5 5.5l4 4',
  check: 'M5 12.5l4.5 4.5L19 7',
  x: 'M6 6l12 12 M18 6 6 18',
  plus: 'M12 5v14 M5 12h14',
  trash: 'M4 7h16 M9 7V4.5h6V7 M6.5 7l1 13h9l1-13',
  back: 'M15 6l-6 6 6 6',
  chevron: 'M9 6l6 6-6 6',
  down: 'M6 9l6 6 6-6',
  copy: 'M9 9V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3 M4 11a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7Z',
  share: 'M12 16V4 M8 8l4-4 4 4 M5 14v4.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V14',
  print: 'M7 9V4h10v5 M7 18H5.5A1.5 1.5 0 0 1 4 16.5v-5A1.5 1.5 0 0 1 5.5 10h13a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 18.5 18H17 M7 14h10v6H7v-6Z',
  qr: 'M4 4h6v6H4V4Z M14 4h6v6h-6V4Z M4 14h6v6H4v-6Z M14 14h3v3h-3v-3Z M20 14v6h-3 M14 20h3',
  wallet: 'M3 8.5A2.5 2.5 0 0 1 5.5 6H18a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8.5Z M3 9h15 M17 13.5h2',
  link: 'M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7L11.5 6.3 M14 10.5a4 4 0 0 0-5.7 0L5.5 13.3a4 4 0 0 0 5.7 5.7l1.3-1.3',
  book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5Z M4 18.5A2.5 2.5 0 0 1 6.5 16H20',
  lock: 'M7 10V8a5 5 0 0 1 10 0v2 M5.5 10h13v9.5a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5V10Z',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M3.5 9h17 M3.5 15h17 M12 3c2.5 2.4 3.8 5.4 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.4-3.8-9S9.5 5.4 12 3Z',
  image: 'M4 5h16v14H4V5Z M4 15l4.5-4.5L14 16 M15 9.5h.01',
  alert: 'M12 4l9 16H3l9-16Z M12 10v4 M12 17h.01',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7.5V12l3 1.8',
  users: 'M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20 M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M17 4.3a3.5 3.5 0 0 1 0 6.4 M21 20v-1.5a4 4 0 0 0-3-3.8',
  download: 'M12 4v11 M7.5 10.5 12 15l4.5-4.5 M5 19h14',
  upload: 'M12 20V9 M7.5 13.5 12 9l4.5 4.5 M5 4h14',
  menu: 'M4 7h16 M4 12h16 M4 17h16',
  seam: 'M12 3v18',
  verified: 'M12 3l2.3 1.7 2.8-.3 1 2.7 2.4 1.5-.9 2.7.9 2.7-2.4 1.5-1 2.7-2.8-.3L12 21l-2.3-1.7-2.8.3-1-2.7L3.5 15.4l.9-2.7-.9-2.7 2.4-1.5 1-2.7 2.8.3L12 3Z M8.8 12.2l2.1 2.1 4.3-4.5',
  camera: 'M4 8h3l1.5-2h7L17 8h3v11H4V8Z M12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 11v5 M12 8h.01',
  external: 'M14 4h6v6 M20 4l-9 9 M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  expand: 'M9 4H4v5 M15 4h5v5 M9 20H4v-5 M20 15v5h-5',
  zoom: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z M21 21l-4.3-4.3 M8.5 11h5 M11 8.5v5',
  pen: 'M4 20l4.5-1 9-9a2.1 2.1 0 0 0-3-3l-9 9L4 20Z M13.5 6.5l3 3',
  seal: 'M12 3l2.4 1.6 2.9-.2.9 2.8 2.3 1.7-1 2.8 1 2.8-2.3 1.7-.9 2.8-2.9-.2L12 21l-2.4-1.6-2.9.2-.9-2.8L3.5 15l1-2.8-1-2.8 2.3-1.7.9-2.8 2.9.2L12 3Z',
};

export function Icon({ name, size = 18, className = '', strokeWidth = 1.7 }) {
  return (
    <svg
      className={cx('icon', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name] || PATHS.book} />
    </svg>
  );
}

export function Crest({ size = 40, className = '' }) {
  return (
    <svg className={cx('crest', className)} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="foil" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f3ddab" />
          <stop offset="45%" stopColor="#d8b871" />
          <stop offset="100%" stopColor="#a9853f" />
        </linearGradient>
      </defs>
      <path
        d="M32 9c4.6 7.8 11 9.9 11 17 0 5.9-4.8 9.9-11 9.9s-11-4-11-9.9c0-7.1 6.4-9.2 11-17Z"
        fill="url(#foil)"
      />
      <path d="M25.5 38.5h13l-1.9 5.5h-9.2l-1.9-5.5Z" fill="url(#foil)" opacity="0.92" />
      <rect x="23" y="46.5" width="18" height="3.6" rx="1.8" fill="url(#foil)" opacity="0.82" />
      <circle cx="32" cy="32" r="24" fill="none" stroke="url(#foil)" strokeWidth="1" opacity="0.35" />
    </svg>
  );
}

export function SealMark({ text = '香港童軍', sub = '', size = 92, tone = 'red' }) {
  return (
    <span className={cx('sealmark', `sealmark--${tone}`)} style={{ width: size, height: size }}>
      <span className="sealmark__ring" />
      <span className="sealmark__text">{text}</span>
      {sub && <span className="sealmark__sub">{sub}</span>}
    </span>
  );
}

export function Modal({ children, onClose, title, eyebrow, subtitle, wide = false, className = '' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={cx('modal', wide && 'modal--wide', className)} role="dialog" aria-modal="true" aria-label={title}>
        {(title || eyebrow) && (
          <header className="modal__head">
            <div>
              {eyebrow && <span className="eyebrow">{eyebrow}</span>}
              {title && <h2>{title}</h2>}
              {subtitle && <p>{subtitle}</p>}
            </div>
            <button className="icon-btn" onClick={onClose} aria-label="關閉">
              <Icon name="x" size={18} />
            </button>
          </header>
        )}
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}

const ToastCtx = createContext({ push: () => {} });
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, tone = 'default') => {
    const id = Math.random().toString(36).slice(2);
    setItems((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3400);
  }, []);
  const value = useMemo(() => ({ push }), [push]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cx('toast', t.tone === 'error' && 'toast--error')}>
            <Icon name={t.tone === 'error' ? 'alert' : 'check'} size={14} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function fmtDate(value, withTime = false) {
  if (!value) return '—';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return new Intl.DateTimeFormat('zh-HK', {
    year: 'numeric',
    month: withTime ? 'short' : 'long',
    day: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(dt);
}
