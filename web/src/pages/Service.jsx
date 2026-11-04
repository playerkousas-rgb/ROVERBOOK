import React from 'react';
import { useBook } from '../bookContext.js';
import { Spread, ChapterMark } from '../components/Paper.jsx';
import { Field, AddRow, DeleteRow } from '../components/Edit.jsx';
import { SignatureBlock } from '../components/Ink.jsx';
import { uid } from '@shared/book.js';

export default function Service() {
  const { book, update } = useBook();
  const rows = book.service || [];

  const patch = (id, key, value) =>
    update((b) => ({ ...b, service: b.service.map((r) => (r.id === id ? { ...r, [key]: value } : r)) }));

  return (
    <Spread
      section="service"
      folioLeft="7"
      folioRight="7"
      left={
        <>
          <ChapterMark
            no="06"
            title="服務紀錄"
            en="SERVICE RECORD"
            lead="此表記錄樂行童軍成員在旅、團、學生會、会社或其他團體的服務。"
          />
          <div className="aside-block">
            <h4>「服務」是樂行童軍的銘言</h4>
            <p>
              除了團內崗位，社區服務、學生會、教會或體育會的義務工作也可記錄。
              每項服務可請委任人或領袖簽署核實，簽名只儲存在你的裝置。
            </p>
          </div>
          <div className="aside-count">
            <strong>{rows.length}</strong>
            <span>項服務紀錄</span>
          </div>
        </>
      }
      right={
        <>
          <div className="formhead">
            <h3>服務紀錄</h3>
            <span>表格 E</span>
          </div>

          {rows.length === 0 && <p className="emptyline">尚未有紀錄。按下方「加一項服務」。 </p>}

          {rows.map((r) => (
            <div className="entry" key={r.id}>
              <div className="entry__grid">
                <Field label="崗位 / 職位" en="Post / Title" value={r.post} onChange={(v) => patch(r.id, 'post', v)} placeholder="團秘書 Crew Secretary" />
                <div className="entry__pair">
                  <Field label="由" en="From" value={r.from} onChange={(v) => patch(r.id, 'from', v)} placeholder="2025-01" />
                  <Field label="至" en="To" value={r.to} onChange={(v) => patch(r.id, 'to', v)} placeholder="現任" />
                </div>
                <Field label="委任人" en="Appointed by" value={r.appointedBy} onChange={(v) => patch(r.id, 'appointedBy', v)} placeholder="馬啟明" />
              </div>
              <div className="entry__foot">
                <SignatureBlock
                  compact
                  label="核實簽署"
                  value={r.signature}
                  onSign={(sig) => patch(r.id, 'signature', sig)}
                  onClear={() => patch(r.id, 'signature', null)}
                />
                <DeleteRow onClick={() => update((b) => ({ ...b, service: b.service.filter((x) => x.id !== r.id) }))} />
              </div>
            </div>
          ))}

          <AddRow
            label="加一項服務"
            onClick={() =>
              update((b) => ({
                ...b,
                service: [...b.service, { id: uid('srv'), post: '', from: '', to: '', appointedBy: '', signature: null }],
              }))
            }
          />
        </>
      }
    />
  );
}
