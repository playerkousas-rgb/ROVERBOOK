import React from 'react';
import { useBook, useField } from '../bookContext.js';
import { Page, H, P, Note, Line, Area, Grid, Rows, Sig, Comment, Present, Check } from '../components/Form.jsx';
import Write from '../components/Write.jsx';
import { PhotoPicker } from '../components/Edit.jsx';
import { Crest } from '../ui.jsx';

/* ---------------------------------------------------------------- 出版資料 */

export function Colophon() {
  return (
    <Page id="colophon" className="colophon">
      <div className="colophon__crest">
        <Crest size={64} />
      </div>
      <h3 className="colophon__org">香港童軍總會</h3>
      <p className="colophon__org-en">Scout Association of Hong Kong</p>
      <p className="colophon__addr">九龍柯士甸道童軍徑香港童軍中心 10 樓</p>
      <p className="colophon__addr-en">10/F, Hong Kong Scout Center, Scout Path, Austin Road, Kowloon</p>

      <div className="colophon__rule" />

      <P en="This record book records your personal achievements as a Rover Scout. You are required to produce it before obtaining your Rover Scout Epaulettes, Rover Scout Award or Baden-Powell Award. It may also provide your valuable information for others, such as prospective employers, institutes and your friends. Please keep it carefully and up-to-date.">
        本紀錄冊是記錄你在樂行童軍時期的各項成就；同時又可以向他人，如僱主、院校、朋友等提供有關你甚有價值的資料。
        請小心保存並更新有關資料，在考取樂行童軍肩章、樂行童軍獎章或貝登堡獎章時，必須出示此紀錄冊。
      </P>

      <div className="colophon__foot">
        <span>第五版 · 2026</span>
        <span>ROVERBOOK 電子版</span>
      </div>
    </Page>
  );
}

/* ---------------------------------------------------------------- 個人資料 */

export function Particulars1() {
  const { book } = useBook();
  const m = book.member || {};
  const [photo, setPhoto] = useField('member.photo', null);

  return (
    <Page id="particulars-1" className="p-particulars">
      <H en="PERSONAL PARTICULARS">個人資料</H>

      <div className="ptop">
        <div className="ptop__photo">
          <PhotoPicker value={photo} onChange={setPhoto} />
        </div>
        <div className="ptop__id">
          <Line label="編號 No." path="member.memberNo" placeholder="RS-2401" />
          <Line label="姓名（中文）Name (Chinese)" path="member.nameZh" placeholder="林卓瑤" />
          <Line label="（英文）(English)" path="member.nameEn" placeholder="Lam Cheuk-yiu" />
        </div>
      </div>

      <div className="sentence">
        <span>為</span>
        <InlineSlot field="region" placeholder="地域" />
        <span>地域</span>
        <InlineSlot field="district" placeholder="區" />
        <span>區</span>
        <InlineSlot field="group" placeholder="旅" />
        <span>旅之樂行童軍團團員</span>
      </div>
      <p className="sentence__en">is a Crew member of __________ Group, __________ District, __________ Region.</p>

      <div className="fduo">
        <Line label="簽發日期 Date of Issue" type="date" path="member.issueDate" />
        <Line label="樂行童軍團 Crew" path="member.crew" placeholder="九龍第 145 旅樂行童軍團" />
      </div>
    </Page>
  );
}

function InlineSlot({ field, placeholder }) {
  const [value, set] = useField(`member.${field}`);
  return (
    <span className="sentence__slot">
      <Write value={value} onChange={set} compact label={placeholder} placeholder={placeholder} />
    </span>
  );
}

export function Particulars2() {
  const { book } = useBook();
  const m = book.member || {};

  return (
    <Page id="particulars-2" className="p-particulars">
      <H en="PERSONAL PARTICULARS">個人資料（續）</H>

      <div className="fduo">
        <Line label="出生日期 Date of Birth" type="date" path="member.dob" />
        <Line label="出生地點 Place of Birth" path="member.placeOfBirth" placeholder="香港" />
      </div>

      <Area label="通訊地址 Correspondence Address" path="member.address" rows={2} placeholder="九龍紅磡…" />

      <div className="ftrio">
        <Line label="聯絡電話 Telephone No." path="member.phone" placeholder="9876 5432" />
        <Line label="血型 Blood Type" path="member.bloodType" placeholder="O+" />
        <Line label="電郵 Email" path="member.email" placeholder="you@example.org" />
      </div>

      <h4 className="pgh">緊急事故聯絡人 <em>Emergency Contact Person</em></h4>
      <div className="fduo">
        <Line label="姓名 Name" path="member.emergencyName" placeholder="林美珍（母親）" />
        <Line label="聯絡電話 Telephone No." path="member.emergencyPhone" placeholder="9012 3456" />
      </div>

      <div className="sigspace">
        <Sig path="holderSignature" label="持有人簽署 Signature of Holder" title="持有人" name={m.nameZh} />
      </div>
    </Page>
  );
}

/* ---------------------------------------------------------------- 旅部資料 */

export function GroupInfo() {
  return (
    <Page id="group">
      <H en="GROUP INFORMATION">旅部資料</H>
      <div className="flist">
        <Line label="主辦機構 Sponsoring Authority" path="member.sponsoringAuthority" placeholder="黃埔宣道會" />
        <Area label="旅部地址 Group Address" path="member.groupAddress" rows={2} placeholder="九龍紅磡…" />
        <Line label="旅長姓名 Name of GSL" path="member.gsl" placeholder="何志強" />
        <Line label="團長姓名 Name of RSL" path="member.rsl" placeholder="馬啟明" />
        <Line label="團集會地點 Place of Crew Meeting" path="member.meetingPlace" placeholder="黃埔社區中心禮堂" />
        <div className="fduo">
          <Line label="入團日期 Date Joined" type="date" path="member.dateJoined" />
          <Line label="加入童軍運動日期 Date of Joining the Scout Movement" type="date" path="member.dateScoutMovement" />
        </div>
      </div>
    </Page>
  );
}

/* ---------------------------------------------------------------- 童軍紀錄 */

import { SCOUTING_UNITS as UNITS } from '@shared/book.js';

export function Scouting() {
  const { book } = useBook();
  const map = Object.fromEntries((book.scouting || []).map((r) => [r.unit, r]));
  return (
    <Page id="scouting" className="p-wide">
      <H en="SCOUTING EXPERIENCE">童軍紀錄</H>
      <div className="pgtable pgtable--fixed">
        <div className="pgtable__head pgtable__row pgtable__row--5">
          <span>期間 Period · 旅／單位 Group / Unit</span>
          <span>崗位／職位 Post / Rank</span>
          <span>獲取之最高奬章 Highest Award Achieved</span>
          <span>由 From</span>
          <span>至 To</span>
        </div>
        {UNITS.map((u) => {
          const index = (book.scouting || []).findIndex((r) => r.unit === u.key);
          return (
            <div className="pgtable__row pgtable__row--5" key={u.key}>
              <span className="pgtable__cell pgtable__unit">
                <strong>{u.label}</strong>
                <em>{u.en}</em>
              </span>
              <Cell unit={u.key} index={index} field="post" />
              <Cell unit={u.key} index={index} field="highestAward" />
              <Cell unit={u.key} index={index} field="from" />
              <Cell unit={u.key} index={index} field="to" />
            </div>
          );
        })}
      </div>
    </Page>
  );
}

const FIELD_LABELS = { post: '崗位／職位', highestAward: '最高奬章', from: '由', to: '至' };

function Cell({ unit, index, field }) {
  const { book, update } = useBook();
  const value = index >= 0 ? book.scouting[index]?.[field] || '' : '';
  const onChange = (next) => {
    update((b) => {
      const list = (b.scouting || []).slice();
      while (list.length <= index) list.push({ id: `sco_${Math.random().toString(36).slice(2, 8)}`, unit: UNITS[list.length]?.key });
      list[index] = { ...list[index], unit, [field]: next };
      return { ...b, scouting: list };
    });
  };
  return (
    <span className="pgtable__cell" data-label={FIELD_LABELS[field] || field}>
      <Write value={value} onChange={onChange} compact label={field} />
    </span>
  );
}

/* ---------------------------------------------------------- 轉旅 · 地址 · 摘要 */

export function Changes() {
  return (
    <Page id="changes">
      <H en="TRANSFER / CHANGE OF ADDRESS / CHANGE OF PARTICULARS">轉旅 · 遷移地址 · 更改摘要</H>

      <h4 className="pgh">轉旅 <em>TRANSFER OF GROUP</em></h4>
      <Rows path="transfers" min={3} addLabel="加一次轉旅" cols={[{ k: 'date', label: '日期', en: 'Date', type: 'date' }, { k: 'groupNo', label: '新旅旅號', en: 'Number of New Group' }]} />

      <h4 className="pgh">遷移地址 <em>CHANGE OF ADDRESS</em></h4>
      <Rows path="addressChanges" min={3} addLabel="加一次搬遷" cols={[{ k: 'date', label: '日期', en: 'Date', type: 'date' }, { k: 'address', label: '新地址', en: 'New Address', width: 2.4 }]} />

      <h4 className="pgh">更改個人摘要 <em>CHANGE OF PERSONAL PARTICULARS</em></h4>
      <Rows path="detailChanges" min={3} addLabel="加一次更改" cols={[{ k: 'date', label: '日期', en: 'Date', type: 'date' }, { k: 'item', label: '項目', en: 'Item' }, { k: 'content', label: '內容', en: 'Content', width: 2 }]} />
    </Page>
  );
}

/* ---------------------------------------------------------------- 會員資格 */

export function Renewals({ part = 0 }) {
  const { book, update } = useBook();
  const list = book.renewals || [];
  const id = part === 0 ? 'renewals-1' : 'renewals-2';
  const start = part * 4;

  const setRow = (index, key, value) => {
    update((b) => {
      const rows = (b.renewals || []).slice();
      while (rows.length <= index) rows.push({ id: `rnw_${Math.random().toString(36).slice(2, 8)}`, year: '', validUntil: '', signature: null });
      rows[index] = { ...rows[index], [key]: value };
      return { ...b, renewals: rows };
    });
  };

  return (
    <Page id={id}>
      <H en="RENEWAL OF MEMBERSHIP">會員資格</H>
      <div className="pgtable">
        <div className="pgtable__head pgtable__row pgtable__row--3">
          <span>日期 <em>Date</em></span>
          <span>有效日期至 <em>Valid Until</em></span>
          <span>旅印及簽署 <em>Group Chop and Signature</em></span>
        </div>
        {Array.from({ length: 4 }).map((_, i) => {
          const index = start + i;
          const row = list[index] || {};
          return (
            <div className="pgtable__row pgtable__row--3" key={row.id || `r-${index}`}>
              <span className="pgtable__cell" data-label="日期">
                <Write value={row.year ? String(row.year) : ''} onChange={(v) => setRow(index, 'year', v)} compact label="年份" placeholder="2026" />
              </span>
              <span className="pgtable__cell" data-label="有效日期至">
                <Write value={row.validUntil || ''} onChange={(v) => setRow(index, 'validUntil', v)} type="date" compact label="有效期至" />
              </span>
              <span className="pgtable__cell pgtable__cell--sig" data-label="旅印及簽署">
                <Sig path={`renewals.${index}.signature`} label={`${row.year || index + 1} 續會簽署`} compact title="樂行童軍團長" />
              </span>
            </div>
          );
        })}
      </div>
      {part === 0 ? (
        <button type="button" className="addrow addrow--quiet" onClick={() => update((b) => ({ ...b, renewals: [...(b.renewals || []), { id: `rnw_${Math.random().toString(36).slice(2, 8)}`, year: '', validUntil: '', signature: null }] }))}>
          + 加一年續會
        </button>
      ) : (
        <Note en="Membership has to be renewed and confirmed by the Rover Scout Leader by signature and chop, valid from 1 January to 31 December each year.">
          更新成員資格應按年由團長簽署及蓋章確認，並由該年一月一日至十二月三十一日止。
        </Note>
      )}
    </Page>
  );
}

/* --------------------------------------------------------- 服務 · 獎章及獎勵 */

export function ServiceAwards() {
  return (
    <Page id="service-awards" className="p-dense">
      <H en="SERVICE RECORD">服務紀錄</H>
      <Rows
        path="service"
        min={3}
        addLabel="加一項服務"
        cols={[
          { k: 'post', label: '崗位／職位', en: 'Post / Title', width: 1.6 },
          { k: 'from', label: '由', en: 'From' },
          { k: 'to', label: '至', en: 'To' },
          { k: 'appointedBy', label: '委任人', en: 'Appointed by', width: 1.3 },
        ]}
      />
      <Note en="This table above is for recording the services done by the Rover Scout in Crew, Group, Student Union, clubs and societies, and other organizations.">
        此表格是樂行童軍成員在旅、團、學生會、會社或其他團體的服務紀錄。
      </Note>

      <h4 className="pgh pgh--tight">獎章及獎勵記錄 <em>RECORD OF AWARD AND COMMENDATION</em></h4>
      <Rows
        path="awards"
        min={3}
        addLabel="加一項獎章"
        cols={[
          { k: 'name', label: '獎章／獎勵名稱', en: 'Name of Award' },
          { k: 'summary', label: '內容簡述', en: 'Summary of Content', width: 1.5 },
          { k: 'date', label: '頒發日期', en: 'Date of Issue', type: 'date' },
          { k: 'org', label: '機構名稱', en: 'Name of Organization' },
        ]}
      />
    </Page>
  );
}

/* ------------------------------------------------------------------ 訓練綱要 */

export function Scheme() {
  return (
    <Page id="scheme">
      <H en="TRAINING SCHEME">訓練綱要</H>
      <h4 className="pgh">目的 <em>AIM</em></h4>
      <P en="Rover Scout Section aims to connect and provide opportunities and support to young people who care about our society and are devoted in services to serve the Scout Movement and the community. Through a challenging award scheme, young people are encouraged to make personal progress and develop their potentials so as to become responsible and useful citizens in society.">
        樂行童軍支部旨在維繫關懷社會、熱心服務之青年，給予他們機會及鼓勵，為童軍運動及社會服務；同時，通過一個具挑戰性的獎章計劃，激發他們的進取心、發展個人潛能、促進身心健康並拓展國際視野，使其成為有責任感及對社會有貢獻的公民。
      </P>

      <h4 className="pgh">訓練方法 <em>METHOD</em></h4>
      <P en="The method of training in the Rover Scout Section is based on self-governing and self-programming of Rover Scout Crew together with a challenging and progressive award scheme.">
        樂行童軍支部之訓練方法，以自治及自務的樂行童軍團為基礎，輔以具挑戰性及有進度性之獎章制度。
      </P>

      <h4 className="pgh">銘言 <em>MOTTO</em></h4>
      <P en="BE PREPARED is the Scout Motto. SERVICE is the Motto of Rover Scouts.">
        童軍運動及樂行童軍支部的銘言分別為「準備」及「服務」。
      </P>
    </Page>
  );
}

const STAGES = [
  { no: '1', name: '會員章', en: 'Membership Badge', time: '平均於 3 個月內完成', enTime: 'To be completed within 3 months on average', req: '完成啟導班／等同項目／先修章', enReq: 'Introductory Course / Link Badge / Equivalent items' },
  { no: '2', name: '樂行童軍肩章', en: 'Rover Scout Epaulettes', time: '平均於 3 至 6 個月內完成', enTime: 'To be completed within 3-6 months on average', req: '完成 7 項考驗中的其中 4 項', enReq: 'Complete 4 of the 7 Components' },
  { no: '3', name: '樂行童軍獎章', en: 'Rover Scout Award', time: '平均於 12 至 18 個月內完成', enTime: 'To be completed within 12-18 months on average', req: '完成 7 項考驗中的其中 4 項', enReq: 'Complete 4 of the 7 Components' },
  { no: '4', name: '貝登堡獎章', en: 'Baden Powell Award', time: '平均於 12 至 18 個月內完成', enTime: 'To be completed within 12-18 months on average', req: '完成所有 7 項考驗', enReq: 'Complete all the 7 Components' },
];

export function Plan() {
  return (
    <Page id="plan">
      <H en="ROVER SCOUT TRAINING SCHEME">樂行童軍訓練計劃</H>
      <P en="The order of the progressive awards of Rover Scout Section is Membership Badge, Rover Scout Epaulettes, Rover Scout Award and Baden Powell Award.">
        樂行童軍訓練計劃共分為四個階段，分別為會員章、樂行童軍肩章、樂行童軍獎章及貝登堡獎章。
      </P>
      <div className="stages">
        {STAGES.map((s) => (
          <div className="stage" key={s.no}>
            <span className="stage__no">{s.no}</span>
            <div className="stage__body">
              <h4>
                {s.name}
                <em>{s.en}</em>
              </h4>
              <p className="stage__req">{s.req}</p>
              <p className="stage__req-en">{s.enReq}</p>
            </div>
            <div className="stage__time">
              {s.time}
              <em>{s.enTime}</em>
            </div>
          </div>
        ))}
      </div>
      <Note en="Remarks: The seven components include “Dedication”, “Scoutcraft”, “Volunteerism”, “Global Vision”, “Tenacity”, “Mental and Physical Wellness”, and “Intrepidity”, which can be conducted simultaneously.">
        備註：7 項考驗可同時進行，該 7 項考驗分別為：「準領袖培訓」、「童軍技能」、「服務」、「國際視野」、「興趣及技能」、「身心健康」及「挑戰」。
      </Note>
    </Page>
  );
}

/* ------------------------------------------------------------ 獎章表格頁 */

export function BadgeTable({ id, title, en, path }) {
  return (
    <Page id={id} className="p-badges">
      <H en={en}>{title}</H>
      <Rows
        path={path}
        min={8}
        addLabel="加一個獎章"
        cols={[
          { k: 'name', label: '獎章', en: 'Badges', width: 2 },
          { k: 'cert', label: '證書編號', en: 'Certificate No.', width: 1.4 },
          { k: 'date', label: '完成日期', en: 'Date of Completion', type: 'date' },
        ]}
      />
    </Page>
  );
}

/* -------------------------------------------------------------- 經驗表格頁 */

export function Experience({ id, title, en, path, lead, leadEn }) {
  return (
    <Page id={id} className="p-exp">
      <H en={en}>{title}</H>
      <P en={leadEn}>{lead}</P>
      <Rows
        path={path}
        min={9}
        addLabel="加一項"
        cols={[
          { k: 'period', label: '時段', en: 'Period', width: 1.1 },
          { k: 'item', label: '項目', en: 'Items', width: 1.2 },
          { k: 'description', label: '描述', en: 'Descriptions', width: 2.4, rows: 1 },
        ]}
      />
    </Page>
  );
}

/* ---------------------------------------------------------------- 制服頁 */

export function Uniform() {
  return (
    <Page id="uniform" className="p-uniform">
      <H en="ROVER SCOUT UNIFORM">樂行童軍制服</H>
      <div className="uniform">
        <div className="uniform__art" aria-hidden="true">
          <Crest size={92} />
          <span>制服圖見紙本第 41 頁</span>
        </div>
        <div className="uniform__text">
          <P en="Refer to the Rover Scout uniform requirements in the current Association handbook. The uniform page of the printed record book is a reference plate.">
            樂行童軍制服式樣、徽章佩戴位置及旅巾，以香港童軍總會現行制服指引為準；紙本紀錄冊第 41 頁為參考圖版。
          </P>
          <Area label="備註 Notes" path="pages.uniform.notes" rows={4} placeholder="例如：旅巾、徽章位置、制服更新日期…" />
        </div>
      </div>
    </Page>
  );
}

/* ------------------------------------------------------------------ 筆記 */

export function Notes({ id }) {
  return (
    <Page id={id} className="p-notes">
      <H en="NOTES">筆記</H>
      <Area label="自由書寫" en="Free notes" path={`pages.${id}.body`} rows={14} placeholder="任何想記下的事…" />
    </Page>
  );
}
