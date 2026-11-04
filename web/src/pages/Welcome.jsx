import React, { useRef, useState } from 'react';
import { useToast, Crest, Icon } from '../ui.jsx';
import { demoBook, newBook } from '@shared/book.js';
import { persistBook } from '../bookStore.js';
import { navigate } from '../router.jsx';

export default function Welcome({ onReady }) {
  const { push } = useToast();
  const [form, setForm] = useState({
    nameZh: '',
    nameEn: '',
    ymis: '',
    memberNo: '',
    crew: '',
    group: '',
    district: '',
    region: '',
    dateJoined: '',
  });
  const fileRef = useRef(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const start = (book, target) => {
    persistBook(book);
    onReady(book);
    navigate(target);
  };

  const create = (e) => {
    e.preventDefault();
    const book = newBook({ member: form });
    start(book, '/p/particulars');
    push('紀錄冊已建立，開始填寫吧');
  };

  const importFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data?.member) throw new Error('這不是 ROVERBOOK 備份檔');
        start(newBook(data), '/p/contents');
        push('備份已還原');
      } catch (err) {
        push(err.message || '檔案格式不正確', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="welcome">
      <div className="welcome__book">
        <div className="cover cover--demo">
          <span className="cover__rule cover__rule--outer" />
          <span className="cover__rule cover__rule--inner" />
          <div className="cover__top">
            <Crest size={50} />
            <span className="cover__org">香港童軍總會</span>
            <span className="cover__org-en">SCOUT ASSOCIATION OF HONG KONG</span>
          </div>
          <div className="cover__center">
            <span className="cover__kicker">ROVER SCOUT</span>
            <h1 className="cover__title">樂行童軍</h1>
            <h1 className="cover__title cover__title--sub">紀 錄 冊</h1>
            <span className="cover__en">RECORD BOOK</span>
          </div>
          <div className="cover__plate">
            <span className="cover__plate-label">持有人</span>
            <strong>{form.nameZh || '你的名字'}</strong>
            <span className="cover__plate-sub">{form.crew || '樂行童軍團'}</span>
          </div>
          <div className="cover__foot">
            <span>{new Date().getFullYear()}</span>
            <span className="cover__open cover__open--ghost">毋須登入</span>
            <span>第 5 版綱要</span>
          </div>
        </div>
      </div>

      <div className="welcome__panel">
        <div className="welcome__brand">
          <Crest size={34} />
          <span>
            <strong>ROVERBOOK</strong>
            <em>樂行童軍電子紀錄冊</em>
          </span>
        </div>
        <h1>這本紀錄冊，是你的。</h1>
        <p className="welcome__lede">
          不需要帳號、不需要登入。整本紀錄冊存在你這部手機或電腦；可逐頁填寫、請領袖即場簽名，
          亦可生成二維碼讓領袖查看你選擇分享的章節。
        </p>

        <form className="welcome__form" onSubmit={create}>
          <div className="formgrid formgrid--2">
            <label className="field">
              <span className="field__label">姓名（中文）</span>
              <input className="field__input" value={form.nameZh} onChange={set('nameZh')} placeholder="林卓瑤" required />
            </label>
            <label className="field">
              <span className="field__label">姓名（英文）</span>
              <input className="field__input" value={form.nameEn} onChange={set('nameEn')} placeholder="Lam Cheuk-yiu" />
            </label>
            <label className="field">
              <span className="field__label">YMIS 會員編號<em>與 ROVERBADGE 相同</em></span>
              <input className="field__input" value={form.ymis} onChange={set('ymis')} placeholder="24010001" />
            </label>
            <label className="field">
              <span className="field__label">紀錄冊編號</span>
              <input className="field__input" value={form.memberNo} onChange={set('memberNo')} placeholder="RS-2401" />
            </label>
            <label className="field">
              <span className="field__label">樂行童軍團</span>
              <input className="field__input" value={form.crew} onChange={set('crew')} placeholder="九龍第 145 旅樂行童軍團" />
            </label>
            <label className="field">
              <span className="field__label">旅</span>
              <input className="field__input" value={form.group} onChange={set('group')} placeholder="九龍第 145 旅" />
            </label>
          </div>
          <div className="welcome__actions">
            <button className="btn btn--primary btn--lg" type="submit">
              <Icon name="book" size={18} /> 建立我的紀錄冊
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                start(demoBook(), '/p/contents');
                push('已載入示範紀錄冊');
              }}
            >
              用示範資料看看
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
              匯入備份
            </button>
          </div>
          <p className="welcome__fine">
            沒有「註冊」或「登入」。資料留在這部裝置；換機前請在選單匯出備份。
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => importFile(e.target.files?.[0])}
          />
        </form>
      </div>
    </div>
  );
}
