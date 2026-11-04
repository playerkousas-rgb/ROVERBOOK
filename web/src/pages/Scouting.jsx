import React from 'react';
import { useBook } from '../bookContext.js';
import { Spread, ChapterMark } from '../components/Paper.jsx';
import { Field, AddRow, DeleteRow } from '../components/Edit.jsx';
import { uid } from '@shared/book.js';

export default function Scouting() {
  const { book, update } = useBook();
  const rows = book.scouting || [];

  const patch = (id, key, value) =>
    update((b) => ({ ...b, scouting: b.scouting.map((r) => (r.id === id ? { ...r, [key]: value } : r)) }));

  return (
    <Spread
      section="scouting"
      folioLeft="5"
      folioRight="5"
      left={
        <>
          <ChapterMark
            no="04"
            title="童軍紀錄"
            en="SCOUTING EXPERIENCE"
            lead="由小童軍到樂行童軍的經歷。這一頁讓領袖一眼看到你在童軍運動中的整段路，而不只是現在的團。"
          />
          <div className="aside-block">
            <h4>填寫方式</h4>
            <ul className="bullets">
              <li>每行代表一個支部或崗位，可同時保留多行。</li>
              <li>「由 / 至」用年月即可，現任可留空「至」。</li>
              <li>最高獎章填寫該階段已獲取的最高獎章。</li>
            </ul>
          </div>
        </>
      }
      right={
        <>
          <div className="formhead">
            <h3>童軍紀錄</h3>
            <span>表格 C</span>
          </div>

          <div className="scouttable">
            <div className="scouttable__head">
              <span>期間</span>
              <span>旅／單位</span>
              <span>崗位／職位</span>
              <span>最高獎章</span>
              <span />
            </div>
            {rows.map((r) => (
              <div className="scouttable__row" key={r.id}>
                <div className="period">
                  <Field label="" value={r.from} onChange={(v) => patch(r.id, 'from', v)} placeholder="2020-09" />
                  <span>→</span>
                  <Field label="" value={r.to} onChange={(v) => patch(r.id, 'to', v)} placeholder="2024-08" />
                </div>
                <Field label="" value={r.unit} onChange={(v) => patch(r.id, 'unit', v)} placeholder="童軍 Scout" />
                <Field label="" value={r.post} onChange={(v) => patch(r.id, 'post', v)} placeholder="小隊副隊長" />
                <Field label="" value={r.highestAward} onChange={(v) => patch(r.id, 'highestAward', v)} placeholder="童軍標準章" />
                <DeleteRow onClick={() => update((b) => ({ ...b, scouting: b.scouting.filter((x) => x.id !== r.id) }))} />
              </div>
            ))}
          </div>

          <AddRow
            label="加一個階段"
            onClick={() =>
              update((b) => ({
                ...b,
                scouting: [...b.scouting, { id: uid('sco'), unit: '', post: '', highestAward: '', from: '', to: '' }],
              }))
            }
          />
        </>
      }
    />
  );
}
