import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { Link } from '../router.jsx';
import { Chip, Empty, Field, Icon, SectionHeading, cx, fmtDate, useToast } from '../ui.jsx';
import { BADGES, COMPONENTS, FIELD_GROUPS } from '@shared/schema.js';

const TABS = [
  { id: 'profile', label: '個人資料' },
  { id: 'training', label: '訓練進度' },
  { id: 'service', label: '服務' },
  { id: 'awards', label: '獎章' },
  { id: 'scouting', label: '童軍經歷' },
  { id: 'expeditions', label: '遠足及經驗' },
  { id: 'additional', label: '其他經驗' },
  { id: 'renewals', label: '會籍及簽署' },
];

const SECTION_CONFIG = {
  service: {
    title: '服務紀錄',
    eyebrow: 'SERVICE RECORD',
    blurb: '在旅、團、學生會、会社或其他團體的服務。',
    fields: [
      { key: 'post', label: '職位／崗位', placeholder: '團秘書 Crew Secretary', span: 2 },
      { key: 'from', label: '由（年月）', placeholder: '2025-01' },
      { key: 'to', label: '至（年月）', placeholder: '2025-12 或留空' },
      { key: 'appointedBy', label: '委任人', placeholder: '馬啟明', span: 2 },
    ],
    render: (i) => (
      <>
        <strong>{i.post}</strong>
        <span>{[i.from, i.to].filter(Boolean).join(' → ') || '—'}</span>
        {i.appointedBy && <em>委任：{i.appointedBy}</em>}
      </>
    ),
  },
  awards: {
    title: '獎章及獎勵',
    eyebrow: 'AWARDS & COMMENDATIONS',
    blurb: '包括童軍獎章、地域或總會嘉許。',
    fields: [
      { key: 'name', label: '獎章／獎勵名稱', placeholder: '樂行童軍肩章', span: 2 },
      { key: 'summary', label: '內容簡述', placeholder: '完成 7 項考驗中 4 項', span: 2 },
      { key: 'date', label: '頒發日期', type: 'date' },
      { key: 'org', label: '頒發機構', placeholder: '九龍地域' },
    ],
    render: (i) => (
      <>
        <strong>{i.name}</strong>
        <span>{i.summary}</span>
        <em>{[i.date, i.org].filter(Boolean).join(' · ')}</em>
      </>
    ),
  },
  scouting: {
    title: '童軍紀錄',
    eyebrow: 'SCOUTING EXPERIENCE',
    blurb: '由小童軍到樂行童軍的經歷、崗位及最高獎章。',
    fields: [
      { key: 'unit', label: '旅／單位', placeholder: '童軍 Scout', span: 2 },
      { key: 'post', label: '崗位／職位', placeholder: '小隊副隊長' },
      { key: 'highestAward', label: '獲取之最高獎章', placeholder: '童軍標準章' },
      { key: 'from', label: '由', placeholder: '2020-09' },
      { key: 'to', label: '至', placeholder: '2024-08' },
    ],
    render: (i) => (
      <>
        <strong>{i.unit}</strong>
        <span>{i.post}</span>
        <em>
          {[i.from, i.to].filter(Boolean).join(' → ')}
          {i.highestAward ? ` · ${i.highestAward}` : ''}
        </em>
      </>
    ),
  },
  expeditions: {
    title: '遠足及海外活動',
    eyebrow: 'EXPEDITIONS & OVERSEAS',
    blurb: '本港或海外的遠足、國際童軍活動。',
    fields: [
      { key: 'period', label: '時段', placeholder: '2025-12-27 至 2025-12-31', span: 2 },
      { key: 'item', label: '項目', placeholder: '台灣陽明山跨年遠足', span: 2 },
      { key: 'description', label: '描述', type: 'textarea', span: 2 },
    ],
    render: (i) => (
      <>
        <strong>{i.item}</strong>
        <span>{i.period}</span>
        {i.description && <em>{i.description}</em>}
      </>
    ),
  },
  additional: {
    title: '其他經驗',
    eyebrow: 'ADDITIONAL EXPERIENCES',
    blurb: '特別任務、管理委員會職務、取得的資格等。',
    fields: [
      { key: 'period', label: '時段', placeholder: '2025-05' },
      { key: 'item', label: '項目', placeholder: '聖約翰急救證書' },
      { key: 'description', label: '描述', type: 'textarea', span: 2 },
    ],
    render: (i) => (
      <>
        <strong>{i.item}</strong>
        <span>{i.period}</span>
        {i.description && <em>{i.description}</em>}
      </>
    ),
  },
};

export default function RecordBook() {
  const { push } = useToast();
  const [tab, setTab] = useState('profile');
  const [data, setData] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    const me = await api.get('/me');
    setData(me);
    setForm(me.profile);
    setDirty(false);
  }, []);

  useEffect(() => {
    load().catch((e) => push(e.message, 'error'));
  }, [load, push]);

  if (!data) return <div className="page"><div className="skeleton skeleton--title" /></div>;

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setDirty(true);
  };
  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.put('/me/profile', form);
      push('個人資料已更新');
      await load();
    } catch (e) {
      push(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleComponent = async (id, done) => {
    try {
      const res = await api.post(`/me/training/${id}`, { done });
      setData((d) => ({ ...d, training: res.training }));
      push(done ? '已標記完成，等待領袖核實' : '已取消完成標記');
    } catch (e) {
      push(e.message, 'error');
    }
  };

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <span className="eyebrow">紀錄冊 · RECORD BOOK</span>
          <h1>我的紀錄</h1>
          <p className="page__sub">取代紙本紀錄冊，所有更新即時同步到你的電子卡。</p>
        </div>
        <div className="page__actions">
          <span className={cx('save-state', dirty && 'is-dirty')}>
            {dirty ? '有未儲存的修改' : '已儲存'}
          </span>
          {tab === 'profile' && (
            <button className="btn btn--primary" onClick={saveProfile} disabled={!dirty || saving}>
              {saving ? '儲存中…' : '儲存資料'}
            </button>
          )}
        </div>
      </header>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={cx('tabs__item', tab === t.id && 'is-active')}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && <ProfileTab form={form} set={set} setField={setField} data={data} onSaved={load} />}
      {tab === 'training' && <TrainingTab data={data} onToggle={toggleComponent} />}
      {SECTION_CONFIG[tab] && (
        <ListTab key={tab} config={SECTION_CONFIG[tab]} section={tab} items={data[tab] || []} onReload={load} />
      )}
      {tab === 'renewals' && <RenewalsTab data={data} />}
    </div>
  );
}

function ProfileTab({ form, set, setField, data, onSaved }) {
  const { push } = useToast();
  const fileRef = useRef(null);

  const upload = async (file) => {
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const size = 320;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const min = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      URL.revokeObjectURL(url);
      setField('photo', dataUrl);
      api
        .put('/me/profile', { photo: dataUrl })
        .then(() => {
          push('相片已更新');
          onSaved();
        })
        .catch((e) => push(e.message, 'error'));
    };
    img.src = url;
  };

  return (
    <div className="stack">
      <section className="panel">
        <SectionHeading eyebrow="PHOTO" title="相片" >
          依紀錄冊要求，相片須加蓋旅印；電子卡會顯示「已核實」印章。
        </SectionHeading>
        <div className="photo-row">
          <div className="photo-preview">
            {form.photo ? <img src={form.photo} alt="個人相片" /> : <Icon name="users" size={26} />}
          </div>
          <div>
            <button className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()}>
              <Icon name="edit" size={15} /> 上載相片
            </button>
            <p className="hint">建議正面近照，系統會自動裁剪成正方形。</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </div>
      </section>

      {FIELD_GROUPS.map((group) => (
        <section className="panel" key={group.id}>
          <SectionHeading eyebrow={group.labelEn.toUpperCase()} title={group.label} />
          <div className="form-grid">
            {group.fields
              .filter((f) => f.type !== 'photo')
              .map((f) => (
                <Field key={f.key} label={f.label}>
                  <input
                    className="input"
                    type={f.type === 'date' ? 'date' : f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : 'text'}
                    value={form[f.key] || ''}
                    placeholder={f.key === 'memberNo' ? 'RS-0000' : ''}
                    onChange={set(f.key)}
                  />
                </Field>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function TrainingTab({ data, onToggle }) {
  const comps = data.training.components;
  const badges = data.training.badges;
  const done = COMPONENTS.filter((c) => comps[c.id]?.done).length;

  return (
    <div className="stack">
      <section className="panel">
        <SectionHeading
          eyebrow="TRAINING SCHEME"
          title="七項考驗"
          action={<Chip tone={done >= 7 ? 'gold' : 'default'}>{done} / 7 已完成</Chip>}
        >
          自行標記完成後，仍須由領袖核實方計入獎章。
        </SectionHeading>
        <div className="comp-list">
          {COMPONENTS.map((c) => {
            const state = comps[c.id] || {};
            return (
              <div key={c.id} className={cx('comp-row', state.done && 'is-done')}>
                <button
                  className={cx('comp-check', state.done && 'is-on')}
                  onClick={() => onToggle(c.id, !state.done)}
                  aria-pressed={state.done}
                  aria-label={`標記${c.label}`}
                >
                  {state.done && <Icon name="check" size={14} />}
                </button>
                <div className="comp-main">
                  <div className="comp-title">
                    <strong>{c.label}</strong>
                    <em>{c.labelEn}</em>
                    {state.verifiedBy ? <Chip tone="ok" icon="verified">領袖已核實</Chip> : state.done ? <Chip tone="warn">待核實</Chip> : null}
                  </div>
                  <p>{c.blurb}</p>
                  {state.done && (
                    <span className="comp-date">
                      <Icon name="clock" size={12} /> 完成日期：{state.date || '未填'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <SectionHeading eyebrow="PROGRESSIVE AWARDS" title="獎章" action={<span className="hint">由領袖核實及頒授</span>} />
        <div className="badge-grid">
          {BADGES.map((b) => {
            const date = badges?.[b.id]?.date;
            return (
              <div key={b.id} className={cx('badge-card', date && 'is-earned')}>
                <span className="badge-card__icon">
                  <Icon name={date ? 'verified' : 'medal'} size={20} />
                </span>
                <div>
                  <strong>{b.label}</strong>
                  <em>{b.labelEn}</em>
                  <span className="badge-card__req">{b.requirement}</span>
                  <span className={cx('badge-card__state', date && 'is-earned')}>
                    {date ? `已於 ${date} 獲頒` : '未獲頒'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <SectionHeading eyebrow="ENDORSEMENT" title="紀錄冊簽署" />
        {data.endorsement ? (
          <div className="endorse">
            <span className="endorse__seal">
              <Icon name="verified" size={22} />
            </span>
            <div>
              <strong>{data.endorsement.byName} 已簽署你的紀錄冊</strong>
              <span>簽署日期：{fmtDate(data.endorsement.at, { withTime: true })}</span>
              <span>有效至：{data.endorsement.validUntil}</span>
            </div>
          </div>
        ) : (
          <Empty icon="verified" title="尚未簽署">
            領袖與你連結並查看卡片後，可為你的紀錄冊簽署及核實。
          </Empty>
        )}
      </section>
    </div>
  );
}

function ListTab({ config, section, items, onReload }) {
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/me/records/${section}`, form);
      setForm({});
      setOpen(false);
      await onReload();
      push('已新增紀錄');
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel">
      <SectionHeading
        eyebrow={config.eyebrow}
        title={config.title}
        action={
          <button className="btn btn--primary btn--sm" onClick={() => setOpen((v) => !v)}>
            <Icon name={open ? 'x' : 'plus'} size={15} /> {open ? '取消' : '新增紀錄'}
          </button>
        }
      >
        {config.blurb}
      </SectionHeading>

      {open && (
        <form className="add-form" onSubmit={submit}>
          <div className="form-grid">
            {config.fields.map((f) => (
              <Field key={f.key} label={f.label}>
                {f.type === 'textarea' ? (
                  <textarea
                    className="input input--area"
                    value={form[f.key] || ''}
                    placeholder={f.placeholder || ''}
                    onChange={(e) => setForm((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                ) : (
                  <input
                    className="input"
                    type={f.type === 'date' ? 'date' : 'text'}
                    value={form[f.key] || ''}
                    placeholder={f.placeholder || ''}
                    onChange={(e) => setForm((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                )}
              </Field>
            ))}
          </div>
          <div className="form-actions">
            <button className="btn btn--primary btn--sm" disabled={busy}>
              {busy ? '儲存中…' : '儲存紀錄'}
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <Empty title="尚未有紀錄">新增你的第一項{config.title}，讓紀錄冊保持更新。</Empty>
      ) : (
        <ul className="record-list">
          {items.map((item) => (
            <li key={item.id} className="record-item">
              <div className="record-item__body">{config.render(item)}</div>
              <div className="record-item__side">
                {item.verifiedBy && (
                  <Chip tone="ok" icon="verified">
                    已核實
                  </Chip>
                )}
                {!item.verifiedBy && (
                  <button
                    className="icon-btn icon-btn--muted"
                    title="刪除"
                    onClick={async () => {
                      if (!confirm('刪除這項紀錄？')) return;
                      await api.del(`/me/records/${section}/${item.id}`);
                      await onReload();
                    }}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RenewalsTab({ data }) {
  return (
    <div className="stack">
      <section className="panel">
        <SectionHeading eyebrow="RENEWAL OF MEMBERSHIP" title="會員資格" >
          會籍須每年由團長簽署及蓋章確認，有效期為每年 1 月 1 日至 12 月 31 日。
        </SectionHeading>
        {data.renewals.length === 0 ? (
          <Empty icon="clock" title="尚未有續會紀錄">
            領袖可在查看你的卡片時為你續會。
          </Empty>
        ) : (
          <ul className="renew-list">
            {data.renewals.map((r) => (
              <li key={r.id}>
                <span className="renew-list__year">{r.year}</span>
                <div>
                  <strong>有效至 {r.validUntil}</strong>
                  <span>
                    {r.byName} 於 {fmtDate(r.at)} 簽署
                  </span>
                </div>
                <Chip tone="ok" icon="check">已確認</Chip>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel panel--muted">
        <SectionHeading eyebrow="DATA" title="匯出你的紀錄" />
        <p className="panel__note" style={{ marginTop: 0 }}>
          需要紙本時，可使用瀏覽器的「列印」功能，把卡片及完整紀錄輸出成 PDF，無須再影印整本紀錄冊。
        </p>
        <button className="btn btn--ghost btn--sm" onClick={() => window.print()}>
          <Icon name="print" size={15} /> 列印／儲存為 PDF
        </button>
      </section>
    </div>
  );
}
