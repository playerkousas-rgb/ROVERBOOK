import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { navigate } from '../router.jsx';
import { Crest, Field, Icon, Modal, useToast } from '../ui.jsx';

const FEATURES = [
  {
    icon: 'card',
    title: '一張卡，代替整本紀錄冊',
    body: '個人資料、訓練進度、服務與獎章，全部收進你口袋裡的電子卡。',
  },
  {
    icon: 'shield',
    title: '私隱由你逐項決定',
    body: '每個欄位可設定「公開 / 已連結 / 只限自己」，隨時改變主意。',
  },
  {
    icon: 'users',
    title: '領袖像加朋友一樣讀取',
    body: '領袖發送連結請求，你批准後才看得到；你可以授予全部資料，也可以隨時收回。',
  },
];

export default function Login({ onDone }) {
  const [memberNo, setMemberNo] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [demos, setDemos] = useState([]);
  const [registerOpen, setRegisterOpen] = useState(false);
  const { push } = useToast();

  useEffect(() => {
    api.get('/demo-accounts').then((r) => setDemos(r.accounts)).catch(() => {});
  }, []);

  async function login(no, code) {
    setBusy(true);
    setError('');
    try {
      await api.post('/login', { memberNo: no, pin: code });
      const user = await onDone();
      navigate('/', { replace: true });
      push(`歡迎回來，${user?.nameZh || ''}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <section className="login__panel">
        <div className="login__brand">
          <Crest size={40} />
          <div>
            <strong>ROVERBOOK</strong>
            <em>樂行童軍電子紀錄卡</em>
          </div>
        </div>

        <h1>
          把整本紀錄冊，
          <br />
          收進一張卡。
        </h1>
        <p className="login__lede">
          香港童軍總會樂行童軍紀錄冊電子化。成員擁有自己的卡，自選分享範圍；領袖經你批准後，一掃即可讀取及核實紀錄。
        </p>

        <ul className="login__features">
          {FEATURES.map((f) => (
            <li key={f.title}>
              <span className="feature__icon">
                <Icon name={f.icon} size={17} />
              </span>
              <div>
                <strong>{f.title}</strong>
                <p>{f.body}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="login__formcard">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              login(memberNo, pin);
            }}
          >
            <Field label="會員編號">
              <input
                className="input"
                placeholder="例：RS-2401"
                value={memberNo}
                autoComplete="username"
                onChange={(e) => setMemberNo(e.target.value.toUpperCase())}
                required
              />
            </Field>
            <Field label="PIN" hint="首次使用可向團長索取，或自行建立帳戶。">
              <input
                className="input"
                type="password"
                inputMode="numeric"
                placeholder="••••"
                value={pin}
                autoComplete="current-password"
                onChange={(e) => setPin(e.target.value)}
                required
              />
            </Field>
            {error && (
              <p className="form-error">
                <Icon name="alert" size={14} /> {error}
              </p>
            )}
            <button className="btn btn--primary btn--block" disabled={busy}>
              {busy ? '登入中…' : '登入我的卡片'}
              {!busy && <Icon name="chevron" size={17} />}
            </button>
          </form>
          <div className="login__formfoot">
            <span>新成員第一次使用？</span>
            <button className="linkbtn" onClick={() => setRegisterOpen(true)}>
              建立帳戶
            </button>
          </div>
        </div>

        {demos.length > 0 && (
          <div className="demo">
            <div className="demo__head">
              <span>示範帳戶 · 一按即登入</span>
              <em>原型資料，非真實成員</em>
            </div>
            <div className="demo__list">
              {demos.map((d) => (
                <button key={d.id} className="demo__item" onClick={() => login(d.memberNo, d.pin)} disabled={busy}>
                  <span className={`demo__role demo__role--${d.role}`}>{d.role === 'leader' ? '領袖' : '成員'}</span>
                  <span className="demo__name">
                    <strong>{d.nameZh}</strong>
                    <em>{d.memberNo}</em>
                  </span>
                  <span className="demo__pin">PIN {d.pin}</span>
                  <Icon name="chevron" size={15} />
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <aside className="login__art" aria-hidden="true">
        <div className="art-halo" />
        <div className="art-stack">
          <div className="art-card art-card--3" />
          <div className="art-card art-card--2" />
          <div className="art-card art-card--1">
            <div className="art-card__top">
              <Crest size={26} />
              <span>ROVER SCOUT</span>
              <i className="art-dot" />
            </div>
            <div className="art-card__name">
              <strong>林卓瑤</strong>
              <em>LAM CHEUK-YIU</em>
            </div>
            <div className="art-card__meta">九龍第 145 旅 · 紅磡區</div>
            <div className="art-card__dots">
              {Array.from({ length: 7 }).map((_, i) => (
                <i key={i} className={i < 5 ? 'on' : ''} />
              ))}
            </div>
            <div className="art-card__foot">
              <span className="art-card__qr">
                <Icon name="qr" size={22} />
              </span>
              <span className="art-card__sig">已由團長核實</span>
            </div>
          </div>
        </div>
        <div className="art-caption">
          <Icon name="shield" size={15} />
          <span>你分享的每一個欄位，都由你決定。</span>
        </div>
      </aside>

      {registerOpen && <RegisterModal onClose={() => setRegisterOpen(false)} onDone={() => setRegisterOpen(false)} />}
    </div>
  );
}

function RegisterModal({ onClose, onDone }) {
  const { push } = useToast();
  const [form, setForm] = useState({
    nameZh: '',
    nameEn: '',
    memberNo: '',
    pin: '',
    crew: '',
    group: '',
    district: '',
    region: '',
  });
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <Modal
      title="建立你的電子卡"
      subtitle="建立後，你可以隨時在「私隱」頁調整每一項資料的分享範圍。"
      onClose={onClose}
    >
      <form
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          setError('');
          try {
            await api.post('/register', form);
            push('帳戶已建立，請以會員編號及 PIN 登入');
            onDone();
          } catch (err) {
            setError(err.message);
          }
        }}
      >
        <Field label="姓名（中文）">
          <input className="input" value={form.nameZh} onChange={set('nameZh')} required />
        </Field>
        <Field label="姓名（英文）">
          <input className="input" value={form.nameEn} onChange={set('nameEn')} />
        </Field>
        <Field label="會員編號">
          <input className="input" value={form.memberNo} onChange={set('memberNo')} placeholder="RS-0000" required />
        </Field>
        <Field label="自訂 PIN（4 位以上）">
          <input className="input" type="password" value={form.pin} onChange={set('pin')} required />
        </Field>
        <Field label="樂行童軍團">
          <input className="input" value={form.crew} onChange={set('crew')} placeholder="九龍第 145 旅樂行童軍團" />
        </Field>
        <Field label="旅">
          <input className="input" value={form.group} onChange={set('group')} placeholder="九龍第 145 旅" />
        </Field>
        <Field label="區">
          <input className="input" value={form.district} onChange={set('district')} />
        </Field>
        <Field label="地域">
          <input className="input" value={form.region} onChange={set('region')} />
        </Field>
        {error && (
          <p className="form-error form-grid__full">
            <Icon name="alert" size={14} /> {error}
          </p>
        )}
        <div className="form-grid__full form-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            取消
          </button>
          <button className="btn btn--primary">建立帳戶</button>
        </div>
      </form>
    </Modal>
  );
}
