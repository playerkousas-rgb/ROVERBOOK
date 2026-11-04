import React from 'react';
import { useBook } from '../bookContext.js';
import { Spread, ChapterMark } from '../components/Paper.jsx';
import { Field, PhotoPicker } from '../components/Edit.jsx';
import { SignatureBlock } from '../components/Ink.jsx';
import { Icon } from '../ui.jsx';

export default function Particulars() {
  const { book, update } = useBook();
  const m = book.member;
  const set = (key) => (value) => update((b) => ({ ...b, member: { ...b.member, [key]: value } }));

  return (
    <Spread
      section="particulars"
      folioLeft="2"
      folioRight="3"
      left={
        <>
          <ChapterMark
            no="02"
            title="個人資料"
            en="PERSONAL PARTICULARS"
            lead="這一頁是你的身份。姓名、團籍及會員編號會顯示在你的電子卡上；聯絡方法只會在你自己勾選分享時才讓他人看到。"
          />
          <div className="aside-block">
            <h4>填寫提示</h4>
            <ul className="bullets">
              <li>相片依紀錄冊要求須加蓋旅印，可在相片上傳後由領袖在簽署頁蓋印。</li>
              <li>「紀錄冊簽發日期」由團長填寫。</li>
              <li>緊急聯絡人只在「分享聯絡方法」時才會出現在分享連結中。</li>
            </ul>
          </div>
          <p className="aside-quote">
            「請小心保存並更新有關資料，在考取樂行童軍肩章、樂行童軍獎章或貝登堡獎章時，必須出示此紀錄冊。」
          </p>
        </>
      }
      right={
        <>
          <div className="formhead">
            <h3>個人資料</h3>
            <span>表格 A · 由持有人填寫</span>
          </div>

          <div className="particulars-top">
            <PhotoPicker value={m.photo} onChange={set('photo')} />
            <div className="particulars-id">
              <Field label="姓名（中文）" en="Name (Chinese)" value={m.nameZh} onChange={set('nameZh')} placeholder="林卓瑤" />
              <Field label="姓名（英文）" en="Name (English)" value={m.nameEn} onChange={set('nameEn')} placeholder="Lam Cheuk-yiu" />
              <div className="formgrid formgrid--2">
                <Field label="會員編號" en="Membership No." value={m.memberNo} onChange={set('memberNo')} placeholder="RS-2401" />
                <Field label="YMIS 編號" en="YMIS No." value={m.ymis} onChange={set('ymis')} placeholder="24010001" />
              </div>
            </div>
          </div>

          <p className="sentence">
            為
            <input className="sentence__input" value={m.district} onChange={(e) => set('district')(e.target.value)} placeholder="紅磡" />
            區、
            <input className="sentence__input" value={m.group} onChange={(e) => set('group')(e.target.value)} placeholder="九龍第 145" />
            旅之樂行童軍團團員，於
            <input className="sentence__input sentence__input--date" type="date" value={m.dateJoined} onChange={(e) => set('dateJoined')(e.target.value)} />
            入團。
          </p>

          <div className="formgrid formgrid--2">
            <Field label="樂行童軍團" en="Crew" value={m.crew} onChange={set('crew')} placeholder="九龍第 145 旅樂行童軍團" />
            <Field label="地域" en="Region" value={m.region} onChange={set('region')} placeholder="九龍地域" />
            <Field label="出生日期" en="Date of Birth" type="date" value={m.dob} onChange={set('dob')} />
            <Field label="出生地點" en="Place of Birth" value={m.placeOfBirth} onChange={set('placeOfBirth')} />
            <Field label="血型" en="Blood Type" value={m.bloodType} onChange={set('bloodType')} />
            <Field label="紀錄冊簽發日期" en="Date of Issue" type="date" value={m.issueDate} onChange={set('issueDate')} />
          </div>

          <Field label="通訊地址" en="Correspondence Address" value={m.address} onChange={set('address')} />
          <div className="formgrid formgrid--2">
            <Field label="聯絡電話" en="Telephone" type="tel" value={m.phone} onChange={set('phone')} />
            <Field label="電郵" en="Email" type="email" value={m.email} onChange={set('email')} />
          </div>

          <div className="formsubhead">
            <Icon name="users" size={14} /> 緊急事故聯絡人 Emergency Contact
          </div>
          <div className="formgrid formgrid--2">
            <Field label="姓名" en="Name" value={m.emergencyName} onChange={set('emergencyName')} />
            <Field label="聯絡電話" en="Telephone" type="tel" value={m.emergencyPhone} onChange={set('emergencyPhone')} />
          </div>

          <div className="sigrow">
            <SignatureBlock
              label="持有人簽署 Signature of Holder"
              value={book.holderSignature}
              name={m.nameZh}
              title="持有人"
              onSign={(sig) => update((b) => ({ ...b, holderSignature: sig }))}
              onClear={() => update((b) => ({ ...b, holderSignature: null }))}
            />
          </div>
        </>
      }
    />
  );
}
