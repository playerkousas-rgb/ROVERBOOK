import React from 'react';
import { useBook } from '../bookContext.js';
import { Spread, ChapterMark } from '../components/Paper.jsx';
import { Field, AddRow, DeleteRow } from '../components/Edit.jsx';
import { uid } from '@shared/book.js';

export default function Additional() {
  const { book, update } = useBook();
  const rows = book.additional || [];

  const patch = (id, key, value) =>
    update((b) => ({ ...b, additional: b.additional.map((r) => (r.id === id ? { ...r, [key]: value } : r)) }));

  return (
    <Spread
      section="additional"
      folioLeft="16"
      folioRight="16"
      left={
        <>
          <ChapterMark
            no="10"
            title="其他經驗"
            en="ADDITIONAL EXPERIENCES"
            lead="在此記錄你在樂行童軍支部所獲得的其他經驗，包括但不限於參加之活動、在樂行童軍團所負責之特別任務、在管理委員會所擔任之職位等。"
          />
          <div className="aside-block">
            <h4>可以寫甚麼</h4>
            <ul className="bullets">
              <li>管理委員會職務、團內特別任務</li>
              <li>訓練班、證書（急救、繩索、山藝）</li>
              <li>持續參與的興趣或技能</li>
            </ul>
          </div>
        </>
      }
      right={
        <>
          <div className="formhead">
            <h3>其他經驗</h3>
            <span>表格 I</span>
          </div>

          {rows.length === 0 && <p className="emptyline">尚未有紀錄。</p>}

          {rows.map((r) => (
            <div className="entry" key={r.id}>
              <div className="entry__grid">
                <div className="entry__pair">
                  <Field label="時段" en="Period" value={r.period} onChange={(v) => patch(r.id, 'period', v)} placeholder="2025-05" />
                  <Field label="項目" en="Items" value={r.item} onChange={(v) => patch(r.id, 'item', v)} placeholder="聖約翰急救證書" />
                </div>
                <Field
                  label="描述"
                  en="Descriptions"
                  multiline
                  value={r.description}
                  onChange={(v) => patch(r.id, 'description', v)}
                  placeholder="持有至 2028 年 5 月。"
                />
              </div>
              <div className="entry__foot">
                <span />
                <DeleteRow onClick={() => update((b) => ({ ...b, additional: b.additional.filter((x) => x.id !== r.id) }))} />
              </div>
            </div>
          ))}

          <AddRow
            label="加一項其他經驗"
            onClick={() =>
              update((b) => ({
                ...b,
                additional: [...b.additional, { id: uid('add'), period: '', item: '', description: '' }],
              }))
            }
          />
        </>
      }
    />
  );
}
