import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Link } from '../router.jsx';
import { Avatar, Chip, Crest, Empty, Icon, SectionHeading, cx, fmtDate } from '../ui.jsx';
import { RecordCard } from '../components/Card.jsx';
import { BADGES } from '@shared/schema.js';

export default function PublicCard({ slug }) {
  const [state, setState] = useState({ loading: true, card: null, error: '' });

  useEffect(() => {
    let alive = true;
    api
      .get(`/public/card/${slug}`)
      .then((r) => alive && setState({ loading: false, card: r.card, error: '' }))
      .catch((e) => alive && setState({ loading: false, card: null, error: e.message }));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (state.loading) {
    return (
      <div className="public">
        <div className="public__inner">
          <div className="skeleton skeleton--card" />
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="public">
        <div className="public__inner public__inner--center">
          <Crest size={48} />
          <h1>這張卡片已失效</h1>
          <p className="public__lede">
            成員可能已更換分享連結。請向對方索取最新的二維碼或網址。
          </p>
          <Link to="/login" className="btn btn--ghost">前往 ROVERBOOK</Link>
        </div>
      </div>
    );
  }

  const { card } = state;
  const { subject, sections, badgeProgress, endorsement } = card;
  const shared = Object.entries(sections);
  const training = sections.training;
  const fieldGroups = card.groups.filter((g) => g.fields.length > 0);

  return (
    <div className="public">
      <header className="public__bar">
        <Link to="/login" className="public__brand">
          <Crest size={30} />
          <span>
            <strong>ROVERBOOK</strong>
            <em>樂行童軍電子紀錄卡</em>
          </span>
        </Link>
        <span className="public__badge">
          <Icon name="shield" size={14} /> 由成員分享
        </span>
      </header>

      <main className="public__inner">
        <div className="public__hero">
          <div className="public__hero-text">
            <span className="eyebrow">MEMBER CARD</span>
            <h1>{subject.nameZh}</h1>
            <p className="public__name-en">{subject.nameEn}</p>
            <p className="public__meta">
              {[subject.crew, subject.district, subject.region].filter(Boolean).join(' · ') || '團籍未公開'}
            </p>
            <div className="public__chips">
              {endorsement && (
                <Chip tone="gold" icon="verified">
                  {endorsement.byName} 已核實
                </Chip>
              )}
              {badgeProgress.membershipVisible && badgeProgress.membershipActive && (
                <Chip tone="ok" icon="check">會籍有效至 {badgeProgress.membershipValidUntil}</Chip>
              )}
              {badgeProgress.completed !== null && (
                <Chip icon="medal">
                  完成 {badgeProgress.completed} / {badgeProgress.total} 項考驗
                </Chip>
              )}
            </div>
          </div>
          <RecordCard card={card} className="ecard--public" sharePath={window.location.pathname} />
        </div>

        <div className="public__grid">
          {fieldGroups.map((g) => (
            <section className="panel public__panel" key={g.id}>
              <SectionHeading eyebrow={g.labelEn.toUpperCase()} title={g.label} />
              <dl className="datalist">
                {g.fields.map((f) => (
                  <div key={f.key}>
                    <dt>{f.label}</dt>
                    <dd>{f.value || '—'}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}

          {training && (
            <section className="panel public__panel">
              <SectionHeading eyebrow="TRAINING SCHEME" title="訓練進度" action={<Chip tone={badgeProgress.completed >= 7 ? 'gold' : 'default'}>{badgeProgress.completed} / 7</Chip>} />
              <div className="components">
                {badgeProgress.components.map((c) => (
                  <div key={c.id} className={cx('component', c.done && 'is-done')}>
                    <span className="component__tick">{c.done ? <Icon name="check" size={12} /> : null}</span>
                    <span className="component__label">{c.label}</span>
                    {c.verified && <span className="component__verified">已核實</span>}
                  </div>
                ))}
              </div>
              <div className="badge-strip">
                {BADGES.map((b) => {
                  const state2 = badgeProgress.badges.find((x) => x.id === b.id);
                  return (
                    <div key={b.id} className={cx('badge-pill', state2?.date && 'is-earned')}>
                      <Icon name={state2?.date ? 'verified' : 'medal'} size={16} />
                      <div>
                        <strong>{b.label}</strong>
                        <span>{state2?.date || '未獲頒'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {sections.awards && (
            <section className="panel public__panel">
              <SectionHeading eyebrow="AWARDS" title="獎章及獎勵" />
              <ul className="record-list">
                {sections.awards.items.map((a) => (
                  <li key={a.id} className="record-item">
                    <div className="record-item__body">
                      <strong>{a.name}</strong>
                      <span>{a.summary}</span>
                      <em>{[a.date, a.org].filter(Boolean).join(' · ')}</em>
                    </div>
                    {a.verifiedBy && <Chip tone="ok" icon="verified">已核實</Chip>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {sections.service && (
            <section className="panel public__panel">
              <SectionHeading eyebrow="SERVICE" title="服務紀錄" />
              <ul className="record-list">
                {sections.service.items.map((s) => (
                  <li key={s.id} className="record-item">
                    <div className="record-item__body">
                      <strong>{s.post}</strong>
                      <span>{[s.from, s.to].filter(Boolean).join(' → ')}</span>
                      {s.appointedBy && <em>委任：{s.appointedBy}</em>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {sections.expeditions && (
            <section className="panel public__panel">
              <SectionHeading eyebrow="EXPEDITIONS" title="遠足及海外活動" />
              <ul className="record-list">
                {sections.expeditions.items.map((e) => (
                  <li key={e.id} className="record-item">
                    <div className="record-item__body">
                      <strong>{e.item}</strong>
                      <span>{e.period}</span>
                      {e.description && <em>{e.description}</em>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <footer className="public__foot">
          <Crest size={30} />
          <p>
            此卡片由 {subject.nameZh} 分享，只顯示成員設定為「公開」的資料。成員可隨時更改範圍或更換連結。
          </p>
          <Link to="/login" className="btn btn--ghost btn--sm">
            我也是樂行童軍成員 <Icon name="chevron" size={15} />
          </Link>
        </footer>
      </main>
    </div>
  );
}
