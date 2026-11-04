import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { Link } from '../router.jsx';
import { Avatar, Chip, Empty, Icon, SectionHeading, cx, fmtDate, useToast } from '../ui.jsx';
import RequestDialog from '../components/RequestDialog.jsx';
import { useSession } from '../App.jsx';

const ACCESS_LABEL = { public: '只看到公開', linked: '已連結', full: '全部資料', self: '本人' };

export default function Connections() {
  const { user } = useSession();
  const { push } = useToast();
  const [conns, setConns] = useState({ linked: [], incoming: [], outgoing: [] });
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [target, setTarget] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const c = await api.get('/connections');
    setConns(c);
    setLoading(false);
  }, []);

  useEffect(() => {
    load().catch((e) => push(e.message, 'error'));
  }, [load, push]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      api.get(`/directory?q=${encodeURIComponent(q.trim())}`).then((r) => setResults(r.results)).catch(() => {});
    }, 220);
    return () => clearTimeout(timer);
  }, [q]);

  const respond = async (id, accept, scope) => {
    try {
      await api.post(`/connections/${id}/respond`, { accept, scope });
      push(accept ? '已批准，對方現在可以看到你分享的資料' : '已拒絕請求');
      await load();
    } catch (e) {
      push(e.message, 'error');
    }
  };

  const remove = async (c) => {
    if (!confirm(`解除與 ${c.peer?.nameZh} 的連結？`)) return;
    await api.del(`/connections/${c.id}`);
    push('已解除連結');
    await load();
  };

  if (loading) return <div className="page"><div className="skeleton skeleton--title" /></div>;

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <span className="eyebrow">連結 · CONNECTIONS</span>
          <h1>像加朋友一樣</h1>
          <p className="page__sub">
            領袖以會員編號或姓名搜尋你，送出請求；你批准後對方才可讀取你分享的資料。
          </p>
        </div>
      </header>

      <div className="connections-grid">
        <div className="connections-grid__main">
          {conns.incoming.length > 0 && (
            <section className="panel panel--alert">
              <SectionHeading eyebrow="INCOMING" title="待你處理的請求" action={<Chip tone="warn">{conns.incoming.length}</Chip>} />
              {conns.incoming.map((c) => (
                <div key={c.id} className="request request--wide">
                  <div className="request__head">
                    <Avatar name={c.peer?.nameZh} photo={c.peer?.photo} size={42} />
                    <div>
                      <strong>{c.peer?.nameZh}</strong>
                      <span>
                        {c.peer?.leaderTitle || '樂行童軍成員'} · {c.peer?.crew || c.peer?.memberNo}
                      </span>
                    </div>
                    <Chip tone={c.scope === 'full' ? 'gold' : 'default'}>
                      {c.scope === 'full' ? '要求全部資料' : '要求連結'}
                    </Chip>
                  </div>
                  {c.message && <p className="request__msg">「{c.message}」</p>}
                  <p className="request__hint">
                    {c.scope === 'full'
                      ? '「全部資料」會包括你的聯絡方法、出生日期及緊急聯絡人。你亦可以只批准「已連結資料」。'
                      : '批准後對方可看到你標示為「已連結」的欄位，私人欄位仍然隱藏。'}
                  </p>
                  <div className="request__actions">
                    <button className="btn btn--primary btn--sm" onClick={() => respond(c.id, true, 'basic')}>
                      批准（已連結資料）
                    </button>
                    {c.scope === 'full' && (
                      <button className="btn btn--gold btn--sm" onClick={() => respond(c.id, true, 'full')}>
                        批准（全部資料）
                      </button>
                    )}
                    <button className="btn btn--ghost btn--sm" onClick={() => respond(c.id, false)}>
                      拒絕
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}

          <section className="panel">
            <SectionHeading eyebrow="LINKED" title="已連結" action={<Chip>{conns.linked.length} 位</Chip>} />
            {conns.linked.length === 0 ? (
              <Empty icon="users" title="尚未連結任何人">
                團隊中的領袖可以搜尋你的會員編號並送出請求。
              </Empty>
            ) : (
              <ul className="connected">
                {conns.linked.map((c) => (
                  <li key={c.id} className="connected__item">
                    <Avatar name={c.peer?.nameZh} photo={c.peer?.photo} size={42} />
                    <div className="connected__main">
                      <strong>{c.peer?.nameZh}</strong>
                      <span>
                        {c.peer?.leaderTitle || '成員'}
                        {c.peer?.crew ? ` · ${c.peer.crew}` : ''}
                      </span>
                      <em>連結於 {fmtDate(c.createdAt)}</em>
                    </div>
                    <Chip tone={c.scope === 'full' ? 'gold' : 'default'}>
                      {c.scope === 'full' ? '全部資料' : '已連結資料'}
                    </Chip>
                    <Link to={`/m/${c.peer?.id}`} className="btn btn--ghost btn--sm">
                      查看卡片
                    </Link>
                    <button className="icon-btn icon-btn--muted" title="解除連結" onClick={() => remove(c)}>
                      <Icon name="trash" size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {conns.outgoing.length > 0 && (
            <section className="panel">
              <SectionHeading eyebrow="PENDING" title="已送出的請求" />
              <ul className="connected">
                {conns.outgoing.map((c) => (
                  <li key={c.id} className="connected__item">
                    <Avatar name={c.peer?.nameZh} photo={c.peer?.photo} size={38} />
                    <div className="connected__main">
                      <strong>{c.peer?.nameZh}</strong>
                      <span>{c.peer?.crew || c.peer?.memberNo}</span>
                      <em>等待對方回覆 · {fmtDate(c.createdAt)}</em>
                    </div>
                    <Chip tone="warn">{c.scope === 'full' ? '全部資料' : '連結'}</Chip>
                    <button className="btn btn--ghost btn--sm" onClick={() => remove(c)}>
                      取消
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="connections-grid__side">
          <section className="panel">
            <SectionHeading eyebrow="FIND" title="搜尋成員或領袖" />
            <div className="searchbox">
              <Icon name="search" size={17} />
              <input
                className="searchbox__input"
                placeholder="輸入會員編號或姓名，例：RS-2312"
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
                      <span>
                        {r.leaderTitle || r.memberNo || '會員編號未公開'}
                        {r.crew ? ` · ${r.crew}` : ''}
                      </span>
                    </div>
                    <Chip tone={r.access === 'public' ? 'muted' : 'ok'}>{ACCESS_LABEL[r.access] || '公開'}</Chip>
                    {r.access === 'public' ? (
                      <button className="btn btn--primary btn--xs" onClick={() => setTarget(r)}>
                        請求
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
            {q && results.length === 0 && <p className="hint">找不到符合的成員，請確認會員編號。</p>}
          </section>

          <section className="panel panel--muted">
            <SectionHeading eyebrow="HOW IT WORKS" title="三個步驟" />
            <ol className="steps">
              <li>
                <span>1</span>
                <div>
                  <strong>領袖找到你</strong>
                  <p>以會員編號或姓名搜尋，看到你的名字及團籍。</p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <strong>你批准請求</strong>
                  <p>可選擇「已連結資料」或「全部資料」，亦可拒絕。</p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>隨時收回</strong>
                  <p>{user.role === 'leader' ? '成員可在私隱頁修改範圍。' : '在「私隱」頁把權限改回或解除連結。'}</p>
                </div>
              </li>
            </ol>
          </section>
        </aside>
      </div>

      {target && (
        <RequestDialog target={target} onClose={() => setTarget(null)} onSent={load} />
      )}
    </div>
  );
}
