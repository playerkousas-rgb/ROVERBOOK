import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { Link, navigate } from '../router.jsx';
import { Avatar, Chip, CopyButton, Empty, Icon, Modal, SectionHeading, cx, fmtDate, useToast } from '../ui.jsx';
import { RecordCard } from '../components/Card.jsx';
import { useSession } from '../App.jsx';
import { BADGES } from '@shared/schema.js';

const ACTION_ICON = {
  view: 'eye',
  request: 'bell',
  accept: 'check',
  decline: 'x',
  scope: 'shield',
  renew: 'clock',
  verify: 'verified',
  remove: 'trash',
};

function nextTarget(summary, badgeProgress) {
  const earned = badgeProgress?.earned || [];
  if (!earned.includes('membership')) {
    return { label: '會員章', hint: '先完成啟導班，並參與最少三次團活動。', remaining: null };
  }
  if (!earned.includes('epaulettes')) {
    const need = Math.max(0, 4 - (summary.completed || 0));
    return {
      label: '樂行童軍肩章',
      hint: need ? `尚需完成 ${need} 項考驗（7 項中完成 4 項）` : '已達 4 項考驗，待團長核實後頒發。',
      remaining: need,
    };
  }
  if (!earned.includes('award')) {
    const need = Math.max(0, 7 - (summary.completed || 0));
    return { label: '樂行童軍獎章', hint: need ? `尚需完成 ${need} 項考驗` : '七項考驗已完成，待團長核實。', remaining: need };
  }
  if (!earned.includes('bp')) {
    return { label: '貝登堡獎章', hint: '完成全部考驗及評核，可向地域申請。', remaining: 0 };
  }
  return { label: '貝登堡獎章', hint: '所有獎章已完成，考慮擔任小隊長或教練回饋團員。', remaining: 0 };
}

export default function Home() {
  const { user, refresh } = useSession();
  const { push } = useToast();
  const [data, setData] = useState(null);
  const [conns, setConns] = useState({ linked: [], incoming: [], outgoing: [] });
  const [events, setEvents] = useState([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [me, c, audit] = await Promise.all([
      api.get('/me'),
      api.get('/connections'),
      api.get('/me/audit').catch(() => ({ events: [] })),
    ]);
    setData(me);
    setConns(c);
    setEvents(audit.events || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load().catch((e) => push(e.message, 'error'));
  }, [load, push]);

  const respond = async (id, accept, scope) => {
    try {
      await api.post(`/connections/${id}/respond`, { accept, scope });
      push(accept ? '已批准連結請求' : '已拒絕連結請求');
      await load();
    } catch (e) {
      push(e.message, 'error');
    }
  };

  const privacyCounts = useMemo(() => {
    const counts = { public: 0, linked: 0, self: 0 };
    if (data) Object.values(data.privacy.fields).forEach((v) => (counts[v] = (counts[v] || 0) + 1));
    return counts;
  }, [data]);

  if (loading || !data) {
    return (
      <div className="page">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--card" />
      </div>
    );
  }

  const { card, share, summary } = data;
  const target = nextTarget(summary, card.badgeProgress);
  const publicUrl = `${window.location.origin}${share.path}`;

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <span className="eyebrow">我的卡片 · MY CARD</span>
          <h1>你好，{data.user.nameZh}</h1>
          <p className="page__sub">
            {data.user.crew || '尚未填寫團籍'} · {fmtDate(new Date().toISOString())}
            {user.role === 'leader' && <Chip tone="gold">領袖</Chip>}
          </p>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost" onClick={() => navigate('/privacy')}>
            <Icon name="shield" size={17} /> 私隱設定
          </button>
          <button className="btn btn--primary" onClick={() => setShareOpen(true)}>
            <Icon name="qr" size={17} /> 分享卡片
          </button>
        </div>
      </header>

      <div className="home-grid">
        <div className="home-grid__main">
          <div className="card-stage">
            <RecordCard card={card} sharePath={share.path} defaultFlipped={false} />
            <p className="card-stage__hint">
              <Icon name="qr" size={13} /> 卡片可翻轉 — 背面是你的分享 QR
            </p>
          </div>

          <div className="tiles">
            <div className="tile">
              <span className="tile__label">
                <Icon name="shield" size={14} /> 會籍
              </span>
              <strong className={cx(card.badgeProgress.membershipActive ? 'tone-ok' : 'tone-warn')}>
                {card.badgeProgress.membershipValidUntil
                  ? `有效至 ${card.badgeProgress.membershipValidUntil}`
                  : '尚未續會'}
              </strong>
              <span className="tile__foot">
                {card.badgeProgress.membershipActive ? '團長已簽署本年度會籍' : '請聯絡團長辦理續會'}
              </span>
            </div>
            <div className="tile">
              <span className="tile__label">
                <Icon name="medal" size={14} /> 訓練進度
              </span>
              <strong>
                {card.badgeProgress.completed} / {card.badgeProgress.total} 項考驗
              </strong>
              <span className="progress progress--green">
                <span
                  className="progress__fill"
                  style={{ width: `${(card.badgeProgress.completed / card.badgeProgress.total) * 100}%` }}
                />
              </span>
              <span className="tile__foot">下一目標：{target.label}</span>
            </div>
            <div className="tile">
              <span className="tile__label">
                <Icon name="users" size={14} /> 已連結
              </span>
              <strong>{conns.linked.length} 位領袖／伙伴</strong>
              <span className="tile__foot">
                {conns.incoming.length > 0 ? `${conns.incoming.length} 個請求待你處理` : '沒有待處理的請求'}
              </span>
            </div>
          </div>

          <section className="panel">
            <SectionHeading
              eyebrow="BADGE PATH"
              title="獎章進度"
              action={
                <Link to="/record" className="btn btn--ghost btn--sm">
                  更新紀錄 <Icon name="chevron" size={15} />
                </Link>
              }
            >
              七項考驗可同步進行，完成後由領袖核實。
            </SectionHeading>

            <div className="badgepath">
              {BADGES.map((b, i) => {
                const date = card.badgeProgress.badges.find((x) => x.id === b.id)?.date;
                const isNext = target.label === b.label && !date;
                return (
                  <div key={b.id} className={cx('badgepath__step', date && 'is-earned', isNext && 'is-next')}>
                    <div className="badgepath__mark">
                      {date ? <Icon name="check" size={15} /> : i + 1}
                    </div>
                    <div className="badgepath__body">
                      <strong>{b.label}</strong>
                      <em>{b.labelEn}</em>
                      <span>{date ? `於 ${date} 獲頒` : b.requirement}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="components">
              {card.badgeProgress.components.map((c) => (
                <div key={c.id} className={cx('component', c.done && 'is-done')}>
                  <span className="component__tick">{c.done ? <Icon name="check" size={12} /> : null}</span>
                  <span className="component__label">{c.label}</span>
                  {c.verified && <span className="component__verified">已核實</span>}
                </div>
              ))}
            </div>
            <p className="panel__note">
              <Icon name="sparkle" size={14} /> {target.hint}
            </p>
          </section>

          <section className="panel">
            <SectionHeading eyebrow="ACTIVITY" title="最近動態" action={<Link to="/privacy" className="linkbtn">查看全部</Link>} />
            {events.length === 0 ? (
              <Empty icon="clock" title="暫無動態">
                當領袖查看你的卡片或發出請求時，紀錄會出現在這裡。
              </Empty>
            ) : (
              <ul className="timeline">
                {events.slice(0, 6).map((e) => (
                  <li key={e.id} className={cx('timeline__item', `timeline__item--${e.action}`)}>
                    <span className="timeline__icon">
                      <Icon name={ACTION_ICON[e.action] || 'clock'} size={15} />
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
        </div>

        <aside className="home-grid__side">
          {conns.incoming.length > 0 && (
            <section className="panel panel--alert">
              <SectionHeading eyebrow="REQUESTS" title="連結請求" />
              {conns.incoming.map((c) => (
                <div key={c.id} className="request">
                  <div className="request__head">
                    <Avatar name={c.peer?.nameZh} photo={c.peer?.photo} size={38} />
                    <div>
                      <strong>{c.peer?.nameZh}</strong>
                      <span>
                        {c.peer?.leaderTitle || '樂行童軍'} · {c.peer?.crew}
                      </span>
                    </div>
                    <Chip tone={c.scope === 'full' ? 'gold' : 'default'}>
                      {c.scope === 'full' ? '要求全部資料' : '要求連結'}
                    </Chip>
                  </div>
                  {c.message && <p className="request__msg">「{c.message}」</p>}
                  <p className="request__hint">
                    批准後，對方可以看到你標示為「已連結」的欄位。
                    {c.scope === 'full' && '「全部資料」包括你所有私人欄位。'}
                  </p>
                  <div className="request__actions">
                    <button className="btn btn--primary btn--sm" onClick={() => respond(c.id, true, 'basic')}>
                      只分享已連結資料
                    </button>
                    {c.scope === 'full' && (
                      <button className="btn btn--gold btn--sm" onClick={() => respond(c.id, true, 'full')}>
                        授予全部資料
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
            <SectionHeading eyebrow="SHARE" title="分享連結" />
            <div className="sharemini">
              <div className="sharemini__qr">
                <img src={`/api/qr.svg?d=${encodeURIComponent(publicUrl)}`} alt="分享二維碼" />
              </div>
              <div className="sharemini__info">
                <strong>掃描即可查看你的卡片</strong>
                <span className="sharemini__url">{share.path}</span>
                <span className="sharemini__meta">{leftSummary(privacyCounts)}</span>
              </div>
            </div>
            <div className="sharemini__actions">
              <CopyButton text={publicUrl} label="複製連結" />
              <button className="btn btn--ghost btn--sm" onClick={() => setShareOpen(true)}>
                <Icon name="qr" size={15} /> 放大
              </button>
            </div>
            <p className="panel__note">
              <Icon name="lock" size={13} /> 只有你標示為「公開」的欄位會出現在這個連結。
            </p>
          </section>

          <section className="panel">
            <SectionHeading eyebrow="PRIVACY" title="我的分享範圍" action={<Link to="/privacy" className="linkbtn">調整</Link>} />
            <div className="privacymini">
              <div>
                <span className="dot dot--public" />
                <strong>{privacyCounts.public}</strong>
                <em>公開</em>
              </div>
              <div>
                <span className="dot dot--linked" />
                <strong>{privacyCounts.linked}</strong>
                <em>已連結</em>
              </div>
              <div>
                <span className="dot dot--self" />
                <strong>{privacyCounts.self}</strong>
                <em>只限自己</em>
              </div>
            </div>
            <p className="panel__note">
              <Icon name="users" size={13} /> 已連結：{conns.linked.map((c) => c.peer?.nameZh).join('、') || '暫無'}
            </p>
          </section>
        </aside>
      </div>

      {shareOpen && (
        <ShareModal
          url={publicUrl}
          path={share.path}
          onClose={() => setShareOpen(false)}
          onRotate={async () => {
            const res = await api.post('/me/share/rotate', {});
            push('已更換連結，舊連結即時失效');
            await load();
            setShareOpen(false);
            return res.path;
          }}
        />
      )}
    </div>
  );
}

function leftSummary(c) {
  return `公開 ${c.public || 0} 項 · 已連結 ${c.linked || 0} 項 · 私人 ${c.self || 0} 項`;
}

function ShareModal({ url, path, onClose, onRotate }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="分享我的卡片" subtitle="對方毋須安裝程式，開啟連結即可看到你公開的資料。" onClose={onClose}>
      <div className="sharemodal">
        <div className="sharemodal__qr">
          <img src={`/api/qr.svg?d=${encodeURIComponent(url)}`} alt="分享二維碼" />
        </div>
        <div className="sharemodal__side">
          <span className="sharemodal__label">卡片連結</span>
          <code className="sharemodal__url">{url}</code>
          <div className="sharemodal__actions">
            <CopyButton text={url} />
            <a className="btn btn--ghost btn--sm" href={url} target="_blank" rel="noreferrer">
              <Icon name="eye" size={15} /> 預覽
            </a>
          </div>
          <div className="sharemodal__tips">
            <p>
              <Icon name="globe" size={14} /> 只顯示你設定為「公開」的欄位（{path}）
            </p>
            <p>
              <Icon name="users" size={14} /> 已連結的領袖登入後可看更多
            </p>
            <p>
              <Icon name="lock" size={14} /> 私人欄位永遠不會出現在分享連結
            </p>
          </div>
          <button
            className="btn btn--danger-ghost btn--sm"
            disabled={busy}
            onClick={async () => {
              if (!confirm('更換連結後，舊的二維碼及網址會即時失效，確定嗎？')) return;
              setBusy(true);
              try {
                await onRotate();
              } finally {
                setBusy(false);
              }
            }}
          >
            <Icon name="trash" size={15} /> 更換連結（舊連結失效）
          </button>
        </div>
      </div>
    </Modal>
  );
}
