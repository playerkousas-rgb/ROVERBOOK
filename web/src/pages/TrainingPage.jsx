import React, { useMemo, useState } from 'react';
import { useBook } from '../bookContext.js';
import { Spread } from '../components/Paper.jsx';
import { SignatureBlock, SignModal } from '../components/Ink.jsx';
import Write from '../components/Write.jsx';
import { Field } from '../components/Edit.jsx';
import { Icon, cx, useToast } from '../ui.jsx';
import { BADGE_SYLLABUS, badgeStats, today } from '@shared/book.js';

export default function TrainingPage({ sectionId, badgeId, part }) {
  const { book, update } = useBook();
  const { push } = useToast();
  const [signFor, setSignFor] = useState(null);
  const [openDetail, setOpenDetail] = useState({});

  const badge = BADGE_SYLLABUS.find((b) => b.id === badgeId);
  const stats = useMemo(() => badgeStats(book, badgeId), [book, badgeId]);
  const segments = part === undefined ? badge.segments : part === 0 ? badge.segments.slice(0, 3) : badge.segments.slice(3);

  const itemState = (id) => book.progress?.[id] || {};
  const setItem = (itemId, patch) =>
    update((b) => ({
      ...b,
      progress: { ...b.progress, [itemId]: { ...(b.progress[itemId] || {}), ...patch } },
    }));

  const toggle = (itemId) => {
    const cur = itemState(itemId).date;
    setItem(itemId, { date: cur ? '' : today() });
  };

  const signItem = (itemId) => setSignFor({ kind: 'item', id: itemId });
  const setBadge = (patch) =>
    update((b) => ({ ...b, badges: { ...b.badges, [badgeId]: { ...(b.badges?.[badgeId] || {}), ...patch } } }));

  const award = book.badges?.[badgeId] || {};
  const done = segments.reduce((n, s) => n + s.items.filter((i) => itemState(i.id).date).length, 0);
  const total = segments.reduce((n, s) => n + s.items.length, 0);

  const target = signFor?.kind === 'item' ? signFor.id : null;
  const targetItem = target ? badge.segments.flatMap((s) => s.items).find((i) => i.id === target) : null;

  return (
    <Spread
      section={sectionId}
      dense
      right={
        <>
          <div className="badgestrip">
            <span className="badgestrip__icon">{badge.icon}</span>
            <div className="badgestrip__main">
              <p>{badge.purpose}</p>
            </div>
            <div className="badgestrip__count">
              <strong>
                {done}
                <em>/{total}</em>
              </strong>
              <span>本頁完成</span>
            </div>
          </div>

          <div className="segments">
            {segments.map((seg) => {
              const segDone = seg.items.filter((i) => itemState(i.id).date).length;
              return (
                <section className="segment" key={seg.code}>
                  <header className="segment__head">
                    <span className="segment__code">{seg.code.split('-').slice(1).join(' ')}</span>
                    <strong>{seg.name}</strong>
                    <em>
                      {segDone}/{seg.items.length}
                    </em>
                  </header>

                  {seg.items.map((item) => {
                    const state = itemState(item.id);
                    return (
                      <div className={cx('titem', state.date && 'is-done')} key={item.id}>
                        <button
                          className={cx('titem__check', state.date && 'is-on')}
                          onClick={() => toggle(item.id)}
                          aria-label={state.date ? '取消完成' : '標記完成'}
                          aria-pressed={!!state.date}
                        >
                          {state.date && <Icon name="check" size={11} />}
                        </button>

                        <div className="titem__body">
                          <p className="titem__name" onClick={() => setOpenDetail((v) => ({ ...v, [item.id]: !v[item.id] }))}>
                            {item.name}
                            {item.mandatory && <span className="tag tag--req">必修</span>}
                            {state.source === 'roverbadge' && <span className="tag tag--rb">RB</span>}
                            <span className="titem__code">{item.id}</span>
                          </p>
                          {openDetail[item.id] && item.detail && <p className="titem__detail">{item.detail}</p>}
                        </div>

                        <div className="titem__date">
                          <Write
                            type="date"
                            compact
                            value={state.date || ''}
                            onChange={(v) => setItem(item.id, { date: v })}
                            label={`${item.name} 日期`}
                          />
                        </div>

                        <div className="titem__sign">
                          {state.signature ? (
                            <>
                              <button
                                className="minisign is-signed"
                                onClick={() => signItem(item.id)}
                                title={`${state.signature.name || '已簽署'} · ${state.signature.at || ''}`}
                              >
                                <img src={state.signature.png} alt="簽名" />
                              </button>
                              <button
                                className="minisign__clear"
                                onClick={() => setItem(item.id, { signature: null })}
                                aria-label="清除簽名"
                              >
                                <Icon name="x" size={9} />
                              </button>
                            </>
                          ) : (
                            <button className="minisign" onClick={() => signItem(item.id)}>
                              <Icon name="pen" size={11} /> 簽
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </section>
              );
            })}
          </div>

          <div className="badgeaward">
            <div className="badgeaward__left">
              <strong>頒授{badge.name}</strong>
              <p>
                {stats.done === stats.total
                  ? '全部細項已完成，可由領袖簽署確認。'
                  : `全章尚餘 ${stats.total - stats.done} 項。`}
              </p>
              {award.date && <span className="awarded">已於 {award.date} 獲頒</span>}
            </div>
            <div className="badgeaward__right">
              <Field
                label="頒授日期"
                type="date"
                value={award.date || ''}
                onChange={(v) => setBadge({ date: v })}
              />
              <SignatureBlock
                compact
                label="領袖簽署"
                value={award.signature}
                onSign={(sig) => setBadge({ signature: sig, date: award.date || today() })}
                onClear={() => setBadge({ signature: null })}
              />
            </div>
          </div>

          {part !== undefined && (
            <p className="footnote">
              本頁為「{badge.name}」第 {part + 1} 部分；按頁碼或「目錄」可前往下一頁。點項目名稱可看考驗內容。
            </p>
          )}

          <SignModal
            open={!!signFor}
            onClose={() => setSignFor(null)}
            title={targetItem?.name || '主考簽署'}
            subtitle="由主考或領袖即場簽署；日期會自動填入。"
            onSave={(sig) => {
              if (!signFor) return;
              const item = targetItem;
              setItem(signFor.id, { signature: sig, date: itemState(signFor.id).date || sig.at || today() });
              setSignFor(null);
              push(`已簽署：${item?.name || '項目'}`);
            }}
          />
        </>
      }
    />
  );
}
