import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { Link, navigate } from '../router.jsx';
import { Avatar, Chip, Empty, Icon, SectionHeading, cx, fmtDate, useToast } from '../ui.jsx';
import { AccessBanner, RecordCard } from '../components/Card.jsx';
import RequestDialog from '../components/RequestDialog.jsx';
import { useSession } from '../App.jsx';
import { BADGES, COMPONENTS } from '@shared/schema.js';

const SECTION_META = {
  scouting: { title: '童軍紀錄', en: 'SCOUTING EXPERIENCE' },
  service: { title: '服務紀錄', en: 'SERVICE RECORD' },
  awards: { title: '獎章及獎勵', en: 'AWARDS & COMMENDATIONS' },
  expeditions: { title: '遠足及海外活動', en: 'EXPEDITIONS & OVERSEAS' },
  additional: { title: '其他經驗', en: 'ADDITIONAL EXPERIENCES' },
  renewals: { title: '會員續期', en: 'RENEWAL OF MEMBERSHIP' },
};

export default function MemberView({ id }) {
  const { user } = useSession();
  const { push } = useToast();
  const [card, setCard] = useState(null);
  const [error, setError] = useState('');
  const [requestOpen, setRequestOpen] = useState(false);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/card/${id}`);
      setCard(res.card);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const isLeader = user?.role === 'leader';
  const accepted = card && ['linked', 'full'].includes(card.access.level);
  const canVerify = isLeader && card?.access.scope === 'full';

  const verify = async (payload, label) => {
    setBusy(label);
    try {
      const res = await api.post(`/members/${id}/verify`, payload);
      setCard(res.card);
      push('已核實並記錄');
    } catch (e) {
      push(e.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const renew = async () => {
    setBusy('renew');
    try {
      const res = await api.post(`/members/${id}/renew`, { year: new Date().getFullYear() });
      setCard(res.card);
      push(`已為成員續會至 ${new Date().getFullYear()}-12-31`);
    } catch (e) {
      push(e.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  if (error) {
    return (
      <div className="page">
        <Empty icon="alert" title="無法讀取這張卡片">
          {error}
        </Empty>
        <Link to="/crew" className="btn btn--ghost btn--sm">
          返回團隊
        </Link>
      </div>
    );
  }

  if (!card) return <div className="page"><div className="skeleton skeleton--card" /></div>;

  const { subject, sections, lockedSections, badgeProgress, access } = card;
  const components = badgeProgress.components || [];
  const sharedSections = Object.entries(sections);

  return (
    <div className="page">
      <button className="backlink" onClick={() => window.history.back()}>
        <Icon name="back" size={16} /> 返回
      </button>

      <header className="member-head">
        <Avatar name={subject.nameZh} photo={subject.photo} size={64} />
        <div className="member-head__main">
          <span className="eyebrow">{subject.leaderTitle || '樂行童軍成員'}</span>
          <h1>{subject.nameZh}</h1>
          <p>
            {subject.nameEn}
            {subject.crew ? ` · ${subject.crew}` : ''}
          </p>
        </div>
        <div className="member-head__side">
          <Chip tone={access.scope === 'full' ? 'gold' : access.level === 'linked' ? 'ok' : 'muted'} icon={access.scope === 'full' ? 'eye' : 'shield'}>
            {access.scope === 'full' ? '已授予全部資料' : access.level === 'linked' ? '已連結' : '只看到公開資料'}
          </Chip>
          <button className="btn btn--ghost btn--sm" onClick={() => window.print()}>
            <Icon name="print" size={15} /> 列印
          </button>
        </div>
      </header>

      <AccessBanner card={card} peerName={subject.nameZh} />

      {isLeader && !accepted && (
        <section className="panel panel--accent actionbar">
          <div>
            <strong>想讀取 {subject.nameZh} 的完整紀錄？</strong>
            <p>送出連結請求，成員批准後你便可以看到訓練進度及服務紀錄；如要核實獎章，需獲「全部資料」授權。</p>
          </div>
          <button className="btn btn--primary" onClick={() => setRequestOpen(true)}>
            <Icon name="users" size={16} /> 請求連結
          </button>
        </section>
      )}

      {isLeader && accepted && (
        <section className="panel actionbar actionbar--leader">
          <div>
            <strong>領袖工具</strong>
            <p>
              {canVerify
                ? '你可以核實考驗、頒授獎章、續會及簽署紀錄冊。'
                : '你目前只有「已連結」權限，可查看分享內容；核實考驗需成員授予「全部資料」。'}
            </p>
          </div>
          <div className="actionbar__buttons">
            <button className="btn btn--ghost btn--sm" onClick={renew} disabled={busy === 'renew'}>
              <Icon name="clock" size={15} /> 辦理續會
            </button>
            <button
              className="btn btn--primary btn--sm"
              disabled={busy === 'endorse' && false}
              onClick={() => verify({ kind: 'endorse' }, 'endorse')}
            >
              <Icon name="verified" size={15} /> 簽署紀錄冊
            </button>
          </div>
        </section>
      )}

      <div className="member-grid">
        <div className="member-grid__side">
          <RecordCard card={card} className="ecard--view" />
          <section className="panel">
            <SectionHeading eyebrow="PARTICULARS" title="可見資料" />
            {card.groups.every((g) => g.fields.length === 0) ? (
              <Empty icon="lock" title="全部欄位未公開" />
            ) : (
              card.groups
                .filter((g) => g.fields.length > 0)
                .map((g) => (
                  <div className="fieldgroup" key={g.id}>
                    <h3>{g.label}</h3>
                    <dl className="datalist">
                      {g.fields.map((f) => (
                        <div key={f.key}>
                          <dt>{f.label}</dt>
                          <dd>{f.value || '—'}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))
            )}
            {card.counts.hiddenFields > 0 && (
              <p className="panel__note">
                <Icon name="lock" size={13} /> 另有 {card.counts.hiddenFields} 項資料未分享
              </p>
            )}
          </section>
        </div>

        <div className="member-grid__main">
          {sections.training && (
            <section className="panel">
              <SectionHeading
                eyebrow="TRAINING SCHEME"
                title="訓練進度"
                action={<Chip tone={badgeProgress.completed >= 7 ? 'gold' : 'default'}>{badgeProgress.completed} / 7</Chip>}
              >
                {!badgeProgress.membershipVisible
                  ? '會籍狀態未分享'
                  : badgeProgress.membershipActive
                    ? `會籍有效至 ${badgeProgress.membershipValidUntil}`
                    : '會籍未續期'}
              </SectionHeading>

              <div className="component-grid">
                {components.map((c) => (
                  <div key={c.id} className={cx('component-card', c.done && 'is-done')}>
                    <div className="component-card__top">
                      <span className="component-card__tick">{c.done ? <Icon name="check" size={12} /> : null}</span>
                      <div>
                        <strong>{c.label}</strong>
                        <em>{c.labelEn}</em>
                      </div>
                    </div>
                    <div className="component-card__foot">
                      <span>{c.done ? c.date || '已完成' : '未完成'}</span>
                      {c.verified ? (
                        <Chip tone="ok" icon="verified">已核實</Chip>
                      ) : c.done ? (
                        canVerify ? (
                          <button
                            className="btn btn--xs btn--ghost"
                            disabled={busy === c.id}
                            onClick={() => verify({ kind: 'component', componentId: c.id }, c.id)}
                          >
                            核實
                          </button>
                        ) : (
                          <Chip tone="warn">待核實</Chip>
                        )
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>

              <div className="badge-strip">
                {BADGES.map((b) => {
                  const state = badgeProgress.badges.find((x) => x.id === b.id);
                  return (
                    <div key={b.id} className={cx('badge-pill', state?.date && 'is-earned')}>
                      <Icon name={state?.date ? 'verified' : 'medal'} size={16} />
                      <div>
                        <strong>{b.label}</strong>
                        <span>{state?.date || '未獲頒'}</span>
                      </div>
                      {canVerify && !state?.date && (
                        <button
                          className="btn btn--xs btn--ghost"
                          disabled={busy === b.id}
                          onClick={() => verify({ kind: 'badge', badgeId: b.id }, b.id)}
                          title="頒授此獎章"
                        >
                          頒授
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {card.endorsement && (
                <div className="endorse">
                  <span className="endorse__seal">
                    <Icon name="verified" size={22} />
                  </span>
                  <div>
                    <strong>{card.endorsement.byName} 已簽署紀錄冊</strong>
                    <span>
                      有效至 {card.endorsement.validUntil} · {fmtDate(card.endorsement.at)}
                    </span>
                  </div>
                </div>
              )}
            </section>
          )}

          {sharedSections
            .filter(([key]) => key !== 'training')
            .map(([key, sec]) =>
              key === 'awards' ? (
                <section className="panel" key={key}>
                  <SectionHeading eyebrow={SECTION_META.awards.en} title={SECTION_META.awards.title} />
                  {sec.items.length === 0 ? (
                    <Empty title="暫無紀錄" />
                  ) : (
                    <ul className="record-list">
                      {sec.items.map((item) => (
                        <li key={item.id} className="record-item">
                          <div className="record-item__body">
                            <strong>{item.name}</strong>
                            <span>{item.summary}</span>
                            <em>{[item.date, item.org].filter(Boolean).join(' · ')}</em>
                          </div>
                          <div className="record-item__side">
                            {item.verifiedBy ? (
                              <Chip tone="ok" icon="verified">已核實</Chip>
                            ) : canVerify ? (
                              <button
                                className="btn btn--xs btn--ghost"
                                onClick={() => verify({ kind: 'record', section: 'awards', itemId: item.id }, item.id)}
                              >
                                核實
                              </button>
                            ) : (
                              <Chip tone="muted">未核實</Chip>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : key === 'service' ? (
                <section className="panel" key={key}>
                  <SectionHeading eyebrow={SECTION_META.service.en} title={SECTION_META.service.title} />
                  {sec.items.length === 0 ? (
                    <Empty title="暫無紀錄" />
                  ) : (
                    <ul className="record-list">
                      {sec.items.map((item) => (
                        <li key={item.id} className="record-item">
                          <div className="record-item__body">
                            <strong>{item.post}</strong>
                            <span>{[item.from, item.to].filter(Boolean).join(' → ') || '—'}</span>
                            {item.appointedBy && <em>委任：{item.appointedBy}</em>}
                          </div>
                          <div className="record-item__side">
                            {item.verifiedBy ? (
                              <Chip tone="ok" icon="verified">已核實</Chip>
                            ) : canVerify ? (
                              <button
                                className="btn btn--xs btn--ghost"
                                onClick={() => verify({ kind: 'record', section: 'service', itemId: item.id }, item.id)}
                              >
                                核實
                              </button>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : key === 'renewals' ? (
                <section className="panel" key={key}>
                  <SectionHeading eyebrow={SECTION_META.renewals.en} title={SECTION_META.renewals.title} />
                  {sec.items.length === 0 ? (
                    <Empty icon="clock" title="暫無續會紀錄" />
                  ) : (
                    <ul className="renew-list">
                      {sec.items.map((r) => (
                        <li key={r.id}>
                          <span className="renew-list__year">{r.year}</span>
                          <div>
                            <strong>有效至 {r.validUntil}</strong>
                            <span>{r.byName} 簽署 · {fmtDate(r.at)}</span>
                          </div>
                          <Chip tone="ok" icon="check">已確認</Chip>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : (
                <section className="panel" key={key}>
                  <SectionHeading eyebrow={SECTION_META[key]?.en || ''} title={SECTION_META[key]?.title || sec.label} />
                  {sec.items.length === 0 ? (
                    <Empty title="暫無紀錄" />
                  ) : (
                    <ul className="record-list">
                      {sec.items.map((item) => (
                        <li key={item.id} className="record-item">
                          <div className="record-item__body">
                            <strong>{item.item || item.unit || item.name}</strong>
                            <span>
                              {item.period || [item.from, item.to].filter(Boolean).join(' → ')}
                              {item.highestAward ? ` · ${item.highestAward}` : ''}
                              {item.post ? ` · ${item.post}` : ''}
                            </span>
                            {item.description && <em>{item.description}</em>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ),
            )}

          {lockedSections.length > 0 && (
            <section className="panel panel--muted">
              <SectionHeading eyebrow="PRIVATE" title="成員未分享的部分" />
              <div className="locked-grid">
                {lockedSections.map((s) => (
                  <div className="locked" key={s.key}>
                    <Icon name="lock" size={16} />
                    <div>
                      <strong>{s.label}</strong>
                      <span>{s.count !== undefined ? `${s.count} 項紀錄` : '未公開'}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="panel__note">
                <Icon name="shield" size={13} /> 這些部分由成員自行設定，只有成員本人（或獲授權者）可以查看。
              </p>
            </section>
          )}
        </div>
      </div>

      {requestOpen && (
        <RequestDialog target={{ id: subject.id, nameZh: subject.nameZh }} onClose={() => setRequestOpen(false)} onSent={load} />
      )}
    </div>
  );
}
