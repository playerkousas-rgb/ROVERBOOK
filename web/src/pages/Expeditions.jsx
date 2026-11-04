import React from 'react';
import { useBook } from '../bookContext.js';
import { Spread, ChapterMark } from '../components/Paper.jsx';
import { Field, AddRow, DeleteRow } from '../components/Edit.jsx';
import { uid } from '@shared/book.js';

export default function Expeditions() {
  const { book, update } = useBook();
  const rows = book.expeditions || [];

  const patch = (id, key, value) =>
    update((b) => ({ ...b, expeditions: b.expeditions.map((r) => (r.id === id ? { ...r, [key]: value } : r)) }));

  return (
    <Spread
      section="expeditions"
      folioLeft="15"
      folioRight="15"
      left={
        <>
          <ChapterMark
            no="09"
            title="遠足及海外活動"
            en="EXPEDITIONS AND OVERSEAS ACTIVITIES"
            lead="在此記錄你在本港或海外進行的遠足，或參與的國際童軍活動。"
          />
          <div className="aside-block">
            <h4>寫得具體一點</h4>
            <p>
              日期、路線、日數、負重、與哪個團交流——這些細節在申請獎章或國際活動時很有用，
              也是你日後回看的記憶。
            </p>
          </div>
        </>
      }
      right={
        <>
          <div className="formhead">
            <h3>遠足及海外活動</h3>
            <span>表格 H</span>
          </div>

          {rows.length === 0 && <p className="emptyline">尚未有遠足紀錄。</p>}

          {rows.map((r) => (
            <div className="entry" key={r.id}>
              <div className="entry__grid">
                <div className="entry__pair">
                  <Field label="時段" en="Period" value={r.period} onChange={(v) => patch(r.id, 'period', v)} placeholder="2025-12-27 至 2025-12-31" />
                  <Field label="項目" en="Item" value={r.item} onChange={(v) => patch(r.id, 'item', v)} placeholder="台灣陽明山跨年遠足" />
                </div>
                <Field
                  label="描述"
                  en="Descriptions"
                  multiline
                  value={r.description}
                  onChange={(v) => patch(r.id, 'description', v)}
                  placeholder="五天四夜，與台北市第 12 團交流，完成 32 公里縱走。"
                />
              </div>
              <div className="entry__foot">
                <span />
                <DeleteRow onClick={() => update((b) => ({ ...b, expeditions: b.expeditions.filter((x) => x.id !== r.id) }))} />
              </div>
            </div>
          ))}

          <AddRow
            label="加一次遠足 / 海外活動"
            onClick={() =>
              update((b) => ({
                ...b,
                expeditions: [...b.expeditions, { id: uid('exp'), period: '', item: '', description: '' }],
              }))
            }
          />
        </>
      }
    />
  );
}
