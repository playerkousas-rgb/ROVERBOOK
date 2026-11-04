import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { navigate } from '../router.jsx';
import { Avatar, Chip, CopyButton, Empty, Icon, Segmented, SectionHeading, cx, fmtDate, useToast } from '../ui.jsx';
import { FIELD_GROUPS, SECTIONS, VISIBILITY_LEVELS, DEFAULT_PRIVACY } from '@shared/schema.js';

const LEVEL_OPTIONS = VISIBILITY_LEVELS.map((l) => ({ id: l.id, label: l.label, hint: l.hint }));

const PRESETS = {
  conservative: {
    label: '保守',
    hint: '只公開姓名及團籍',
    fields: (f) => ({ ...f, ...Object.fromEntries(Object.keys(f).map((k) => [k, 'self'])), nameZh: 'public', nameEn: 'public', crew: 'public', group: 'public' }),
    sections: () => Object.fromEntries(SECTIONS.map((s) => [s.key, 'self'])),
  },
  standard: {
    label: '標準',
    hint: '公開基本身份，聯絡方法只給已連結領袖',
    fields: () => ({ ...DEFAULT_PRIVACY.fields }),
    sections: () => ({ ...DEFAULT_PRIVACY.sections }),
  },
  open: {
    label: '開放',
    hint: '除地址及緊急聯絡外全部公開',
    fields: (f, keys) =>
      Object.fromEntries(
        keys.map((k) => [k, ['address', 'emergencyName', 'emergencyPhone', 'dob'].includes(k) ? 'self' : 'public']),
      ),
    sections: () => Object.fromEntries(SECTIONS.map((s) => [s.key, 'public'])),
  },
};

export default function Privacy() {
  const { push } = useToast();
  const [data, setData] = useState(null);
  const [conns, setConns] = useState({ linked: [], incoming: [], outgoing: [] });
  const [events, setEvents] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [me, c, audit] = await Promise.all([
      api.get('/me'),
      api.get('/connections'),
      api.get('/me/audit').catch(() => ({ events: [] })),
    ]);
    setData(me);
    setConns(c);
    setEvents(audit.events || []);
  }, []);

  useEffect(() => {
    load().catch((e) => push(e.message, 'error'));
  }, [load, push]);

  const keys = useMemo(() => FIELD_GROUPS.flatMap((g) => g.fields.map((f) => f.key)), []);

  const counts = useMemo(() => {
    const c = { public: 0, linked: 0, self: 0 };
    if (data) Object.values(data.privacy.fields).forEach((v) => (c[v] = (c[v] || 0) + 1));
    return c;
  }, [data]);

  if (!data) return <div className="page"><div className="skeleton skeleton--title" /></div>;

  const persist = async (next) => {
    setData((d) => ({ ...d, privacy: next }));
    setSaving(true);
    try {
      await api.put('/me/privacy', next);
      setSaving(false);
    } catch (e) {
      push(e.message, 'error');
      setSaving(false);
      load();
    }
  };

  const setFieldLevel = (key, level) =>
    persist({ ...data.privacy, fields: { ...data.privacy.fields, [key]: level } });

  const setSectionLevel = (key, level) =>
    persist({ ...data.privacy, sections: { ...data.privacy.sections, [key]: level } });

  const applyPreset = (id) => {
    const p = PRESETS[id];
    persist({ fields: p.fields(data.privacy.fields, keys), sections: p.sections() });
    push(`已套用「${p.label}」預設`);
  };

  const setScope = async (conn, scope) => {
    try {
      await api.patch(`/connections/${conn.id}`, { scope });
      push(scope === 'full' ? '已授予全部資料' : '已改為只分享已連結資料');
      await load();
    } catch (e) {
      push(e.message, 'error');
    }
  };

  const revoke = async (conn) => {
    if (!confirm(`解除與 ${conn.peer?.nameZh} 的連結？對方將只看到你的公開資料。`)) return;
    await api.del(`/connections/${conn.id}`);
    push('已解除連結');
    await load();
  };

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <span className="eyebrow">私隱 · PRIVACY</span>
          <h1>你決定誰看到什麼</h1>
          <p className="page__sub">每一項資料都可以獨立設定。更改即時生效，毋須通知任何人。</p>
        </div>
        <div className="page__actions">
          <span className="save-state">{saving ? '儲存中…' : '已同步'}</span>
          <button className="btn btn--ghost" onClick={() => navigate('/connections')}>
            <Icon name="users" size={17} /> 連結管理
          </button>
        </div>
      </header>

      <div className="privacy-grid">
        <div className="privacy-grid__main">
          <section className="panel">
            <SectionHeading eyebrow="OVERVIEW" title="目前分享範圍" />
            <div className="privacymini privacymini--lg">
              <div>
                <span className="dot dot--public" />
                <strong>{counts.public || 0}</strong>
                <em>公開</em>
                <span className="privacymini__hint">任何拿到連結的人</span>
              </div>
              <div>
                <span className="dot dot--linked" />
                <strong>{counts.linked || 0}</strong>
                <em>已連結</em>
                <span className="privacymini__hint">你批准過的領袖／朋友</span>
              </div>
              <div>
                <span className="dot dot--self" />
                <strong>{counts.self || 0}</strong>
                <em>只限自己</em>
                <span className="privacymini__hint">除「全部資料」授權外</span>
              </div>
            </div>
            <div className="presets">
              <span className="presets__label">快速預設</span>
              {Object.entries(PRESETS).map(([id, p]) => (
                <button key={id} className="preset" onClick={() => applyPreset(id)}>
                  <strong>{p.label}</strong>
                  <span>{p.hint}</span>
                </button>
              ))}
            </div>
          </section>

          {FIELD_GROUPS.map((group) => (
            <section className="panel" key={group.id}>
              <SectionHeading eyebrow={group.labelEn.toUpperCase()} title={group.label}>
                逐項選擇可見範圍。
              </SectionHeading>
              <ul className="vis-rows">
                {group.fields.map((f) => (
                  <li key={f.key} className="vis-row">
                    <span className="vis-row__label">
                      <strong>{f.label}</strong>
                      <em>{f.labelEn}</em>
                    </span>
                    <Segmented
                      value={data.privacy.fields[f.key] || 'self'}
                      options={LEVEL_OPTIONS}
                      onChange={(v) => setFieldLevel(f.key, v)}
                      size="sm"
                      ariaLabel={`${f.label}的可見範圍`}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <section className="panel">
            <SectionHeading eyebrow="RECORD SECTIONS" title="紀錄章節">
              整節紀錄（例如訓練進度、服務）以同一範圍分享。
            </SectionHeading>
            <ul className="vis-rows">
              {SECTIONS.map((s) => (
                <li key={s.key} className="vis-row">
                  <span className="vis-row__label">
                    <strong>{s.label}</strong>
                    <em>{s.labelEn}</em>
                  </span>
                  <Segmented
                    value={data.privacy.sections[s.key] || 'self'}
                    options={LEVEL_OPTIONS}
                    onChange={(v) => setSectionLevel(s.key, v)}
                    size="sm"
                    ariaLabel={`${s.label}的可見範圍`}
                  />
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="privacy-grid__side">
          <section className="panel panel--accent">
            <SectionHeading eyebrow="CONNECTED" title="已連結" />
            {conns.linked.length === 0 ? (
              <Empty icon="users" title="尚未連結任何領袖">
                領袖需要你批准才可讀取「已連結」資料。
              </Empty>
            ) : (
              <ul className="conn-list">
                {conns.linked.map((c) => (
                  <li key={c.id} className="conn-item">
                    <Avatar name={c.peer?.nameZh} photo={c.peer?.photo} size={38} />
                    <div className="conn-item__main">
                      <strong>{c.peer?.nameZh}</strong>
                      <span>{c.peer?.leaderTitle || c.peer?.memberNo}</span>
                      <div className="conn-item__scope">
                        {c.direction === 'incoming' ? (
                          <Segmented
                            value={c.scope}
                            size="sm"
                            options={[
                              { id: 'basic', label: '已連結資料' },
                              { id: 'full', label: '全部資料' },
                            ]}
                            onChange={(v) => setScope(c, v)}
                            ariaLabel={`${c.peer?.nameZh}的權限`}
                          />
                        ) : (
                          <Chip tone={c.scope === 'full' ? 'gold' : 'default'}>
                            {c.scope === 'full' ? '你授予了全部資料' : '已連結資料'}
                          </Chip>
                        )}
                      </div>
                    </div>
                    <button className="icon-btn icon-btn--muted" title="解除連結" onClick={() => revoke(c)}>
                      <Icon name="trash" size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="panel__note">
              <Icon name="shield" size={13} /> 「全部資料」包括你標示為私人的欄位；可隨時改回或解除。
            </p>
          </section>

          <section className="panel">
            <SectionHeading eyebrow="SHARE LINK" title="分享連結" />
            <code className="sharemodal__url">{`${window.location.origin}${data.share.path}`}</code>
            <div className="sharemini__actions">
              <CopyButton text={`${window.location.origin}${data.share.path}`} />
              <a className="btn btn--ghost btn--sm" href={data.share.path} target="_blank" rel="noreferrer">
                <Icon name="eye" size={15} /> 預覽
              </a>
            </div>
            <button
              className="btn btn--danger-ghost btn--sm"
              onClick={async () => {
                if (!confirm('更換連結後，舊的二維碼及網址會即時失效，確定嗎？')) return;
                const res = await api.post('/me/share/rotate', {});
                push('已更換連結');
                setData((d) => ({ ...d, share: { path: res.path } }));
              }}
            >
              <Icon name="trash" size={15} /> 更換連結
            </button>
          </section>

          <section className="panel">
            <SectionHeading eyebrow="ACTIVITY" title="誰看過我的卡" />
            {events.length === 0 ? (
              <Empty icon="clock" title="暫無紀錄" />
            ) : (
              <ul className="timeline timeline--tight">
                {events.slice(0, 12).map((e) => (
                  <li key={e.id} className={cx('timeline__item', `timeline__item--${e.action}`)}>
                    <span className="timeline__icon">
                      <Icon
                        name={
                          e.action === 'view'
                            ? 'eye'
                            : e.action === 'request'
                              ? 'bell'
                              : e.action === 'verify'
                                ? 'verified'
                                : e.action === 'renew'
                                  ? 'clock'
                                  : 'shield'
                        }
                        size={14}
                      />
                    </span>
                    <div>
                      <strong>{e.text}</strong>
                      <span>{fmtDate(e.at, { withTime: true })}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
