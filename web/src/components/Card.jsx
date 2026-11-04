import React, { useMemo, useState } from 'react';
import { Avatar, Chip, Crest, Icon, cx } from '../ui.jsx';

export function fieldValue(card, key) {
  for (const group of card?.groups || []) {
    const hit = group.fields.find((f) => f.key === key);
    if (hit) return hit.value;
  }
  return '';
}

function PrivacyLine({ card }) {
  const levels = { public: 0, linked: 0, self: 0 };
  (card.groups || []).forEach((g) => g.fields.forEach((f) => (levels[f.visibility] = (levels[f.visibility] || 0) + 1)));
  const hidden = card.counts?.hiddenFields || 0;
  return (
    <span className="ecard__privacy">
      <Icon name="shield" size={12} /> 公開 {levels.public || 0} · 已連結 {levels.linked || 0} · 私人{' '}
      {(levels.self || 0) + hidden}
    </span>
  );
}

export function RecordCard({ card, sharePath, flipped: flippedProp, defaultFlipped = false, className, onFlip }) {
  const [flippedState, setFlippedState] = useState(defaultFlipped);
  const flipped = flippedProp ?? flippedState;
  const canFlip = !!sharePath;
  const toggle = () => {
    if (!canFlip) return;
    if (onFlip) onFlip();
    else setFlippedState((v) => !v);
  };

  const { subject, badgeProgress, endorsement, access } = card;
  const memberNo = fieldValue(card, 'memberNo');
  const crew = fieldValue(card, 'crew');
  const district = fieldValue(card, 'district');
  const region = fieldValue(card, 'region');
  const membershipVisible = badgeProgress?.membershipVisible !== false;
  const validUntil = membershipVisible ? badgeProgress?.membershipValidUntil : null;
  const valid = membershipVisible ? badgeProgress?.membershipActive : null;
  const statusLabel = access?.isOwner ? '我的卡片' : valid ? '會籍有效' : validUntil ? '待續會' : membershipVisible ? '新成員' : '成員卡';
  const completed = badgeProgress?.completed;
  const total = badgeProgress?.total || 7;
  const qrTarget = useMemo(() => {
    if (typeof window === 'undefined' || !sharePath) return '';
    return `${window.location.origin}${sharePath}`;
  }, [sharePath]);

  return (
    <div className={cx('ecard-wrap', className)}>
      <div className={cx('ecard', flipped && 'is-flipped')}>
        <div className="ecard__inner">
          <section className="ecard__face ecard__front" aria-hidden={flipped} onClick={toggle}>
            <div className="ecard__glow" />
            <div className="ecard__top">
              <Crest size={34} />
              <div className="ecard__brand">
                <span className="ecard__brand-cn">樂行童軍</span>
                <span className="ecard__brand-en">ROVER SCOUT · RECORD CARD</span>
              </div>
              <span className={cx('ecard__status', valid && 'is-valid')}>
                <i />
                {statusLabel}
              </span>
            </div>

            <div className="ecard__mid">
              <Avatar name={subject.nameZh} photo={subject.photo} size={64} ring />
              <div className="ecard__id">
                <div className="ecard__name">{subject.nameZh}</div>
                <div className="ecard__name-en">{subject.nameEn}</div>
                <div className="ecard__crew">
                  {[crew, district, region].filter(Boolean).join(' · ') || '資料未公開'}
                </div>
              </div>
            </div>

            <div className="ecard__bottom">
              <div className="ecard__no">
                <span>會員編號 NO.</span>
                <strong>{memberNo || '•••• ••••'}</strong>
              </div>
              <div className="ecard__progress">
                <span className="ecard__progress-label">
                  {completed === null || completed === undefined ? (
                    <>
                      <Icon name="lock" size={12} /> 訓練進度未公開
                    </>
                  ) : (
                    <>訓練進度 {completed}/{total}</>
                  )}
                </span>
                <span className="ecard__dots">
                  {(badgeProgress?.components || []).map((c) => (
                    <i key={c.id} className={cx(c.done === true && 'is-on', c.done === null && 'is-hidden')} title={c.label} />
                  ))}
                </span>
              </div>
              <div className="ecard__valid">
                <span>{membershipVisible ? '有效至' : '會籍'}</span>
                <strong>{membershipVisible ? validUntil || '—' : '未公開'}</strong>
              </div>
            </div>

            {endorsement && (
              <div className="ecard__seal" title={`由 ${endorsement.byName} 簽署`}>
                <span>已核實</span>
                <em>{endorsement.byName}</em>
              </div>
            )}

            {canFlip && (
              <button
                type="button"
                className="ecard__flip"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle();
                }}
                aria-label="翻轉卡片"
              >
                <Icon name="qr" size={15} />
              </button>
            )}
          </section>

          <section className={cx('ecard__face ecard__back', !canFlip && 'is-static')} aria-hidden={!flipped} onClick={toggle}>
            <div className="ecard__glow ecard__glow--back" />
            <div className="ecard__top">
              <Crest size={28} />
              <div className="ecard__brand">
                <span className="ecard__brand-cn">分享卡片</span>
                <span className="ecard__brand-en">SCAN TO VIEW</span>
              </div>
              <span className="ecard__status ecard__status--ghost">
                <Icon name="shield" size={12} />
                {access?.scope === 'full' ? '全部資料' : access?.level === 'linked' ? '已連結' : '公開連結'}
              </span>
            </div>
            <div className="ecard__back-body">
              {sharePath ? (
                <div className="ecard__qr">
                  <img src={`/api/qr.svg?d=${encodeURIComponent(qrTarget)}`} alt="卡片二維碼" />
                </div>
              ) : (
                <div className="ecard__qr ecard__qr--empty">
                  <Icon name="lock" size={22} />
                </div>
              )}
              <div className="ecard__back-info">
                <strong>{subject.nameZh}</strong>
                <span className="ecard__back-line">{memberNo || '會員編號未公開'}</span>
                <span className="ecard__back-line ecard__back-link">
                  {(sharePath || '').replace(/^\/c\//, 'roverbook.hk/c/')}
                </span>
                <PrivacyLine card={card} />
              </div>
            </div>
            <div className="ecard__back-foot">
              <span>香港童軍總會 · 樂行童軍支部</span>
              <span className="ecard__micro">成員可隨時更改分享範圍</span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export function AccessBanner({ card, peerName }) {
  const { access } = card;
  if (access.isOwner) return null;
  const map = {
    full: {
      tone: 'full',
      icon: 'eye',
      title: '你正在查看全部資料',
      body: `${peerName} 已授予你「全部資料」權限，包括私人欄位。此權限由成員隨時收回。`,
    },
    linked: {
      tone: 'linked',
      icon: 'users',
      title: '你正在查看已連結資料',
      body: `${peerName} 只分享了「已連結」級別的欄位；標示為私人的內容仍然隱藏。`,
    },
    public: {
      tone: 'public',
      icon: 'globe',
      title: '你正在查看公開資料',
      body: `你尚未與 ${peerName} 連結，只看到對方設為公開的欄位。發送連結請求即可查看更多。`,
    },
  };
  const m = map[access.level] || map.public;
  const hidden = card.counts?.hiddenFields || 0;
  return (
    <div className={cx('access-banner', `access-banner--${m.tone}`)}>
      <Icon name={m.icon} size={18} />
      <div>
        <strong>{m.title}</strong>
        <p>{m.body}</p>
      </div>
      {hidden > 0 && <Chip tone="muted">{hidden} 項未分享</Chip>}
    </div>
  );
}
