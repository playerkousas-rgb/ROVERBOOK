import React from 'react';
import { useBook } from '../bookContext.js';
import { Spread, ChapterMark } from '../components/Paper.jsx';
import { SignatureBlock } from '../components/Ink.jsx';
import { Field } from '../components/Edit.jsx';
import { SealMark, Icon } from '../ui.jsx';

export default function Signatures() {
  const { book, update } = useBook();
  const m = book.member;
  const e = book.endorsement || {};

  const setEndorse = (patch) => update((b) => ({ ...b, endorsement: { ...(b.endorsement || {}), ...patch } }));

  return (
    <Spread
      section="signatures"
      folioLeft="17"
      folioRight="17"
      left={
        <>
          <ChapterMark
            no="11"
            title="簽署及聲明"
            en="SIGNATURES & DECLARATION"
            lead="本人謹此聲明，以上各項資料均屬真實無訛，並同意本紀錄冊所載資料的真確性由本人負責。"
          />
          <div className="declaration">
            <p>
              本人明白樂行童軍紀錄冊為本人在樂行童軍支部期間的個人紀錄。本冊所載的技能、服務及
              獎章進度，均須由領袖或主考核實；如有虛報，有關資格可能被撤銷。
            </p>
            <p>
              電子紀錄冊的資料儲存在本人的裝置內，不會自動上載。本人可自行決定是否透過
              分享連結或二維碼向他人展示指定章節。
            </p>
          </div>
          <div className="sealbox">
            <span className="sealbox__label">旅印</span>
            <div className="sealbox__space">
              <SealMark text={m.group || '樂行童軍'} sub={m.crew ? m.crew.replace('樂行童軍團', '') : '旅'} size={100} />
            </div>
            <p>旅印由旅部蓋章；電子紀錄冊以領袖簽署作實。</p>
          </div>
        </>
      }
      right={
        <>
          <div className="formhead">
            <h3>持有人</h3>
            <span>表格 J</span>
          </div>

          <SignatureBlock
            label="持有人簽署 Signature of Holder"
            value={book.holderSignature}
            name={m.nameZh}
            title="持有人"
            onSign={(sig) => update((b) => ({ ...b, holderSignature: sig }))}
            onClear={() => update((b) => ({ ...b, holderSignature: null }))}
          />

          <div className="formhead formhead--sub">
            <h3>領袖核實</h3>
            <span>由團長或獲授權領袖填寫</span>
          </div>

          <div className="formgrid formgrid--2">
            <Field label="姓名" en="Name" value={e.name || ''} onChange={(v) => setEndorse({ name: v })} placeholder="馬啟明" />
            <Field label="職位" en="Appointment" value={e.title || ''} onChange={(v) => setEndorse({ title: v })} placeholder="樂行童軍團長" />
            <Field label="旅 / 團" en="Group / Crew" value={e.crew ?? m.crew} onChange={(v) => setEndorse({ crew: v })} />
            <Field label="核實日期" en="Date" type="date" value={e.date || ''} onChange={(v) => setEndorse({ date: v })} />
          </div>

          <SignatureBlock
            label="領袖簽署 Signature of Leader"
            value={e.signature}
            name={e.name || ''}
            title={e.title || ''}
            onSign={(sig) => setEndorse({ signature: sig, date: e.date || '' })}
            onClear={() => setEndorse({ signature: null })}
          />

          <p className="footnote">
            <Icon name="lock" size={12} /> 簽名以矢量筆跡儲存在本機，不會上載；只有你選擇分享「簽署及旅印」時，
            簽名才會出現在分享頁面。
          </p>
        </>
      }
    />
  );
}
