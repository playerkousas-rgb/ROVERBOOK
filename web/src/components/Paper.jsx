import React from 'react';
import { SECTIONS, PAGE_TOTAL } from '@shared/book.js';
import { Crest, cx } from '../ui.jsx';
import { Link } from '../router.jsx';

/** A single printed page of the record book. */
export function Sheet({ id, no, title, en, children, className = '', dense = false, badge }) {
  return (
    <article className={cx('sheet', dense && 'sheet--dense', className)} data-page={id} data-badge={badge || undefined}>
      <span className="sheet__gutter" aria-hidden="true" />
      <span className="sheet__corner" aria-hidden="true" />
      <header className="sheet__head">
        <span className="sheet__run">
          樂行童軍紀錄冊 <em>ROVER SCOUT RECORD BOOK</em>
        </span>
        {no !== '—' && <span className="sheet__pageno">第 {no} 頁</span>}
      </header>
      <div className="sheet__titlebar">
        <h1>
          {title}
          {en && <em>{en}</em>}
        </h1>
        <span className="sheet__rule" aria-hidden="true" />
      </div>
      <div className="sheet__body">{children}</div>
      <footer className="sheet__foot">
        <span>SCOUT ASSOCIATION OF HONG KONG</span>
        <span>{(en || 'CONTENTS').toUpperCase()}</span>
      </footer>
    </article>
  );
}

/**
 * Pages are authored as spreads in the source; on screen every chapter is ONE
 * printed page (matching the paper book), so only the right-hand form is drawn.
 */
export function Spread({ section, right, className = '', dense = false }) {
  const meta = SECTIONS.find((s) => s.id === section) || {};
  return (
    <Sheet
      id={section}
      no={meta.page}
      title={meta.label || ''}
      en={meta.en || ''}
      className={className}
      dense={dense}
      badge={meta.badge}
    >
      {right}
    </Sheet>
  );
}

/** Compact chapter heading used inside a page (optional). */
export function ChapterMark({ no, title, en, lead, children }) {
  return (
    <div className="chapter">
      <span className="chapter__no">{no}</span>
      <h2 className="chapter__title">{title}</h2>
      <span className="chapter__en">{en}</span>
      {lead && <p className="chapter__lead">{lead}</p>}
      {children}
    </div>
  );
}

/** Vertical index strip (desktop). */
export function Tabs({ current }) {
  return (
    <nav className="tabs" aria-label="章節">
      {SECTIONS.filter((s) => s.id !== 'contents').map((s) => (
        <Link
          key={s.id}
          to={`/p/${s.id}`}
          className={cx('tab', current === s.id && 'is-active')}
          aria-current={current === s.id ? 'page' : undefined}
        >
          <span className="tab__page">{s.page}</span>
          <span className="tab__label">{s.label}</span>
        </Link>
      ))}
    </nav>
  );
}

const pages = () => SECTIONS.filter((s) => s.id !== 'contents');

export function Pager({ current }) {
  const list = pages();
  const index = Math.max(0, list.findIndex((s) => s.id === current));
  const prev = list[index - 1];
  const next = list[index + 1];
  return (
    <div className="pager">
      {prev ? (
        <Link to={`/p/${prev.id}`} className="pager__link">
          <span className="pager__dir">上一頁</span>
          <span className="pager__title">{prev.label}</span>
        </Link>
      ) : (
        <Link to="/" className="pager__link">
          <span className="pager__dir">封面</span>
          <span className="pager__title">樂行童軍紀錄冊</span>
        </Link>
      )}
      <span className="pager__count">
        {list[index]?.page === '—' ? '附錄' : `${list[index]?.page} / ${PAGE_TOTAL}`}
      </span>
      {next ? (
        <Link to={`/p/${next.id}`} className="pager__link pager__link--next">
          <span className="pager__dir">下一頁</span>
          <span className="pager__title">{next.label}</span>
        </Link>
      ) : (
        <Link to="/" className="pager__link pager__link--next">
          <span className="pager__dir">完</span>
          <span className="pager__title">返回封面</span>
        </Link>
      )}
    </div>
  );
}

/** Full-bleed blue cover — the whole screen is the book. */
export function CoverPage({ book, onOpen, last, onContinue, hint }) {
  const m = book?.member || {};
  return (
    <div className="coverart">
      <div className="coverart__grain" aria-hidden="true" />
      <span className="coverart__frame coverart__frame--outer" aria-hidden="true" />
      <span className="coverart__frame coverart__frame--inner" aria-hidden="true" />
      <span className="coverart__spine" aria-hidden="true" />

      <div className="coverart__top">
        <Crest size={62} />
        <div>
          <strong>香港童軍總會</strong>
          <em>SCOUT ASSOCIATION OF HONG KONG</em>
        </div>
      </div>

      <div className="coverart__center">
        <span className="coverart__kicker">ROVER SCOUT</span>
        <h1 className="coverart__title">樂行童軍</h1>
        <h2 className="coverart__subtitle">紀　錄　冊</h2>
        <span className="coverart__en">RECORD BOOK</span>
      </div>

      <div className="coverart__plate">
        <span className="coverart__plate-label">持有人 HOLDER</span>
        <strong>{m.nameZh || '你的名字'}</strong>
        <span className="coverart__plate-sub">
          {[m.crew, m.group].filter(Boolean).join(' · ') || '樂行童軍團'}
        </span>
        {m.memberNo && <span className="coverart__plate-no">No. {m.memberNo}</span>}
        {hint && <span className="coverart__hint">{hint}</span>}
        <div className="coverart__badges">
          {[
            { id: 'L1', label: '會員章', short: '會' },
            { id: 'L2', label: '肩章', short: '肩' },
            { id: 'L3', label: '獎章', short: '獎' },
            { id: 'L4', label: '貝登堡', short: '貝' },
          ].map((b) => {
            const earned = !!book?.badges?.[b.id]?.date;
            return (
              <span
                key={b.id}
                className={cx('coverart__medal', earned && 'is-earned')}
                title={`${b.label}${earned ? ` · ${book.badges[b.id].date}` : ' · 未獲頒'}`}
              >
                {b.short}
              </span>
            );
          })}
        </div>
      </div>

      <div className="coverart__foot">
        <span className="coverart__year">{new Date().getFullYear()}</span>
        <button className="coverart__open" onClick={onOpen}>
          打開紀錄冊
        </button>
        {last && (
          <button className="coverart__resume" onClick={onContinue}>
            繼續上次 · 第 {last.page} 頁 <span>{last.label}</span>
          </button>
        )}
        <span className="coverart__edition">第五版綱要</span>
      </div>
    </div>
  );
}
