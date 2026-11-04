import React from 'react';
import { useBook } from '../bookContext.js';
import { Spread } from '../components/Paper.jsx';
import { allStats, membershipStatus, SECTIONS, SYLLABUS_META } from '@shared/book.js';
import { Link } from '../router.jsx';
import { Icon, fmtDate } from '../ui.jsx';

const GROUPS = [
  { title: '成員資料', en: 'Particulars', ids: ['colophon', 'particulars-1', 'particulars-2', 'group', 'scouting', 'changes'] },
  { title: '會員資格及紀錄', en: 'Membership & records', ids: ['renewals-1', 'renewals-2', 'service-awards'] },
  { title: '訓練綱要', en: 'Training scheme', ids: ['scheme', 'plan'] },
  {
    title: '會員章 · Membership Badge',
    en: 'Stage 1',
    ids: ['mb-intro', 'mb-activities', 'mb-understanding', 'mb-commitment', 'mb-presented'],
  },
  { title: '樂行童軍肩章 · Epaulettes', en: 'Stage 2', ids: ['ep-intro', 'ep-presented'] },
  { title: '獎章簡介', en: 'Award introduction', ids: ['rsa-intro', 'rsa-awards'] },
  {
    title: '樂行童軍獎章及貝登堡獎章 · 七項考驗',
    en: 'Seven components',
    ids: ['dedication', 'scoutcraft', 'volunteerism', 'global-vision', 'tenacity', 'wellness-1', 'wellness-2', 'intrepidity'],
  },
  {
    title: '頒發及會面',
    en: 'Presentations & interviews',
    ids: ['rsa-presented', 'interview-district', 'interview-region', 'bpa-presented'],
  },
  { title: '其他獎章及經驗', en: 'Other badges & experiences', ids: ['wosm', 'other-badges-1', 'other-badges-2', 'additional-1', 'additional-2', 'expeditions-1', 'expeditions-2', 'uniform'] },
];

export default function Contents() {
  const { book } = useBook();
  const stats = allStats(book);
  const membership = membershipStatus(book);
  const byId = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));

  return (
    <Spread
      section="contents"
      right={
        <div className="tocpage">
          <div className="tocpage__intro">
            <p>
              本電子版逐頁對應《Rover Scout Record Book》（2026 年 7 月 27 日版）第 1–41 頁。
              每一頁都可以直接點擊填寫，字體會自動縮放。
            </p>
          </div>

          <div className="tocpage__cols">
            {GROUPS.map((g) => (
              <section className="tocgroup" key={g.title}>
                <h4>
                  {g.title}
                  <em>{g.en}</em>
                </h4>
                <ul>
                  {g.ids.map((id) => {
                    const s = byId[id];
                    if (!s) return null;
                    return (
                      <li key={id}>
                        <Link to={`/p/${id}`}>
                          <span className="tocgroup__no">{s.page}</span>
                          <span className="tocgroup__label">{s.label}</span>
                          <Icon name="chevron" size={11} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>

          <div className="tocfooter">
            <div>
              <span className="tocfooter__k">{stats.done} / {stats.total} 項訓練細項</span>
              <span className="tocfooter__v">{stats.percent}%</span>
            </div>
            <div>
              <span className="tocfooter__k">會籍有效至</span>
              <span className="tocfooter__v">{membership.validUntil ? fmtDate(membership.validUntil) : '未續會'}</span>
            </div>
            <div>
              <span className="tocfooter__k">綱要版本</span>
              <span className="tocfooter__v">{SYLLABUS_META.version}</span>
            </div>
            <Link to="/p/appendix" className="tocfooter__link">
              數位附錄：備份 · 分享 · 錢包 <Icon name="chevron" size={12} />
            </Link>
          </div>
        </div>
      }
    />
  );
}
