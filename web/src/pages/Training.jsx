import React, { useMemo, useRef, useState } from 'react';
import { useBook } from '../bookContext.js';
import { Spread, ChapterMark } from '../components/Paper.jsx';
import { SignatureBlock } from '../components/Ink.jsx';
import { InlineField, Field } from '../components/Edit.jsx';
import { Icon, useToast, cx } from '../ui.jsx';
import { download } from '../bookStore.js';
import {
  BADGE_SYLLABUS,
  SYLLABUS_META,
  allStats,
  badgeStats,
  exportForRoverBadge,
  importFromRoverBadge,
  today,
} from '@shared/book.js';

export default function Training() {
  const { book, update } = useBook();
  const { push } = useToast();
  const [active, setActive] = useState(() => {
    const s = allStats(book);
    return (s.badges.find((b) => b.done < b.total) || s.badges[0]).badge.id;
  });
  const [hideDone, setHideDone] = useState(false);
  const fileRef = useRef(null);

  const stats = useMemo(() => allStats(book), [book]);
  const current = badgeStats(book, active);
  const badge = current.badge;

  const setItem = (itemId, patch) =>
    update((b) => ({
      ...b,
      progress: { ...b.progress, [itemId]: { ...(b.progress[itemId] || {}), ...patch } },
    }));

  const toggle = (itemId) => {
    const cur = book.progress?.[itemId]?.date;
    setItem(itemId, { date: cur ? '' : today() });
  };

  const setBadge = (badgeId, patch) =>
    update((b) => ({ ...b, badges: { ...b.badges, [badgeId]: { ...(b.badges?.[badgeId] || {}), ...patch } } }));

  const exportFile = () => {
    download(
      `roverbadge-progress-${book.member.ymis || 'member'}-${today()}.json`,
      exportForRoverBadge(book, book.member.troopId || ''),
    );
    push('已匯出 ROVERBADGE 進度檔');
  };

  const importFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        const draft = structuredClone(book);
        const result = importFromRoverBadge(data, draft);
        draft.member = result.member;
        update(() => draft);
        push(
          result.imported
            ? `已匯入 ${result.imported} 項進度（${result.matchedBy}）`
            : `沒有新進度可匯入（${result.matchedBy}）`,
        );
      } catch (e) {
        push(e.message || '無法讀取檔案', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <Spread
      section="training"
      folioLeft="9"
      folioRight="10"
      left={
        <>
          <ChapterMark
            no="08"
            title="訓練計劃"
            en="ROVER SCOUT TRAINING SCHEME"
            lead="樂行童軍訓練計劃共分四個階段：會員章、樂行童軍肩章、樂行童軍獎章及貝登堡獎章。七項考驗可同時進行。"
          />

          <div className="progresslist">
            {stats.badges.map((s) => (
              <button
                key={s.badge.id}
                className={cx('progressrow', active === s.badge.id && 'is-active', s.done === s.total && 'is-complete')}
                onClick={() => setActive(s.badge.id)}
              >
                <span className="progressrow__icon">{s.badge.icon}</span>
                <span className="progressrow__main">
                  <strong>{s.badge.name}</strong>
                  <span className="progressrow__bar">
                    <i style={{ width: `${s.percent}%` }} />
                  </span>
                  <em>
                    {s.done} / {s.total} 項 · {s.awarded ? `已於 ${s.awarded} 獲頒` : s.percent === 100 ? '待領袖頒授' : '進行中'}
                  </em>
                </span>
              </button>
            ))}
          </div>

          <div className="aside-block">
            <h4>與 ROVERBADGE 互通</h4>
            <p>
              本頁的 32 項細項及編號（L1–L4）與 <strong>ROVERBADGE</strong> 相同。你可以把進度匯出給領袖，
              或把領袖在 ROVERBADGE 批核的進度匯入這裡。
            </p>
            <div className="aside-actions">
              <button className="btn btn--ghost btn--sm" onClick={exportFile}>
                <Icon name="download" size={14} /> 匯出進度
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()}>
                <Icon name="upload" size={14} /> 匯入進度
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => importFile(e.target.files?.[0])}
            />
            <p className="tiny">綱要版本：{SYLLABUS_META.version} · {SYLLABUS_META.base}</p>
          </div>
        </>
      }
      right={
        <>
          <div className="formhead">
            <h3>訓練進度</h3>
            <span>
              {current.done} / {current.total} 項
            </span>
          </div>

          <div className="badgetabs">
            {BADGE_SYLLABUS.map((b) => {
              const s = badgeStats(book, b.id);
              return (
                <button key={b.id} className={cx('badgetab', active === b.id && 'is-active')} onClick={() => setActive(b.id)}>
                  <span>{b.icon}</span>
                  {b.name}
                </button>
              );
            })}
          </div>

          <div className="badgeblurb">
            <strong>{badge.name}</strong>
            <em>{badge.en}</em>
            <p>{badge.purpose}</p>
          </div>

          <label className="filterline">
            <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
            只顯示未完成項目
          </label>

          <div className="segments">
            {badge.segments.map((seg) => {
              const items = hideDone ? seg.items.filter((i) => !book.progress?.[i.id]?.date) : seg.items;
              if (items.length === 0) return null;
              const doneCount = seg.items.filter((i) => book.progress?.[i.id]?.date).length;
              return (
                <section className="segment" key={seg.code}>
                  <header className="segment__head">
                    <span className="segment__code">{seg.code.split('-').slice(1).join(' ')}</span>
                    <strong>{seg.name}</strong>
                    <em>
                      {doneCount}/{seg.items.length}
                    </em>
                  </header>
                  {items.map((item) => {
                    const state = book.progress?.[item.id] || {};
                    return (
                      <div className={cx('titem', state.date && 'is-done')} key={item.id}>
                        <button
                          className={cx('titem__check', state.date && 'is-on')}
                          onClick={() => toggle(item.id)}
                          aria-label={state.date ? '取消完成' : '標記完成'}
                          aria-pressed={!!state.date}
                        >
                          {state.date && <Icon name="check" size={12} />}
                        </button>
                        <div className="titem__body">
                          <p className="titem__name">
                            {item.name}
                            {item.mandatory && <span className="tag tag--req">必修</span>}
                            {state.source === 'roverbadge' && <span className="tag tag--rb">ROVERBADGE</span>}
                          </p>
                          {item.detail && <p className="titem__detail">{item.detail}</p>}
                          <div className="titem__row">
                            <label className="titem__date">
                              <span>日期</span>
                              <InlineField
                                type="date"
                                value={state.date || ''}
                                onChange={(v) => setItem(item.id, { date: v })}
                              />
                            </label>
                            <span className="titem__code">{item.id}</span>
                          </div>
                          <SignatureBlock
                            compact
                            label="主考 / 領袖簽署"
                            value={state.signature}
                            onSign={(sig) => setItem(item.id, { signature: sig, date: state.date || today() })}
                            onClear={() => setItem(item.id, { signature: null })}
                          />
                        </div>
                      </div>
                    );
                  })}
                </section>
              );
            })}
          </div>

          <div className="badgeaward">
            <div>
              <strong>頒授{badge.name}</strong>
              <p>
                {current.done === current.total
                  ? '所有細項已完成，可由領袖簽署確認。'
                  : `尚餘 ${current.total - current.done} 項。`}
              </p>
              {book.badges?.[badge.id]?.date && <span className="awarded">已於 {book.badges[badge.id].date} 獲頒</span>}
            </div>
            <div className="badgeaward__right">
              <Field
                label="頒授日期"
                type="date"
                value={book.badges?.[badge.id]?.date || ''}
                onChange={(v) => setBadge(badge.id, { date: v })}
              />
              <SignatureBlock
                compact
                label="領袖簽署"
                value={book.badges?.[badge.id]?.signature}
                onSign={(sig) => setBadge(badge.id, { signature: sig, date: book.badges?.[badge.id]?.date || today() })}
                onClear={() => setBadge(badge.id, { signature: null })}
              />
            </div>
          </div>
        </>
      }
    />
  );
}
