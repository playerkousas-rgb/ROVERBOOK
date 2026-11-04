import React from 'react';
import { useBook } from '../bookContext.js';
import { Spread, ChapterMark } from '../components/Paper.jsx';
import { Field } from '../components/Edit.jsx';

export default function GroupInfo() {
  const { book, update } = useBook();
  const m = book.member;
  const set = (key) => (value) => update((b) => ({ ...b, member: { ...b.member, [key]: value } }));

  return (
    <Spread
      section="group"
      folioLeft="4"
      folioRight="4"
      left={
        <>
          <ChapterMark
            no="03"
            title="旅部資料"
            en="GROUP INFORMATION"
            lead="由旅部或團長提供。續會時團長會在此核對團籍及主辦機構。"
          />
          <div className="aside-block">
            <h4>給領袖</h4>
            <p>
              旅部資料一般由旅長或團長統一填寫，成員可在「分享」時選擇是否公開。若成員轉旅，
              舊旅資料會保留在「童軍紀錄」內，不會被覆蓋。
            </p>
          </div>
          <div className="sealbox">
            <span className="sealbox__label">旅印</span>
            <div className="sealbox__space">
              <span className="sealmark sealmark--soft" style={{ width: 88, height: 88 }}>
                <span className="sealmark__ring" />
                <span className="sealmark__text">{m.group || '旅印'}</span>
              </span>
            </div>
            <p>由旅部在紙本或簽署頁蓋印；電子紀錄冊以領袖簽署代替。</p>
          </div>
        </>
      }
      right={
        <>
          <div className="formhead">
            <h3>旅部資料</h3>
            <span>表格 B</span>
          </div>
          <div className="formgrid formgrid--2">
            <Field label="主辦機構" en="Sponsoring Authority" value={m.sponsoringAuthority} onChange={set('sponsoringAuthority')} />
            <Field label="旅長姓名" en="Name of GSL" value={m.gsl} onChange={set('gsl')} />
            <Field label="團長姓名" en="Name of RSL" value={m.rsl} onChange={set('rsl')} />
            <Field label="團集會地點" en="Place of Crew Meeting" value={m.meetingPlace} onChange={set('meetingPlace')} />
            <Field label="入團日期" en="Date Joined" type="date" value={m.dateJoined} onChange={set('dateJoined')} />
            <Field label="加入童軍運動日期" en="Date of Joining the Scout Movement" type="date" value={m.dateScoutMovement} onChange={set('dateScoutMovement')} />
          </div>
          <Field label="旅部地址" en="Group Address" value={m.groupAddress} onChange={set('groupAddress')} />
          <Field label="區 / 地域" en="District / Region" value={[m.district, m.region].filter(Boolean).join(' · ')} onChange={(v) => {
            const [district, region] = v.split('·').map((x) => x.trim());
            update((b) => ({ ...b, member: { ...b.member, district: district || '', region: region || b.member.region } }));
          }} />
        </>
      }
    />
  );
}
