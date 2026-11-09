import React, { useMemo, useState } from 'react';
import { useBook } from '../bookContext.js';
import { Link, navigate } from '../router.jsx';
import { Crest, Icon, useToast } from '../ui.jsx';
import { applySignoff } from '@shared/transfer.js';
import { syllabusItem } from '@shared/forms.js';

const KEY = 'roverbook.signoff.v1';
const APPLIED = 'roverbook.signoff.applied.v1';

const readPayload = () => {
  try {
    return JSON.parse(window.sessionStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
};

const readApplied = () => {
  try {
    return JSON.parse(window.localStorage.getItem(APPLIED) || '[]');
  } catch {
    return [];
  }
};

const markApplied = (seq) => {
  try {
    const list = readApplied();
    window.localStorage.setItem(APPLIED, JSON.stringify([seq, ...list].slice(0, 30)));
  } catch {
    /* private mode */
  }
};

export default function Signoff() {
  const { book, replace } = useBook();
  const { push } = useToast();
  const payload = readPayload();
  const applied = useMemo(() => readApplied(), []);
  const [done, setDone] = useState(null);

  if (!payload) {
    return (
      <div className="scanpage">
        <header className="scanhead">
          <Link to="/scan" className="scanhead__back" aria-label="返回掃描">
            <Icon name="back" size={18} />
          </Link>
          <div>
            <span className="eyebrow">SIGN-OFF</span>
            <h1>未收到核簽單</h1>
            <p>請掃描領袖手機上的回傳碼。核簽只會更新有簽名的項目，其他內容不變。</p>
          </div>
        </header>
        <Link to="/scan" className="btn btn--primary">
          <Icon name="qr" size={15} /> 去掃描
        </Link>
      </div>
    );
  }

  const already = applied.includes(payload.seq);
  const rows = (payload.items || []).map((item) => {
    const current = book.progress?.[item.id] || {};
    return {
      id: item.id,
      name: syllabusItem(item.id)?.name || item.id,
      beforeDate: current.date || '',
      beforeAssessor: current.assessor || '',
      date: item.date || '',
      assessor: item.assessor || payload.leader?.name || '',
      conflict: !!current.date && !!item.date && current.date !== item.date,
    };
  });

  const apply = () => {
    try {
      const { book: next, changes } = applySignoff(book, payload);
      replace(next);
      markApplied(payload.seq);
      setDone(changes);
      push(`已寫入 ${changes.length} 項核簽`);
    } catch (e) {
      push(e.message || '未能寫入核簽', 'error');
    }
  };

  return (
    <div className="scanpage signoffpage">
      <header className="scanhead">
        <Link to="/scan" className="scanhead__back" aria-label="返回掃描">
          <Icon name="back" size={18} />
        </Link>
        <div>
          <span className="eyebrow">SIGN-OFF · 領袖核簽</span>
          <h1>{payload.leader?.name || '領袖'} 的核簽單</h1>
          <p>
            簽署日期 {payload.leader?.at || payload.at?.slice(0, 10)} · 共 {rows.length} 項。
            {already ? '這張核簽單之前已經寫入過。' : '確認無誤後按下面按鈕寫入你的紀錄冊。'}
          </p>
        </div>
      </header>

      {payload.leader?.png && (
        <div className="signoffsig">
          <img src={payload.leader.png} alt="領袖簽名" />
          <span>
            {payload.leader.name}
            {payload.leader.title ? ` · ${payload.leader.title}` : ''}
          </span>
        </div>
      )}

      <ul className="signofflist">
        {rows.map((row) => (
          <li key={row.id} className={row.conflict ? 'is-conflict' : ''}>
            <strong>{row.name}</strong>
            <span className="signofflist__dates">
              <em>{row.beforeDate || '未填'}</em>
              <Icon name="chevron" size={12} />
              <b>{row.date || row.beforeDate || '—'}</b>
              <em>{row.beforeAssessor || '未簽'}</em>
              <Icon name="chevron" size={12} />
              <b>{row.assessor || '—'}</b>
            </span>
            {row.conflict && <small>日期與你紀錄冊不同（{row.beforeDate}），寫入後會用領袖核簽的日期。</small>}
          </li>
        ))}
      </ul>

      {done ? (
        <div className="signoffdone">
          <Crest size={28} />
          <p>已寫入 {done.length} 項核簽，紀錄冊已更新。</p>
          <button className="btn btn--primary" onClick={() => navigate('/p/dedication')}>
            查看紀錄冊
          </button>
        </div>
      ) : (
        <div className="signoffactions">
          <button className="btn btn--primary" onClick={apply}>
            <Icon name="check" size={15} /> 寫入我的紀錄冊
          </button>
          <button className="btn btn--ghost" onClick={() => navigate('/scan')}>
            取消
          </button>
        </div>
      )}

      <p className="scanfoot">
        核簽只會更新上述項目；其他內容、你原本的日期及簽名不會被覆蓋。這張核簽單的編號：{payload.seq}
      </p>
    </div>
  );
}
