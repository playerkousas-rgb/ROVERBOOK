import React from 'react';
import { useBook } from '../bookContext.js';
import { Spread, ChapterMark } from '../components/Paper.jsx';
import { Field, AddRow, DeleteRow } from '../components/Edit.jsx';
import { SignatureBlock } from '../components/Ink.jsx';
import { uid } from '@shared/book.js';
import { BADGE_SYLLABUS } from '@shared/syllabus.js';

export default function Awards() {
  const { book, update } = useBook();
  const rows = book.awards || [];

  const patch = (id, key, value) =>
    update((b) => ({ ...b, awards: b.awards.map((r) => (r.id === id ? { ...r, [key]: value } : r)) }));

  return (
    <Spread
      section="awards"
      folioLeft="8"
      folioRight="8"
      left={
        <>
          <ChapterMark
            no="07"
            title="獎章及獎勵"
            en="AWARDS & COMMENDATIONS"
            lead="包括童軍獎章、地域或總會嘉許，以及其他機構頒發的獎勵。"
          />
          <div className="aside-block">
            <h4>四項漸進獎章</h4>
            <ul className="bullets">
              {BADGE_SYLLABUS.map((b) => (
                <li key={b.id}>
                  {b.icon} {b.name}
                  <em>{b.en}</em>
                </li>
              ))}
            </ul>
            <p>四項獎章的細項進度在「訓練計劃」頁，由領袖逐項簽署。</p>
          </div>
        </>
      }
      right={
        <>
          <div className="formhead">
            <h3>獎章及獎勵</h3>
            <span>表格 F</span>
          </div>

          {rows.length === 0 && <p className="emptyline">尚未有獎章紀錄。</p>}

          {rows.map((r) => (
            <div className="entry" key={r.id}>
              <div className="entry__grid">
                <Field label="獎章 / 獎勵名稱" en="Name of Award" value={r.name} onChange={(v) => patch(r.id, 'name', v)} placeholder="樂行童軍肩章" />
                <div className="entry__pair">
                  <Field label="頒發日期" en="Date of Issue" type="date" value={r.date} onChange={(v) => patch(r.id, 'date', v)} />
                  <Field label="頒發機構" en="Organization" value={r.org} onChange={(v) => patch(r.id, 'org', v)} placeholder="九龍地域" />
                </div>
                <Field label="內容簡述" en="Summary" value={r.summary} onChange={(v) => patch(r.id, 'summary', v)} placeholder="完成 7 項考驗中 4 項" />
              </div>
              <div className="entry__foot">
                <SignatureBlock
                  compact
                  label="頒授 / 核實簽署"
                  value={r.signature}
                  onSign={(sig) => patch(r.id, 'signature', sig)}
                  onClear={() => patch(r.id, 'signature', null)}
                />
                <DeleteRow onClick={() => update((b) => ({ ...b, awards: b.awards.filter((x) => x.id !== r.id) }))} />
              </div>
            </div>
          ))}

          <AddRow
            label="加一項獎章"
            onClick={() =>
              update((b) => ({
                ...b,
                awards: [...b.awards, { id: uid('awd'), name: '', summary: '', date: '', org: '', signature: null }],
              }))
            }
          />
        </>
      }
    />
  );
}
