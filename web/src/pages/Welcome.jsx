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
    if (!form.nameZh.trim()) return;
    start(newBook({ member: { ...form, ymis: form.memberNo } }), '/p/particulars-1');
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
      <div className="welcome__cover">
        <div className="coverart coverart--inline">
          <div className="coverart__grain" />
          <span className="coverart__frame coverart__frame--outer" />
          <span className="coverart__frame coverart__frame--inner" />
          <span className="coverart__spine" />
          <div className="coverart__top">
            <Crest size={54} />
            <div>
              <strong>香港童軍總會</strong>
              <em>SCOUT ASSOCIATION OF HONG KONG</em>
            </div>
          </div>
          <div className="coverart__center">
            <span className="coverart__kicker">ROVER SCOUT</span>
            <h1 className="coverart__title">樂行童軍</h1>
            <h2 className="coverart__subtitle">紀　錄　冊</h2>
            <span className="coverart__en">RECORD BOOK</span>
          </div>
          <div className="coverart__plate">
            <span className="coverart__plate-label">持有人 HOLDER</span>
            <strong>{form.nameZh || '你的名字'}</strong>
            <span className="coverart__plate-sub">{form.crew || '樂行童軍團'}</span>
          </div>
        </div>
      </div>

      <div className="welcome__panel">
        <div className="welcome__brand">
          <Crest size={30} />
          <span>
            <strong>ROVERBOOK</strong>
            <em>樂行童軍紀錄冊</em>
          </span>
        </div>

        <h1>這本紀錄冊，是你的。</h1>
        <p className="welcome__lede">
          不需要帳號、不需要登入。整本冊子存在你這部裝置；逐頁點擊就可以填寫，領袖可以即場簽名，
          亦可以生成二維碼讓領袖查看你選擇分享的章節。
        </p>

        <form className="welcome__form" onSubmit={create}>
          <div className="welcome__row">
            <label className="field">
              <span className="field__label">姓名（中文）</span>
              <input className="welcome__input" value={form.nameZh} onChange={set('nameZh')} placeholder="林卓瑤" required />
            </label>
            <label className="field">
              <span className="field__label">姓名（英文）</span>
              <input className="welcome__input" value={form.nameEn} onChange={set('nameEn')} placeholder="Lam Cheuk-yiu" />
            </label>
          </div>
          <div className="welcome__row">
            <label className="field">
              <span className="field__label">
                紀錄冊編號 <em>＝ 童軍成員編號 SCOUT ID ＝ ROVERBADGE 的 YMIS</em>
              </span>
              <input
                className="welcome__input"
                value={form.memberNo}
                onChange={(e) => setForm((f) => ({ ...f, memberNo: e.target.value, ymis: e.target.value }))}
                placeholder="24010001"
              />
            </label>
            <label className="field">
              <span className="field__label">旅 Group</span>
              <input className="welcome__input" value={form.group} onChange={set('group')} placeholder="九龍第 145 旅" />
            </label>
          </div>
          <div className="welcome__row">
            <label className="field">
              <span className="field__label">樂行童軍團 Crew</span>
              <input className="welcome__input" value={form.crew} onChange={set('crew')} placeholder="九龍第 145 旅樂行童軍團" />
            </label>
            <label className="field">
              <span className="field__label">區 District</span>
              <input className="welcome__input" value={form.district} onChange={set('district')} placeholder="九龍城" />
            </label>
          </div>

          <div className="welcome__actions">
            <button className="btn btn--gold btn--lg" type="submit">
              <Icon name="book" size={17} /> 建立我的紀錄冊
            </button>
            <button
              type="button"
              className="btn btn--onblue"
              onClick={() => {
                start(demoBook(), '/p/contents');
                push('已載入示範紀錄冊');
              }}
            >
              用示範資料看看
            </button>
            <button type="button" className="btn btn--onblue" onClick={() => fileRef.current?.click()}>
              匯入備份
            </button>
          </div>
          <p className="welcome__fine">
            沒有「註冊」或「登入」。資料留在這部裝置；換機前請在選單匯出備份。
          </p>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => importFile(e.target.files?.[0])} />
        </form>
      </div>
    </div>
  );
}
