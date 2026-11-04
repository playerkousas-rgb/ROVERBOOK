import React from 'react';
import { Link } from '../router.jsx';
import { useBook } from '../bookContext.js';
import { Spread, ChapterMark } from '../components/Paper.jsx';
import { allStats, membershipStatus, SECTIONS, SYLLABUS_META, latestRenewal } from '@shared/book.js';
import { Icon, SealMark } from '../ui.jsx';

export default function Contents() {
  const { book } = useBook();
  const stats = allStats(book);
  const membership = membershipStatus(book);
  const renewal = latestRenewal(book);

  return (
    <Spread
      section="contents"
      folioLeft="i"
      folioRight="1"
      left={
        <>
          <ChapterMark
            no="01"
            title="目錄"
            en="CONTENTS"
            lead="本紀錄冊記錄你在樂行童軍時期的各項成就；同時可以向他人，例如僱主、院校、朋友等提供有關你甚有價值的資料。請小心保存並更新有關資料，在考取樂行童軍肩章、樂行童軍獎章或貝登堡獎章時，必須出示此紀錄冊。"
          />
          <div className="aside-block">
            <h4>使用說明</h4>
            <ul className="bullets">
              <li>直接在紙頁上填寫；每次修改自動儲存於這部裝置。</li>
              <li>簽署欄請由領袖／主考即場以手指或滑鼠簽名，可附職位及日期。</li>
              <li>「訓練計劃」對應第五版綱要的 32 項細項，可與 ROVERBADGE 交換進度。</li>
              <li>需要紙本時，用「列印」即可輸出 A4；需要分享時，用二維碼或連結。</li>
            </ul>
          </div>
          <div className="aside-stamp">
            <SealMark text="樂行童軍" sub="紀錄冊" size={86} />
            <p>本冊共 18 頁 · 12 章</p>
          </div>
        </>
      }
      right={
        <>
          <div className="toc">
            {SECTIONS.map((s, i) => (
              <Link key={s.id} to={`/p/${s.id}`} className="toc__row">
                <span className="toc__no">{String(i + 1).padStart(2, '0')}</span>
                <span className="toc__title">
                  {s.label}
                  <em>{s.en}</em>
                </span>
                <span className="toc__dots" />
                <span className="toc__page">{s.page}</span>
              </Link>
            ))}
          </div>

          <div className="toc-summary">
            <div>
              <span>訓練進度</span>
              <strong>
                {stats.done}
                <em>/ {stats.total} 項</em>
              </strong>
            </div>
            <div>
              <span>已獲獎章</span>
              <strong>
                {Object.values(book.badges || {}).filter((b) => b?.date).length}
                <em>/ 4</em>
              </strong>
            </div>
            <div>
              <span>會籍</span>
              <strong className={membership.active ? 'is-ok' : 'is-warn'}>
                {renewal ? `至 ${renewal.validUntil}` : '未續會'}
              </strong>
            </div>
          </div>

          <p className="toc-meta">
            <Icon name="info" size={13} /> 綱要：{SYLLABUS_META.base}（{SYLLABUS_META.version}）
          </p>
        </>
      }
    />
  );
}
