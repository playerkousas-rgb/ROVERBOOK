import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { Link } from '../router.jsx';
import { Avatar, Chip, Empty, Icon, SectionHeading, cx, fmtDate, useToast } from '../ui.jsx';
import RequestDialog from '../components/RequestDialog.jsx';
import { useSession } from '../App.jsx';

export default function Crew() {
  const { user } = useSession();
  const { push } = useToast();
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [target, setTarget] = useState(null);

  const load = useCallback(async () => {
    const res = await api.get('/leader/overview');
    setData(res);
  }, []);

  useEffect(() => {
    if (user.role !== 'leader') return;
    load().catch((e) => push(e.message, 'error'));
  }, [load, user.role, push]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!q.trim()) return setResults([]);
      api
        .get(`/directory?q=${encodeURIComponent(q.trim())}&role=rover`)
        .then((r) => setResults(r.results))
        .catch(() => {});
    }, 220);
    return () => clearTimeout(timer);
  }, [q]);

  if (user.role !== 'leader') {
    return (
      <div className="page">
        <Empty icon="lock" title="領袖專用">
          此頁只供樂行童軍領袖使用。
        </Empty>
      </div>
    );
  }

  if (!data) return <div className="page"><div className="skeleton skeleton--title" /></div>;

  const renew = async (member) => {
    try {
      await api.post(`/members/${member.id}/renew`, { year: new Date().getFullYear() });
      push(`已為 ${member.nameZh} 續會`);
      await load();
    } catch (e) {
      push(e.message, 'error');
    }
  };

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <span className="eyebrow">團隊 · CREW</span>
          <h1>領袖工作台</h1>
          <p className="page__sub">{user.leaderTitle || '樂行童軍領袖'} · {user.crew}</p>
        </div>
        <div className="page__actions">
          <Link to="/connections" className="btn btn--ghost">
            <Icon name="users" size={17} /> 連結管理
          </Link>
        </div>
      </header>

      <div className="tiles tiles--four">
        <div className="tile">
          <span className="tile__label"><Icon name="users" size={14} /> 已連結成員</span>
          <strong>{data.stats.members}</strong>
          <span className="tile__foot">已批准你讀取紀錄</span>
        </div>
        <div className="tile">
          <span className="tile__label"><Icon name="eye" size={14} /> 全部資料授權</span>
          <strong>{data.stats.fullAccess}</strong>
          <span className="tile__foot">可核實考驗及獎章</span>
        </div>
        <div className="tile">
          <span className="tile__label"><Icon name="clock" size={14} /> 續會跟進</span>
          <strong>{data.stats.expiring}</strong>
          <span className="tile__foot">會籍即將或已到期</span>
        </div>
        <div className="tile">
          <span className="tile__label"><Icon name="medal" size={14} /> 平均進度</span>
          <strong>{data.stats.avgProgress}%</strong>
          <span className="tile__foot">七項考驗完成比例</span>
        </div>
      </div>

      <section className="panel">
        <SectionHeading eyebrow="ROSTER" title="我的成員" action={<Chip>{data.members.length} 位</Chip>}>
          只列出已批准你連結的成員。其他成員需先送出請求。
        </SectionHeading>
        {data.members.length === 0 ? (
          <Empty icon="users" title="尚未連結任何成員">
            使用右方搜尋，以會員編號或姓名找到成員並送出連結請求。
          </Empty>
        ) : (
          <ul className="roster">
            {data.members.map((m) => (
              <li key={m.id} className="roster__row">
                <Avatar name={m.nameZh} size={40} />
                <div className="roster__name">
                  <strong>{m.nameZh}</strong>
                  <span>{m.memberNo || m.crew}</span>
                </div>
                <div className="roster__progress">
                  <div className="roster__bar">
                    <span style={{ width: `${(m.completed / m.total) * 100}%` }} />
                  </div>
                  <em>{m.completed} / {m.total} 項考驗</em>
                </div>
                <div className="roster__valid">
                  <span className={cx(m.membershipActive ? 'tone-ok' : 'tone-warn')}>
                    {m.membershipValidUntil ? `有效至 ${m.membershipValidUntil}` : '未續會'}
                  </span>
                  {m.endorsement && <em>已簽署 {m.endorsement.validUntil}</em>}
                </div>
                <Chip tone={m.scope === 'full' ? 'gold' : 'default'}>
                  {m.scope === 'full' ? '全部資料' : '已連結'}
                </Chip>
                <div className="roster__actions">
                  <Link to={`/m/${m.id}`} className="btn btn--ghost btn--xs">
                    查看
                  </Link>
                  <button className="btn btn--primary btn--xs" onClick={() => renew(m)}>
                    續會
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="crew-grid">
        <section className="panel">
          <SectionHeading eyebrow="SEARCH" title="尋找成員" >
            以會員編號或姓名搜尋，送出連結請求。成員批准後才會出現在上表。
          </SectionHeading>
          <div className="searchbox">
            <Icon name="search" size={17} />
            <input
              className="searchbox__input"
              placeholder="例：RS-2408 或 黃芷晴"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {results.length > 0 && (
            <ul className="searchresults">
              {results.map((r) => (
                <li key={r.id}>
                  <Avatar name={r.nameZh} size={34} />
                  <div>
                    <strong>{r.nameZh}</strong>
                    <span>{r.memberNo || '會員編號未公開'} · {r.crew || '—'}</span>
                  </div>
                  {r.access === 'public' ? (
                    <button className="btn btn--primary btn--xs" onClick={() => setTarget(r)}>
                      請求連結
                    </button>
                  ) : (
                    <Link to={`/m/${r.id}`} className="btn btn--ghost btn--xs">
                      查看
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
          {q && results.length === 0 && <p className="hint">找不到成員，請確認會員編號。</p>}
        </section>

        <section className="panel">
          <SectionHeading eyebrow="PENDING" title="等待成員批准" action={<Chip tone={data.pending.length ? 'warn' : 'muted'}>{data.pending.length}</Chip>} />
          {data.pending.length === 0 ? (
            <Empty icon="clock" title="沒有待處理的請求" />
          ) : (
            <ul className="connected">
              {data.pending.map((c) => (
                <li key={c.id} className="connected__item">
                  <Avatar name={c.peer?.nameZh} photo={c.peer?.photo} size={38} />
                  <div className="connected__main">
                    <strong>{c.peer?.nameZh}</strong>
                    <span>{c.scope === 'full' ? '請求全部資料' : '請求連結'}</span>
                    <em>{fmtDate(c.createdAt)} 送出</em>
                  </div>
                  <button
                    className="btn btn--ghost btn--xs"
                    onClick={async () => {
                      await api.del(`/connections/${c.id}`);
                      push('已取消請求');
                      await load();
                    }}
                  >
                    取消
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {target && <RequestDialog target={target} defaultScope="basic" onClose={() => setTarget(null)} onSent={load} />}
    </div>
  );
}
