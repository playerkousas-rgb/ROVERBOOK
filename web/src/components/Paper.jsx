import React from 'react';
import { SECTIONS } from '@shared/book.js';
import { Crest, cx } from '../ui.jsx';
import { Link } from '../router.jsx';

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

export function Spread({ left, right, folioLeft, folioRight, section, single = false, className = '' }) {
  return (
    <div className={cx('book', single && 'book--single', className)} data-section={section}>
      <span className="book__spine" aria-hidden="true" />
      <section className="leaf leaf--left">
        <header className="leaf__run">
          <span>樂行童軍紀錄冊</span>
          <span className="leaf__run-en">ROVER SCOUT RECORD BOOK</span>
        </header>
        <div className="leaf__body">{left}</div>
        {folioLeft && <footer className="leaf__folio">{folioLeft}</footer>}
      </section>
      <section className="leaf leaf--right">
        <header className="leaf__run leaf__run--right">
          <span className="leaf__run-en">SCOUT ASSOCIATION OF HONG KONG</span>
          <span>{section ? SECTIONS.find((s) => s.id === section)?.label : ''}</span>
        </header>
        <div className="leaf__body">{right}</div>
        {folioRight && <footer className="leaf__folio leaf__folio--right">{folioRight}</footer>}
      </section>
    </div>
  );
}

export function Tabs({ current }) {
  return (
    <nav className="tabs" aria-label="章節">
      {SECTIONS.map((s) => (
        <Link
          key={s.id}
          to={`/p/${s.id}`}
          className={cx('tab', current === s.id && 'is-active')}
          aria-current={current === s.id ? 'page' : undefined}
        >
          <span className="tab__label">{s.label}</span>
          <span className="tab__page">{s.page}</span>
        </Link>
      ))}
    </nav>
  );
}

export function Pager({ current }) {
  const index = Math.max(0, SECTIONS.findIndex((s) => s.id === current));
  const prev = SECTIONS[index - 1];
  const next = SECTIONS[index + 1];
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
      <span className="pager__rule" />
      {next ? (
        <Link to={`/p/${next.id}`} className="pager__link pager__link--next">
          <span className="pager__dir">下一頁</span>
          <span className="pager__title">{next.label}</span>
        </Link>
      ) : (
        <span className="pager__link pager__link--next pager__link--end">
          <span className="pager__dir">完</span>
          <span className="pager__title">願你繼續服務</span>
        </span>
      )}
    </div>
  );
}

export function CoverPage({ book, onOpen }) {
  const m = book?.member || {};
  return (
    <div className="coverbook">
      <div className="cover">
        <span className="cover__rule cover__rule--outer" />
        <span className="cover__rule cover__rule--inner" />
        <div className="cover__top">
          <Crest size={54} />
          <span className="cover__org">香港童軍總會</span>
          <span className="cover__org-en">SCOUT ASSOCIATION OF HONG KONG</span>
        </div>
        <div className="cover__center">
          <span className="cover__kicker">ROVER SCOUT</span>
          <h1 className="cover__title">樂行童軍</h1>
          <h1 className="cover__title cover__title--sub">紀 錄 冊</h1>
          <span className="cover__en">RECORD BOOK</span>
        </div>
        <div className="cover__plate">
          <span className="cover__plate-label">持有人</span>
          <strong>{m.nameZh || '你的名字'}</strong>
          <span className="cover__plate-sub">
            {[m.crew, m.group].filter(Boolean).join(' · ') || '樂行童軍團'}
          </span>
        </div>
        <div className="cover__foot">
          <span>{new Date().getFullYear()}</span>
          <button className="cover__open" onClick={onOpen}>
            打開紀錄冊
          </button>
          <span>第 5 版綱要</span>
        </div>
      </div>
      <div className="cover__slice" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
