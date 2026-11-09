import React, { useEffect } from 'react';
import { useBook, useField, getPath } from '../bookContext.js';
import { Spread } from './Paper.jsx';
import Write from './Write.jsx';
import { SignatureBlock } from './Ink.jsx';
import { today } from '@shared/book.js';
import { useLang, englishOf, addLabelFor, termFor } from '../i18n.jsx';
import { cx } from '../ui.jsx';

/* ---------------------------------------------------------------- 版面外框 */

export function Page({ id, children, className = '', dense = false }) {
  return <Spread section={id} dense={dense} right={<div className={`pg ${className}`}>{children}</div>} />;
}

export function H({ no, children, en, sub, progress }) {
  const { isEn } = useLang();
  return (
    <div className="pghead">
      <h3 className="pghead__title">
        {no && <span className="pghead__no">{no}</span>}
        {isEn ? en || englishOf(children) || termFor('en', children) : children}
        {!isEn && en && <em className="pghead__en">{en}</em>}
        {progress && <Progress ids={progress} />}
      </h3>
      {sub && <p className="pghead__sub">{sub}</p>}
    </div>
  );
}

function Progress({ ids }) {
  const { book } = useBook();
  const done = ids.filter((id) => getPath(book, `progress.${id}`)?.date).length;
  const all = done === ids.length && ids.length > 0;
  return (
    <span className={`pgprog${all ? ' is-complete' : ''}`} title={`${done} / ${ids.length}`}>
      <span className="pgprog__bar">
        <i style={{ width: `${ids.length ? (done / ids.length) * 100 : 0}%` }} />
      </span>
      <span className="pgprog__num">
        {done}/{ids.length}
      </span>
      {all && <span className="pgprog__stamp">完成</span>}
    </span>
  );
}

export function P({ children, en, className = '' }) {
  const { isEn } = useLang();
  if (isEn && en) {
    return (
      <div className={`pgpara ${className} pgpara--en`}>
        <p>{en}</p>
      </div>
    );
  }
  return (
    <div className={`pgpara ${className}`}>
      <p>{children}</p>
      {en && <p className="pgpara__en">{en}</p>}
    </div>
  );
}

export function Note({ children, en }) {
  const { isEn } = useLang();
  return (
    <div className="pgnote">
      <p>{isEn && en ? en : children}</p>
      {!isEn && en && <p className="pgnote__en">{en}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ 輸入欄 */

export function Line({ label, en, path, type = 'text', rows = 1, wide, hint, placeholder, max }) {
  const [value, set] = useField(path);
  const { isEn } = useLang();
  return (
    <div className={`frow${wide ? ' frow--wide' : ''}`}>
      <span className="frow__label">
        {isEn ? en || englishOf(label) || termFor('en', label) : label}
        {!isEn && en && <em>{en}</em>}
      </span>
      <span className="frow__value">
        <Write value={value} onChange={set} type={type} multiline={rows > 1} rows={rows} max={max} placeholder={placeholder} label={label} />
        {hint && <small className="frow__hint">{hint}</small>}
      </span>
    </div>
  );
}

export function Area({ label, en, path, rows = 3, placeholder }) {
  const [value, set] = useField(path);
  const { isEn } = useLang();
  return (
    <div className="fareas">
      <span className="frow__label">
        {isEn ? en || englishOf(label) || termFor('en', label) : label}
        {!isEn && en && <em>{en}</em>}
      </span>
      <Write value={value} onChange={set} multiline rows={rows} placeholder={placeholder} label={label} className="write--area" />
    </div>
  );
}

export function Grid({ cols = 2, children, className = '' }) {
  return <div className={`fgrid fgrid--${cols} ${className}`}>{children}</div>;
}

export function Check({ label, en, path, options, multi = false }) {
  const [value, set] = useField(path, multi ? [] : '');
  const { isEn } = useLang();
  const toggle = (v) => {
    if (!multi) return set(value === v ? '' : v);
    const list = Array.isArray(value) ? value : [];
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  };
  const on = (v) => (multi ? (Array.isArray(value) ? value.includes(v) : false) : value === v);
  return (
    <div className="chk">
      <span className="chk__label">
        {isEn ? en || englishOf(label) || termFor('en', label) : label}
        {!isEn && en && <em>{en}</em>}
      </span>
      <div className="chk__opts">
        {options.map((o) => (
          <button
            type="button"
            key={o.value}
            className={`chk__opt${on(o.value) ? ' is-on' : ''}`}
            onClick={() => toggle(o.value)}
            aria-pressed={on(o.value)}
          >
            <span className="chk__box">{on(o.value) ? '✓' : ''}</span>
            <span>
              {isEn ? o.en || englishOf(o.label) || o.label : o.label}
              {!isEn && o.en && <em>{o.en}</em>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- 中英對照標題 */

export function Bilingual({ zh, en, as: Tag = 'span', className = '', children }) {
  const { isEn } = useLang();
  if (isEn) return <Tag className={className}>{en}</Tag>;
  return (
    <Tag className={className}>
      {zh}
      {en && (
        <>
          {' '}
          <em>{en}</em>
        </>
      )}
      {children}
    </Tag>
  );
}

/* -------------------------------------------------------------------- 表格 */

function colTemplate(c) {
  if (c.col) return c.col;
  if (c.type === 'date') return 'minmax(var(--col-date), 0.9fr)';
  const w = Number(c.width) || 1;
  if (w >= 2) return `minmax(140px, ${w}fr)`;
  if (w >= 1.3) return `minmax(96px, ${w}fr)`;
  return `minmax(72px, ${w}fr)`;
}

export function Rows({ path, cols, min = 3, addLabel, del = false, dense = false, cap, layout }) {
  const [stored, set] = useField(path, []);
  const { isEn } = useLang();
  const list = Array.isArray(stored) ? stored : [];
  const total = Math.max(min, list.length);
  const gridCols = cols.map(colTemplate).join(' ') + (del ? ' 18px' : '');

  const setCell = (index, key, value) => {
    const next = list.slice();
    while (next.length <= index) next.push({});
    next[index] = { ...next[index], [key]: value };
    set(next);
  };
  const removeRow = (index) => set(list.filter((_, i) => i !== index));
  const add = () => set([...list, { id: `row_${Math.random().toString(36).slice(2, 8)}` }]);

  return (
    <div
      className={cx('pgtable', dense && 'pgtable--dense', layout && `pgtable--${layout}`)}
      style={{ '--pg-cols': gridCols }}
    >
      <div className={`pgtable__head pgtable__row pgtable__row--${cols.length}`}>
        {cols.map((c) => (
          <span key={c.k}>
            {isEn ? c.en || englishOf(c.label) || termFor('en', c.label) : c.label}
            {!isEn && c.en && <em>{c.en}</em>}
          </span>
        ))}
        {del && <span className="pgtable__delcol" />}
      </div>
      {Array.from({ length: total }).map((_, index) => (
        <div className={`pgtable__row pgtable__row--${cols.length}`} key={list[index]?.id || `blank-${index}`}>
          {cols.map((c) => (
            <span className="pgtable__cell" key={c.k} data-label={isEn ? c.en || c.label : c.label}>
              <Write
                value={list[index]?.[c.k] ?? ''}
                onChange={(v) => setCell(index, c.k, v)}
                type={c.type || 'text'}
                multiline={c.rows > 1}
                rows={c.rows || 1}
                compact
                label={c.label}
              />
            </span>
          ))}
          {del && (
            <span className="pgtable__delcol">
              {list[index] && (
                <button type="button" className="rowdel" onClick={() => removeRow(index)} aria-label="刪除這行">
                  ×
                </button>
              )}
            </span>
          )}
        </div>
      ))}
      {addLabel !== null && (!cap || list.length < cap) && (
        <button type="button" className="addrow addrow--quiet" onClick={add}>
          + {addLabelFor(isEn ? 'en' : 'zh', addLabel || '加一行')}
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- 訓練細項 */

export function ItemLine({ label, en, ids = [], page, extra, note }) {
  const { book, update } = useBook();
  const { isEn } = useLang();
  const primary = ids[0];
  const state = primary ? getPath(book, `progress.${primary}`) || {} : {};
  const done = !!state.date;

  const mark = (date) => {
    update((b) => {
      let next = { ...b, progress: { ...(b.progress || {}) } };
      ids.forEach((id) => {
        next.progress[id] = { ...(next.progress[id] || {}), ...(date ? { date } : { date: '' }), at: new Date().toISOString() };
      });
      return next;
    });
  };

  const setField = (key, value) => {
    update((b) => {
      const next = { ...b, progress: { ...(b.progress || {}) } };
      ids.forEach((id) => {
        next.progress[id] = { ...(next.progress[id] || {}), [key]: value };
      });
      return next;
    });
  };

  return (
    <div className={`itemline${done ? ' is-done' : ''}`}>
      <button type="button" className="itemline__tick" onClick={() => mark(done ? '' : today())} aria-label={done ? '取消完成' : '標記完成'}>
        {done ? '✓' : ''}
      </button>
      <span className="itemline__label">
        {isEn ? en || englishOf(label) || termFor('en', label) : label}
        {!isEn && en && <em>{en}</em>}
        {note && <small>{note}</small>}
      </span>
      <span className="itemline__assessor">
        <Write value={state.assessor || ''} onChange={(v) => setField('assessor', v)} compact placeholder="姓名" label="審核員" />
      </span>
      <span className="itemline__date">
        <Write value={state.date || ''} onChange={mark} type="date" compact label="日期" />
      </span>
    </div>
  );
}

export function ProgressRow({ label, en, ids = [], certKey, note, cert = true, assessor = true, sub }) {
  const { book, update } = useBook();
  const { isEn } = useLang();
  const primary = ids[0];
  const state = (primary && getPath(book, `progress.${primary}`)) || {};
  const page = certKey ? certKey.split('.').slice(0, 2).join('.') : null;
  const write = (key, value) => {
    update((b) => {
      let next = { ...b, progress: { ...(b.progress || {}) } };
      ids.forEach((id) => {
        next.progress[id] = { ...(next.progress[id] || {}), [key]: value, at: new Date().toISOString() };
      });
      return next;
    });
  };
  const setCert = (value) => {
    update((b) => {
      const next = { ...b, progress: { ...(b.progress || {}) } };
      ids.forEach((id) => {
        next.progress[id] = { ...(next.progress[id] || {}), cert: value };
      });
      return next;
    });
  };
  return (
    <div className={`prow ${cert && assessor ? 'prow--4' : 'prow--3'}${state.date ? ' is-done' : ''}`}>
      <span className="prow__label">
        {sub && <i className="prow__sub">{sub}</i>}
        {isEn ? en || englishOf(label) || termFor('en', label) : label}
        {!isEn && en && <em>{en}</em>}
        {note && <small>{note}</small>}
      </span>
      {cert && (
        <span className="prow__cell" data-label={isEn ? 'Certificate No.' : '證書編號'}>
          <Write value={state.cert || ''} onChange={setCert} compact placeholder="證書編號" label="證書編號" />
        </span>
      )}
      {assessor && (
        <span className="prow__cell" data-label={isEn ? 'Assessor' : '審核員'}>
          <Write value={state.assessor || ''} onChange={(v) => write('assessor', v)} compact placeholder="審核員" label="審核員" />
        </span>
      )}
      <span className="prow__cell" data-label={isEn ? 'Date' : '日期'}>
        <Write value={state.date || ''} onChange={(v) => write('date', v)} type="date" compact label="日期" />
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- 簽名區 */

export function Sig({ path, title, en, name, label, compact = false }) {
  const [value, set] = useField(path, null);
  const { isEn } = useLang();
  const primary = label || title || '簽署';
  return (
    <SignatureBlock
      label={isEn ? en || englishOf(primary) || primary : primary}
      value={value}
      onSign={set}
      onClear={() => set(null)}
      name={name}
      title={title}
      compact={compact}
      hint={isEn ? 'Tap to sign' : en ? `點擊簽署 · ${en}` : undefined}
    />
  );
}

export function Comment({ page, title = '審核員評語', en = "Assessor's Comments", compact = false, ids = [], datePath }) {
  const [date] = useField(datePath || `pages.${page}.date`);
  const { update } = useBook();
  const key = ids.join(',');
  useEffect(() => {
    if (!key || !date) return;
    update((b) => {
      const progress = { ...(b.progress || {}) };
      let changed = false;
      ids.forEach((id) => {
        const row = progress[id] || {};
        if (row.date !== date) {
          progress[id] = { ...row, date, at: new Date().toISOString() };
          changed = true;
        }
      });
      return changed ? { ...b, progress } : b;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, key]);
  return (
    <div className={cx('cmt', compact && 'cmt--compact')}>
      <Area label={title} en={en} path={`pages.${page}.comment`} rows={compact ? 2 : 3} placeholder="評語…" />
      {!compact && (
        <div className="cmt__foot">
          <div className="cmt__sign">
            <Sig
              path={`pages.${page}.sig`}
              title="審核員姓名及簽署"
              label="審核員姓名及簽署"
              en="Name and Signature of Assessor"
              compact
            />
          </div>
          <Line label="職位" en="Post" path={`pages.${page}.post`} />
          <Line label="日期" en="Date" type="date" path={`pages.${page}.date`} />
        </div>
      )}
    </div>
  );
}

export function Present({ page, signer = '樂行童軍團長', en = 'Rover Scout Leader', extra, children }) {
  const [presentedOn] = useField(`pages.${page}.presentedOn`);
  const { isEn } = useLang();
  return (
    <div className="present">
      {presentedOn && <span className="present__stamp">{isEn ? 'PRESENTED' : '已頒發'}</span>}
      <div className="present__grid">
        <Line label="頒發日期" en="Presented on" type="date" path={`pages.${page}.presentedOn`} />
        <Line label="地點" en="at" path={`pages.${page}.place`} />
        <Line label="頒發人" en="by" path={`pages.${page}.by`} />
      </div>
      {extra}
      {children}
      <div className="present__sig">
        <Sig path={`pages.${page}.sig`} title={signer} label={signer} en={en} />
      </div>
    </div>
  );
}
