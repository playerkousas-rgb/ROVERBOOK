import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { BADGE_SYLLABUS, allStats } from '@shared/book.js';
import { Crest, Icon, SealMark, fmtDate } from '../ui.jsx';

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="srow">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Sig({ sig, name, title }) {
  if (!sig) return null;
  return (
    <div className="ssig">
      {sig.data && <img src={sig.data} alt="簽名" />}
      <span>
        {sig.name || name || ''}
        {(sig.title || title) && <em>{sig.title || title}</em>}
      </span>
      {sig.date && <time>{sig.date}</time>}
    </div>
  );
}

export default function SharedBook({ id }) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  useEffect(() => {
    let alive = true;
    api
      .get(`/share/${id}`)
      .then((data) => alive && setState({ status: 'ready', data, error: null }))
      .catch((error) => alive && setState({ status: 'error', data: null, error }));
    return () => {
      alive = false;
    };
  }, [id]);

  if (state.status === 'loading') {
    return (
      <div className="shared shared--center">
        <div className="shared__loader">
          <Crest size={40} />
          <p>正在打開紀錄冊…</p>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="shared shared--center">
        <div className="shared__error">
          <SealMark text="已作廢" sub="連結失效" size={92} />
          <h1>找不到這份紀錄冊</h1>
          <p>{state.error?.message || '連結可能已被持有人作廢。'}</p>
          <p className="tiny">如你是持有人，請在 ROVERBOOK 重新建立分享連結。</p>
        </div>
      </div>
    );
  }

  const { snapshot: s, createdAt, views } = state.data;
  const m = s.member || {};
  const stats = allStats(s);
  const renewals = [...(s.renewals || [])].sort((a, b) => String(b.year).localeCompare(String(a.year)));
  const current = renewals[0];

  return (
    <div className="shared">
      <header className="shared__bar">
        <span className="shared__brand">
          <Crest size={26} /> ROVERBOOK
        </span>
        <span className="shared__flag">
          <Icon name="globe" size={13} /> 公開分享 · 唯讀
        </span>
      </header>

      <main className="shared__book">
        <section className="shared__cover">
          <span className="shared__eyebrow">樂行童軍紀錄冊 · ROVER SCOUT RECORD BOOK</span>
          <div className="shared__id">
            {m.photo ? (
              <img className="shared__photo" src={m.photo} alt={`${m.nameZh || ''} 相片`} />
            ) : (
              <div className="shared__photo shared__photo--empty">{(m.nameZh || m.nameEn || '?').slice(0, 1)}</div>
            )}
            <div>
              <h1>{m.nameZh || m.nameEn || '樂行童軍'}</h1>
              {m.nameEn && <p className="shared__en">{m.nameEn}</p>}
              <p className="shared__crew">
                {[m.crew, m.group].filter(Boolean).join(' · ') || '樂行童軍團'}
              </p>
              <p className="shared__meta">
                {m.memberNo && <span>會員編號 {m.memberNo}</span>}
                {current?.validUntil && <span>會籍至 {current.validUntil}</span>}
              </p>
            </div>
          </div>

          <div className="shared__badges">
            {stats.badges.map((b) => (
              <span key={b.badge.id} className={`sbadge ${b.awarded ? 'is-awarded' : ''}`}>
                <em>{b.badge.icon}</em>
                <strong>{b.badge.name}</strong>
                <span>
                  {b.done}/{b.total}
                </span>
              </span>
            ))}
          </div>
        </section>

        <section className="shared__sheet">
          {s.include?.particulars !== false && (
            <article className="sblock">
              <h2>個人資料 <em>Personal Particulars</em></h2>
              <dl className="sgrid">
                <Row label="姓名" value={m.nameZh} />
                <Row label="英文姓名" value={m.nameEn} />
                <Row label="會員編號" value={m.memberNo} />
                <Row label="樂行童軍團" value={m.crew} />
                <Row label="旅 / 區" value={[m.group, m.district].filter(Boolean).join(' · ')} />
                <Row label="入團日期" value={m.dateJoined && fmtDate(m.dateJoined)} />
              </dl>
            </article>
          )}

          {s.contact && (
            <article className="sblock">
              <h2>聯絡方法 <em>Contact</em></h2>
              <dl className="sgrid">
                <Row label="電話" value={m.phone} />
                <Row label="電郵" value={m.email} />
                <Row label="地址" value={m.address} />
                <Row label="緊急聯絡人" value={[m.emergencyName, m.emergencyPhone].filter(Boolean).join(' · ')} />
              </dl>
            </article>
          )}

          {s.group && (
            <article className="sblock">
              <h2>旅部資料 <em>Group Information</em></h2>
              <dl className="sgrid">
                <Row label="主辦機構" value={m.sponsoringAuthority} />
                <Row label="旅長" value={m.gsl} />
                <Row label="團長" value={m.rsl} />
                <Row label="集會地點" value={m.meetingPlace} />
              </dl>
            </article>
          )}

          {s.training && (
            <article className="sblock">
              <h2>訓練進度 <em>Training Scheme</em></h2>
              <div className="sprogress">
                {stats.badges.map((b) => (
                  <div key={b.badge.id} className="sprogress__row">
                    <span>{b.badge.name}</span>
                    <span className="sprogress__bar">
                      <i style={{ width: `${b.percent}%` }} />
                    </span>
                    <strong>{b.percent}%</strong>
                  </div>
                ))}
              </div>
              <p className="sfoot">已完成 {stats.done} / {stats.total} 項細項（第五版綱要）</p>
            </article>
          )}

          {(s.scouting || []).length > 0 && (
            <article className="sblock">
              <h2>童軍紀錄 <em>Scouting Experience</em></h2>
              <ul className="slist">
                {s.scouting.map((r) => (
                  <li key={r.id}>
                    <strong>{[r.unit, r.post].filter(Boolean).join(' · ')}</strong>
                    <span>{[r.from, r.to].filter(Boolean).join(' – ')}</span>
                    {r.highestAward && <em>{r.highestAward}</em>}
                  </li>
                ))}
              </ul>
            </article>
          )}

          {(s.service || []).length > 0 && (
            <article className="sblock">
              <h2>服務紀錄 <em>Service Record</em></h2>
              <ul className="slist">
                {s.service.map((r) => (
                  <li key={r.id}>
                    <strong>{r.post}</strong>
                    <span>{[r.from, r.to].filter(Boolean).join(' – ')}</span>
                    {r.appointedBy && <em>委任：{r.appointedBy}</em>}
                    <Sig sig={r.signature} />
                  </li>
                ))}
              </ul>
            </article>
          )}

          {(s.awards || []).length > 0 && (
            <article className="sblock">
              <h2>獎章及獎勵 <em>Awards</em></h2>
              <ul className="slist">
                {s.awards.map((r) => (
                  <li key={r.id}>
                    <strong>{r.name}</strong>
                    <span>{r.date || ''}</span>
                    {r.org && <em>{r.org}</em>}
                    {r.summary && <p>{r.summary}</p>}
                    <Sig sig={r.signature} />
                  </li>
                ))}
              </ul>
            </article>
          )}

          {(s.expeditions || []).length > 0 && (
            <article className="sblock">
              <h2>遠足及海外活動 <em>Expeditions</em></h2>
              <ul className="slist">
                {s.expeditions.map((r) => (
                  <li key={r.id}>
                    <strong>{r.item}</strong>
                    <span>{r.period}</span>
                    {r.description && <p>{r.description}</p>}
                  </li>
                ))}
              </ul>
            </article>
          )}

          {(s.additional || []).length > 0 && (
            <article className="sblock">
              <h2>其他經驗 <em>Additional Experiences</em></h2>
              <ul className="slist">
                {s.additional.map((r) => (
                  <li key={r.id}>
                    <strong>{r.item}</strong>
                    <span>{r.period}</span>
                    {r.description && <p>{r.description}</p>}
                  </li>
                ))}
              </ul>
            </article>
          )}

          {renewals.length > 0 && (
            <article className="sblock">
              <h2>會員資格 <em>Renewal of Membership</em></h2>
              <ul className="slist">
                {renewals.map((r) => (
                  <li key={r.id}>
                    <strong>{r.year} 年度</strong>
                    <span>有效至 {r.validUntil}</span>
                    <Sig sig={r.signature} />
                  </li>
                ))}
              </ul>
            </article>
          )}

          {s.signatures && (s.holderSignature || s.endorsement?.signature) && (
            <article className="sblock">
              <h2>簽署 <em>Signatures</em></h2>
              <div className="ssigs">
                <div>
                  <span className="slabel">持有人</span>
                  <Sig sig={s.holderSignature} name={m.nameZh} title="持有人" />
                </div>
                <div>
                  <span className="slabel">領袖核實</span>
                  <Sig sig={s.endorsement?.signature} name={s.endorsement?.name} title={s.endorsement?.title} />
                  {s.endorsement?.date && <p className="tiny">核實日期 {s.endorsement.date}</p>}
                </div>
              </div>
            </article>
          )}

          <footer className="shared__foot">
            <SealMark text="ROVERBOOK" sub="分享頁" size={64} />
            <p>
              此頁由 ROVERBOOK 產生，內容由持有人自行選擇公開。
              <br />
              建立於 {createdAt ? createdAt.slice(0, 10) : '—'} · 瀏覽 {views || 0} 次
            </p>
            <p className="tiny">如需核實，請要求持有人出示正本紀錄冊並由領袖簽署。</p>
          </footer>
        </section>
      </main>
    </div>
  );
}
