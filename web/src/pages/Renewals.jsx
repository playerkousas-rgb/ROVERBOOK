import React from 'react';
import { useBook } from '../bookContext.js';
import { Spread, ChapterMark } from '../components/Paper.jsx';
import { InlineField, AddRow, DeleteRow } from '../components/Edit.jsx';
import { SignatureBlock } from '../components/Ink.jsx';
import { membershipStatus, uid, today } from '@shared/book.js';

export default function Renewals() {
  const { book, update } = useBook();
  const rows = [...(book.renewals || [])].sort((a, b) => Number(b.year) - Number(a.year));
  const status = membershipStatus(book);

  const patch = (id, key, value) =>
    update((b) => ({ ...b, renewals: b.renewals.map((r) => (r.id === id ? { ...r, [key]: value } : r)) }));

  const add = () => {
    const year = new Date().getFullYear();
    if (rows.some((r) => Number(r.year) === year)) return;
    update((b) => ({
      ...b,
      renewals: [...b.renewals, { id: uid('rnw'), year, validUntil: `${year}-12-31`, signature: null }],
    }));
  };

  return (
    <Spread
      section="renewals"
      folioLeft="6"
      folioRight="6"
      left={
        <>
          <ChapterMark
            no="05"
            title="會員資格"
            en="RENEWAL OF MEMBERSHIP"
            lead="更新會員資格應按年由團長簽署及蓋章確認，有效期由該年一月一日至十二月三十一日。"
          />
          <div className={`statusbox ${status.active ? 'is-ok' : 'is-warn'}`}>
            <span className="statusbox__label">目前會籍</span>
            <strong>{status.validUntil ? `有效至 ${status.validUntil}` : '尚未續會'}</strong>
            <span className="statusbox__sub">
              {status.renewal ? `由 ${status.renewal.signature?.name || '團長'} 簽署` : '請團長在右頁簽署'}
            </span>
          </div>
          <div className="aside-block">
            <h4>為甚麼要每年簽</h4>
            <p>
              續會是領袖確認你仍然在團、仍然活躍的方式。數碼版本保留同一原則：每一年一格，
              由領袖親自在你的裝置上簽名，日期無法被覆寫，但可以重新簽署。
            </p>
          </div>
        </>
      }
      right={
        <>
          <div className="formhead">
            <h3>會員資格續期</h3>
            <span>表格 D</span>
          </div>

          <div className="renewtable">
            <div className="renewtable__head">
              <span>年份</span>
              <span>有效日期至</span>
              <span>旅印及簽署</span>
              <span />
            </div>
            {rows.length === 0 && <p className="emptyline">尚未有續會紀錄。</p>}
            {rows.map((r) => (
              <div className="renewtable__row" key={r.id}>
                <InlineField value={r.year} onChange={(v) => patch(r.id, 'year', v)} type="number" />
                <InlineField value={r.validUntil} onChange={(v) => patch(r.id, 'validUntil', v)} type="date" />
                <SignatureBlock
                  compact
                  label="團長簽署"
                  value={r.signature}
                  onSign={(sig) => patch(r.id, 'signature', sig)}
                  onClear={() => patch(r.id, 'signature', null)}
                />
                <DeleteRow onClick={() => update((b) => ({ ...b, renewals: b.renewals.filter((x) => x.id !== r.id) }))} />
              </div>
            ))}
          </div>

          <AddRow label={`加 ${new Date().getFullYear()} 年度續會`} onClick={add} />

          <p className="footnote">
            紀錄冊註：會員資格須按年由團長簽署及蓋章確認，並由該年一月一日至十二月三十一日止。
            （截至今日：{today()}）
          </p>
        </>
      }
    />
  );
}
