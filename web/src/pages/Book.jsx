import React from 'react';
import { useBook, useField } from '../bookContext.js';
import { Page, H, P, Note, Line, Area, Grid, Rows, Sig, Comment, Present, Check , Bilingual } from '../components/Form.jsx';
import Write from '../components/Write.jsx';
import { PhotoPicker } from '../components/Edit.jsx';
import { Crest } from '../ui.jsx';
import { useLang } from '../i18n.jsx';
import { LegalNote } from '../components/Legal.jsx';

/* ---------------------------------------------------------------- 出版資料 */

/* ------------------------------------------------------------ 第 1 頁 · 封面 */

export function Cover() {
  const { isEn } = useLang();
  return (
    <Page id="cover" className="p-cover">
      <div className="coverpage">
        <svg className="coverpage__mark" viewBox="14 6 36 46" aria-hidden="true">
          <path d="M32 11.5c5 6.6 11 9.2 11 15.8 0 5.4-5 9-11 9s-11-3.6-11-9c0-6.6 6-9.2 11-15.8Z" fill="currentColor" opacity="0.14" />
          <path d="M32 11.5c5 6.6 11 9.2 11 15.8 0 5.4-5 9-11 9s-11-3.6-11-9c0-6.6 6-9.2 11-15.8Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M32 21c2.6 3.4 5.4 4.9 5.4 8.1 0 2.6-2.4 4.4-5.4 4.4s-5.4-1.8-5.4-4.4C26.6 25.9 29.4 24.4 32 21Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path d="M20.5 38h23M24 46h16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <p className="coverpage__assoc">香港童軍總會</p>
        <h1 className="coverpage__title">樂行童軍紀錄冊</h1>
        <div className="coverpage__rule" />
        <p className="coverpage__en">Scout Association of Hong Kong</p>
        <p className="coverpage__en coverpage__en--sub">Rover Scout Record Book</p>
        {isEn && <p className="coverpage__note">Use the menu to jump to any page.</p>}
      </div>
    </Page>
  );
}

export function Colophon() {
  const { isEn } = useLang();
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

      <LegalNote compact />

      <div className="colophon__foot">
        <span>{isEn ? 'Edition V · 2026' : '第五版 · 2026'}</span>
        <span>{isEn ? 'ROVERBOOK digital edition' : 'ROVERBOOK 電子版'}</span>
      </div>
    </Page>
  );
}

/* ---------------------------------------------------------------- 個人資料 */

export function Particulars1() {
  const { book } = useBook();
  const m = book.member || {};
  const [photo, setPhoto] = useField('member.photo', null);
  const { isEn } = useLang();
  const slot = (v) => (v && String(v).trim() ? String(v).trim() : '＿＿＿＿＿＿');

  return (
    <Page id="particulars-1" className="p-particulars">
      <H en="PERSONAL PARTICULARS">個人資料</H>

      <div className="ptop">
        <div className="ptop__photo">
          <PhotoPicker value={photo} onChange={setPhoto} />
        </div>
        <div className="ptop__id">
          <Line
            label="紀錄冊編號"
            en="Record Book No. · SCOUT ID"
            path="member.scoutId"
            placeholder="24010001"
            hint={isEn ? 'Same number used in ROVERBADGE' : '＝童軍成員編號 SCOUT ID（ROVERBADGE 用同一個號碼）'}
          />
          <Line label="姓名（中文）" en="Name (Chinese)" path="member.nameZh" placeholder="林卓瑤" />
          <Line label="（英文）" en="Name (English)" path="member.nameEn" placeholder="Lam Cheuk-yiu" />
        </div>
      </div>

      <Bilingual as="h4" className="pgh" zh="所屬地域 · 區 · 旅" en="Region · District · Group" />
      <div className="ftrio">
        <Line label="地域" en="Region" path="member.region" placeholder="九龍" />
        <Line label="區" en="District" path="member.district" placeholder="九龍城" />
        <Line label="旅" en="Group" path="member.group" placeholder="九龍第 145 旅" />
      </div>

      <p className="sentence sentence--static">
        {isEn ? 'is a Rover Scout member of ' : '為 '}
        {isEn ? '' : <b>{slot(m.region)}</b>}
        {isEn ? '' : ' 地域 '}
        {isEn ? '' : <b>{slot(m.district)}</b>}
        {isEn ? '' : ' 區 '}
        <b>{slot(m.group)}</b>
        {isEn ? ' Rover Scout Crew.' : ' 之樂行童軍團團員。'}
      </p>

      <div className="fduo">
        <Line label="簽發日期" en="Date of Issue" type="date" path="member.issueDate" />
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

      <Bilingual as="h4" className="pgh" zh="緊急事故聯絡人" en="Emergency Contact Person" />
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
  const { isEn } = useLang();
  const map = Object.fromEntries((book.scouting || []).map((r) => [r.unit, r]));
  return (
    <Page id="scouting" className="p-wide">
      <H en="SCOUTING EXPERIENCE">童軍紀錄</H>
      <div className="pgtable pgtable--fixed scoutgrid">
        <div className="scoutgrid__head">
          <span className="scoutgrid__unit" />
          <span className="scoutgrid__span">
            <Bilingual zh="期間" en="Period" />
          </span>
          <span>
            <Bilingual zh="旅／單位" en="Group / Unit" />
          </span>
          <span>
            <Bilingual zh="崗位／職位" en="Post / Rank" />
          </span>
          <span>
            <Bilingual zh="獲取之最高奬章" en="Highest Award Achieved" />
          </span>
        </div>
        <div className="scoutgrid__sub">
          <span className="scoutgrid__unit" />
          <span>
            <Bilingual zh="由" en="From" />
          </span>
          <span>
            <Bilingual zh="至" en="To" />
          </span>
          <span />
          <span />
          <span />
        </div>
        {UNITS.map((u) => {
          const index = (book.scouting || []).findIndex((r) => r.unit === u.key);
          const noAward = u.key === 'instructor' || u.key === 'leader';
          return (
            <div className="scoutgrid__row" key={u.key}>
              <span className="scoutgrid__unit">
                <strong>{isEn ? u.en : u.label}</strong>
                {!isEn && <em>{u.en}</em>}
              </span>
              <Cell unit={u.key} index={index} field="from" />
              <Cell unit={u.key} index={index} field="to" />
              <Cell unit={u.key} index={index} field="group" />
              <Cell unit={u.key} index={index} field="post" />
              {noAward ? <span className="scoutgrid__na" /> : <Cell unit={u.key} index={index} field="highestAward" />}
            </div>
          );
        })}
      </div>
    </Page>
  );
}

const FIELD_LABELS = { post: '崗位／職位', highestAward: '最高奬章', from: '由', to: '至', group: '旅／單位' };

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

      <Bilingual as="h4" className="pgh" zh="轉旅" en="TRANSFER OF GROUP" />
      <Rows path="transfers" min={3} addLabel={null} cols={[{ k: 'date', label: '日期', en: 'Date', type: 'date' }, { k: 'groupNo', label: '新旅旅號', en: 'Number of New Group' }]} />

      <Bilingual as="h4" className="pgh" zh="遷移地址" en="CHANGE OF ADDRESS" />
      <Rows path="addressChanges" min={3} addLabel={null} cols={[{ k: 'date', label: '日期', en: 'Date', type: 'date' }, { k: 'address', label: '新地址', en: 'New Address', width: 2.4 }]} />

      <Bilingual as="h4" className="pgh" zh="更改個人摘要" en="CHANGE OF PERSONAL PARTICULARS" />
      <Rows path="detailChanges" min={3} addLabel={null} cols={[{ k: 'date', label: '日期', en: 'Date', type: 'date' }, { k: 'item', label: '項目', en: 'Item' }, { k: 'content', label: '內容', en: 'Content', width: 2 }]} />
    </Page>
  );
}

/* ---------------------------------------------------------------- 會員資格 */

export function Renewals({ part = 0 }) {
  const { book, update } = useBook();
  const { isEn } = useLang();
  const list = book.renewals || [];
  const id = part === 0 ? 'renewals-1' : 'renewals-2';
  const start = part * 5;

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
          <Bilingual zh="日期" en="Date" />
          <Bilingual zh="有效日期至" en="Valid Until" />
          <Bilingual zh="旅印及簽署" en="Group Chop and Signature" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => {
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
                <Sig
                  path={`renewals.${index}.signature`}
                  label={`${row.year || index + 1} 續會簽署`}
                  en={`Renewal signature ${row.year || index + 1}`}
                  compact
                  title="樂行童軍團長"
                />
              </span>
            </div>
          );
        })}
      </div>
      {part === 1 && (
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
        min={7}
        addLabel={null}
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

      <Bilingual as="h4" className="pgh pgh--tight" zh="獎章及獎勵記錄" en="RECORD OF AWARD AND COMMENDATION" />
      <Rows
        path="awards"
        min={3}
        addLabel={null}
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
      <Bilingual as="h4" className="pgh" zh="目的" en="AIM" />
      <P en="Rover Scout Section aims to connect and provide opportunities and support to young people who care about our society and are devoted in services to serve the Scout Movement and the community. Through a challenging award scheme, young people are encouraged to make personal progress and develop their potentials so as to become responsible and useful citizens in society.">
        樂行童軍支部旨在維繫關懷社會、熱心服務之青年，給予他們機會及鼓勵，為童軍運動及社會服務；同時，通過一個具挑戰性的獎章計劃，激發他們的進取心、發展個人潛能、促進身心健康並拓展國際視野，使其成為有責任感及對社會有貢獻的公民。
      </P>

      <Bilingual as="h4" className="pgh" zh="訓練方法" en="METHOD" />
      <P en="The method of training in the Rover Scout Section is based on self-governing and self-programming of Rover Scout Crew together with a challenging and progressive award scheme.">
        樂行童軍支部之訓練方法，以自治及自務的樂行童軍團為基礎，輔以具挑戰性及有進度性之獎章制度。
      </P>

      <Bilingual as="h4" className="pgh" zh="銘言" en="MOTTO" />
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
  const { isEn } = useLang();
  return (
    <Page id="plan">
      <H en="ROVER SCOUT TRAINING SCHEME">樂行童軍訓練計劃</H>
      <P en="The order of the progressive awards of Rover Scout Section is Membership Badge, Rover Scout Epaulettes, Rover Scout Award and Baden Powell Award.">
        樂行童軍訓練計劃共分為四個階段，分別為會員章、樂行童軍肩章、樂行童軍獎章及貝登堡獎章。
      </P>
      <div className="pstages">
        {STAGES.map((s) => (
          <div className="pstage" key={s.no}>
            <span className="pstage__no">{s.no}</span>
            <div className="pstage__body">
              <h4>
                {isEn ? s.en : s.name}
                {!isEn && <em>{s.en}</em>}
              </h4>
              <p className="pstage__req">{isEn ? s.enReq : s.req}</p>
              {!isEn && <p className="pstage__req-en">{s.enReq}</p>}
            </div>
            <div className="pstage__time">
              {isEn ? s.enTime : s.time}
              {!isEn && <em>{s.enTime}</em>}
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
        min={11}
        addLabel={null}
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
        min={11}
        addLabel={null}
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

const UNIFORM_LEGEND = [
  ['1', '黑色皮製巾圈（附有童軍徽號）／基維爾巾圈', 'Black leather woggle (with Scout emblem) / Gilwell woggle'],
  ['2', '香港章', 'Hong Kong Badge'],
  ['3', '飛行章／跳傘章', 'Air Activity Badge / Parachutist Badge'],
  ['4', '服務年星', 'Service Star'],
  ['5', '會員章／和平使者章（結合世界童軍會員章）', 'Membership Badge / Messenger of Peace Badge (with WOSM Membership Badge)'],
  ['6', '宗教章／公教章', 'Religious Badge / Catholic Badge'],
  ['7', '紀念章', 'Commemorative Badge'],
  ['8', '金紫荊／總領袖／榮譽童軍獎章標誌／樂行童軍先修章', 'Golden Bauhinia / Chief Commissioner / Honours Scout Award emblem / Rover Scout preliminary badge'],
  ['9', '樂行童軍獎章／貝登堡獎章', 'Rover Scout Award / Baden-Powell Award'],
  ['10', '樂行童軍肩章', 'Rover Scout Epaulettes'],
  ['11', '旅章', 'Group Badge'],
  ['12', '區章', 'District Badge'],
  ['13', '地域章', 'Region Badge'],
  ['14', '世界童軍組織推出的獎章／積極公民獎章系列（最多佩戴合共四枚）', 'WOSM badges / Better World Framework (up to four in total)'],
  ['15', '優異旅團章', 'Outstanding Group Badge'],
  ['16', '香港青年獎勵計劃金／銀章', 'HKAYP Gold / Silver Award'],
  ['17', '高級空勤員章', 'Senior Aircrew Badge'],
  ['18', '舵手章', 'Helmsman Badge'],
  ['19', '急救章', 'First Aid Badge'],
  ['20', '童軍拯溺布章', 'Scout Life Saving Badge'],
  ['21', '樂行童軍社區參與章', 'Rover Scout Community Service Badge'],
  ['22', 'ATAS 標誌', 'ATAS emblem'],
];

function PlateNo({ n, x, y, to }) {
  return (
    <g>
      {to && <line x1={x} y1={y} x2={to[0]} y2={to[1]} stroke="#8d8672" strokeWidth="0.6" />}
      <circle cx={x} cy={y} r="7.6" fill="#fff" stroke="#4a4a4a" strokeWidth="0.9" />
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="8.4" fill="#2a2a2a" fontFamily="Helvetica, Arial, sans-serif">
        {n}
      </text>
    </g>
  );
}

function UniformPlate() {
  return (
    <svg className="uniform__plate" viewBox="0 0 520 356" role="img" aria-label="樂行童軍制服及肩章參考圖">
      {/* 上衣 */}
      <path
        d="M200 40 L320 40 L354 50 L366 112 L352 118 L352 214 L168 214 L168 118 L154 112 L166 50 Z"
        fill="#f3ecd8"
        stroke="#8a8266"
        strokeWidth="1"
      />
      <path d="M228 40 L260 78 L292 40" fill="none" stroke="#8a8266" strokeWidth="1" />
      <path d="M244 52 L260 78 L276 52 L268 44 L252 44 Z" fill="#e7dfc8" stroke="#8a8266" strokeWidth="0.8" />
      <path d="M252 62 L268 62 L264 70 L272 96 L260 104 L248 96 L256 70 Z" fill="#2f5c3a" opacity="0.85" />
      <circle cx="260" cy="60" r="4" fill="#3a3630" />
      {/* 口袋 */}
      <rect x="180" y="126" width="54" height="50" rx="2" fill="none" stroke="#8a8266" strokeWidth="0.9" />
      <rect x="286" y="126" width="54" height="50" rx="2" fill="none" stroke="#8a8266" strokeWidth="0.9" />
      <line x1="180" y1="136" x2="234" y2="136" stroke="#8a8266" strokeWidth="0.9" />
      <line x1="286" y1="136" x2="340" y2="136" stroke="#8a8266" strokeWidth="0.9" />
      {/* 胸前徽章示意 */}
      <circle cx="214" cy="96" r="6" fill="#b8352f" />
      <rect x="300" y="88" width="26" height="8" rx="1" fill="#2f5c3a" />
      <circle cx="207" cy="152" r="11" fill="#c0392b" opacity="0.85" />
      <rect x="192" y="112" width="26" height="7" rx="1" fill="#2c3f8f" opacity="0.85" />
      {/* 標示 */}
      <PlateNo n="1" x="120" y="28" to={[257, 56]} />
      <PlateNo n="2" x="104" y="66" to={[196, 88]} />
      <PlateNo n="3" x="424" y="52" to={[326, 84]} />
      <PlateNo n="4" x="100" y="100" to={[186, 112]} />
      <PlateNo n="5" x="96" y="136" to={[182, 150]} />
      <PlateNo n="6" x="104" y="172" to={[178, 176]} />
      <PlateNo n="7" x="112" y="204" to={[176, 202]} />
      <PlateNo n="8" x="424" y="96" to={[338, 122]} />
      <PlateNo n="9" x="424" y="140" to={[344, 156]} />

      {/* 肩章 */}
      <text x="180" y="252" textAnchor="middle" fontSize="9" fill="#2a3040" fontFamily="sans-serif">右袖</text>
      <text x="344" y="252" textAnchor="middle" fontSize="9" fill="#2a3040" fontFamily="sans-serif">左袖</text>
      <path d="M116 262 h130 a6 6 0 0 1 6 6 v46 a6 6 0 0 1 -6 6 h-130 a6 6 0 0 1 -6 -6 v-46 a6 6 0 0 1 6 -6 Z" fill="#f3ecd8" stroke="#8a8266" strokeWidth="1" />
      <path d="M280 262 h130 a6 6 0 0 1 6 6 v46 a6 6 0 0 1 -6 6 h-130 a6 6 0 0 1 -6 -6 v-46 a6 6 0 0 1 6 -6 Z" fill="#f3ecd8" stroke="#8a8266" strokeWidth="1" />
      {/* 右袖 */}
      <rect x="124" y="272" width="32" height="14" rx="2" fill="#1f3d6b" opacity="0.85" />
      <rect x="162" y="272" width="30" height="14" rx="2" fill="#7b3f1d" opacity="0.85" />
      <circle cx="130" cy="300" r="6" fill="#2b7fb8" />
      <circle cx="148" cy="300" r="6" fill="#7b3f8f" />
      <circle cx="166" cy="300" r="6" fill="#2f6f52" />
      <circle cx="184" cy="300" r="6" fill="#5b3f8f" />
      <rect x="124" y="308" width="80" height="8" rx="2" fill="#4aa3c7" opacity="0.8" />
      <PlateNo n="10" x="180" y="240" to={[180, 262]} />
      <PlateNo n="11" x="266" y="278" to={[246, 279]} />
      <PlateNo n="12" x="266" y="296" to={[246, 296]} />
      <PlateNo n="13" x="266" y="314" to={[246, 312]} />
      <PlateNo n="14" x="112" y="316" to={[122, 312]} />
      {/*
      */}
      {/* 左袖 */}
      <rect x="298" y="270" width="22" height="22" rx="2" fill="#2c3f8f" opacity="0.85" />
      <rect x="330" y="268" width="20" height="20" rx="2" fill="#1f5fa8" opacity="0.85" />
      <rect x="298" y="298" width="20" height="20" rx="2" fill="#2f6f52" opacity="0.85" />
      <rect x="326" y="296" width="26" height="18" rx="2" fill="#3b3f8f" opacity="0.85" />
      <circle cx="368" cy="306" r="8" fill="#4b3f8f" opacity="0.85" />
      <rect x="300" y="322" width="24" height="8" rx="2" fill="#6b3f8f" opacity="0.8" />
      <PlateNo n="15" x="344" y="240" to={[344, 262]} />
      <PlateNo n="16" x="404" y="272" to={[386, 278]} />
      <PlateNo n="17" x="404" y="290" to={[378, 292]} />
      <PlateNo n="18" x="404" y="306" to={[382, 306]} />
      <PlateNo n="19" x="404" y="322" to={[370, 320]} />
      <PlateNo n="20" x="272" y="336" to={[288, 326]} />
      <PlateNo n="21" x="446" y="326" to={[330, 326]} />
      <PlateNo n="22" x="446" y="344" to={[338, 330]} />
    </svg>
  );
}

export function Uniform() {
  const { isEn } = useLang();
  return (
    <Page id="uniform" className="p-uniform">
      <H en="ROVER SCOUT UNIFORM">樂行童軍制服</H>
      <UniformPlate />
      <div className="uniform__legend">
        {UNIFORM_LEGEND.map(([n, zh, en]) => (
          <p key={n} className="uniform__item">
            <span className="uniform__no">{n}</span>
            {isEn ? en : zh}
          </p>
        ))}
      </div>
    </Page>
  );
}

/* -------------------------------------------------------------- 空白頁 42／43 */

export function Notes({ id }) {
  return (
    <Page id={id} className="p-notes">
      <div className="blankpage" aria-hidden="true" />
    </Page>
  );
}
