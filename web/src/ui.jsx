import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const cx = (...parts) => parts.filter(Boolean).join(' ');

const PATHS = {
  card: 'M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9Z M7 10h4 M7 14h7',
  shield: 'M12 3 5 6v5.5c0 4.3 3 7.6 7 9.5 4-1.9 7-5.2 7-9.5V6l-7-3Z M9.5 12l1.8 1.8 3.4-3.6',
  users: 'M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20 M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M17 4.3a3.5 3.5 0 0 1 0 6.4 M21 20v-1.5a4 4 0 0 0-3-3.8',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z M20 20l-4-4',
  qr: 'M4 4h6v6H4V4Z M14 4h6v6h-6V4Z M4 14h6v6H4v-6Z M14 14h3v3h-3v-3Z M20 14v6h-3 M14 20h3',
  check: 'M5 12.5l4.5 4.5L19 7',
  lock: 'M7 10V8a5 5 0 0 1 10 0v2 M5.5 10h13v9.5a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5V10Z',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  chevron: 'M9 6l6 6-6 6',
  copy: 'M9 9V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3 M4 11a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7Z',
  share: 'M12 16V4 M8 8l4-4 4 4 M5 14v4.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V14',
  plus: 'M12 5v14 M5 12h14',
  trash: 'M4 7h16 M9 7V4.5h6V7 M6.5 7l1 13h9l1-13',
  back: 'M15 6l-6 6 6 6',
  print: 'M7 9V4h10v5 M7 18H5.5A1.5 1.5 0 0 1 4 16.5v-5A1.5 1.5 0 0 1 5.5 10h13a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 18.5 18H17 M7 14h10v6H7v-6Z',
  sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z',
  link: 'M10 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7L11.5 6.3 M14 10.5a4 4 0 0 0-5.7 0L5.5 13.3a4 4 0 0 0 5.7 5.7l1.3-1.3',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7.5V12l3 1.8',
  x: 'M6 6l12 12 M18 6 6 18',
  down: 'M6 9l6 6 6-6',
  edit: 'M4 20h4l10-10-4-4L4 16v4Z M14.5 5.5l4 4',
  alert: 'M12 4l9 16H3l9-16Z M12 10v4 M12 17h.01',
  medal: 'M8 3h8l-3 7h-2L8 3Z M12 21a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z M12 13.5l.8 1.7 1.8.2-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.2.8-1.7Z',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M15.5 8.5l-2 5-5 2 2-5 5-2Z',
  logout: 'M15 5V4a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1 M9 12h11 M17 8l4 4-4 4',
  verified: 'M12 3l2.3 1.7 2.8-.3 1 2.7 2.4 1.5-.9 2.7.9 2.7-2.4 1.5-1 2.7-2.8-.3L12 21l-2.3-1.7-2.8.3-1-2.7L3.5 15.4l.9-2.7-.9-2.7 2.4-1.5 1-2.7 2.8.3L12 3Z M8.8 12.2l2.1 2.1 4.3-4.5',
  bell: 'M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7 M10.3 20a2 2 0 0 0 3.4 0',
  scan: 'M4 8V5h3 M20 8V5h-3 M4 16v3h3 M20 16v3h-3 M4 12h16',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M3.5 9h17 M3.5 15h17 M12 3c2.5 2.4 3.8 5.4 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.4-3.8-9S9.5 5.4 12 3Z',
};

export function Icon({ name, size = 20, className = '', strokeWidth = 1.7 }) {
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
      <path d={PATHS[name] || PATHS.card} />
    </svg>
  );
}

export function Crest({ size = 44, tone = 'gold' }) {
  return (
    <svg className={cx('crest', `crest--${tone}`)} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="crestGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0d9a4" />
          <stop offset="45%" stopColor="#d8b871" />
          <stop offset="100%" stopColor="#b08c44" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="29" fill="none" stroke="url(#crestGold)" strokeWidth="1.4" opacity="0.55" />
      <path
        d="M32 12c4.4 7.4 10.4 9.4 10.4 16.2 0 5.6-4.6 9.4-10.4 9.4s-10.4-3.8-10.4-9.4C21.6 21.4 27.6 19.4 32 12Z"
        fill="url(#crestGold)"
      />
      <path d="M25.5 39.5h13l-2 5.5h-9l-2-5.5Z" fill="url(#crestGold)" opacity="0.9" />
      <rect x="23" y="47" width="18" height="3.6" rx="1.8" fill="url(#crestGold)" opacity="0.8" />
    </svg>
  );
}

export function Avatar({ name, photo, size = 56, ring = false }) {
  const initial = (name || '?').trim().slice(-1);
  return (
    <span
      className={cx('avatar', ring && 'avatar--ring')}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {photo ? <img src={photo} alt="" /> : <span>{initial}</span>}
    </span>
  );
}

export function Chip({ children, tone = 'default', icon, className }) {
  return (
    <span className={cx('chip', `chip--${tone}`, className)}>
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  );
}

export function Segmented({ value, options, onChange, size = 'md', ariaLabel }) {
  return (
    <div className={cx('segmented', `segmented--${size}`)} role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={cx('segmented__btn', value === o.id && 'is-active', `is-${o.id}`)}
          onClick={() => onChange(o.id)}
          title={o.hint || o.label}
        >
          {o.icon && <Icon name={o.icon} size={13} />}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function VisibilityDot({ level }) {
  const map = {
    public: { label: '公開', icon: 'globe' },
    linked: { label: '已連結', icon: 'users' },
    self: { label: '私人', icon: 'lock' },
    full: { label: '全部', icon: 'eye' },
  };
  const m = map[level] || map.self;
  return (
    <span className={cx('vis-dot', `vis-dot--${level}`)}>
      <Icon name={m.icon} size={12} />
      {m.label}
    </span>
  );
}

export function ProgressBar({ value, total, tone = 'green' }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <span className={cx('progress', `progress--${tone}`)}>
      <span className="progress__fill" style={{ width: `${pct}%` }} />
    </span>
  );
}

export function Modal({ title, subtitle, onClose, children, wide }) {
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
      <div className={cx('modal', wide && 'modal--wide')} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal__head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="關閉">
            <Icon name="x" size={18} />
          </button>
        </header>
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
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);
  const value = useMemo(() => ({ push }), [push]);
  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cx('toast', `toast--${t.tone}`)}>
            <Icon name={t.tone === 'error' ? 'alert' : 'check'} size={15} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function CopyButton({ text, label = '複製連結', onCopied }) {
  const { push } = useToast();
  return (
    <button
      type="button"
      className="btn btn--ghost btn--sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          push('已複製連結');
          onCopied?.();
        } catch {
          push('瀏覽器未允許複製，請長按選取', 'error');
        }
      }}
    >
      <Icon name="copy" size={15} />
      {label}
    </button>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  );
}

export function SectionHeading({ eyebrow, title, action, children }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {children && <p className="section-heading__sub">{children}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ icon = 'sparkle', title, children }) {
  return (
    <div className="empty">
      <Icon name={icon} size={26} />
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

export function fmtDate(value, { withTime = false } = {}) {
  if (!value) return '—';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  const opts = withTime
    ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' };
  return new Intl.DateTimeFormat('zh-HK', opts).format(dt);
}
