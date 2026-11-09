import React, { useEffect, useMemo, useState } from 'react';
import { Icon, useToast } from '../ui.jsx';
import { SignModal } from './Ink.jsx';
import { qrSvg } from '../qr.js';
import { shrinkSignature } from '../signature.js';
import { syllabusItem } from '@shared/forms.js';
import { QR_LIMIT, encodeSignoff } from '@shared/transfer.js';

const nameOf = (id) => syllabusItem(id)?.name || id;

/**
 * 領袖核簽面板：掃入成員的進度後，一次簽名、勾選項目、產生回傳二維碼。
 * 回傳碼 = 一張簽名 + 項目清單（唔會傳整本紀錄冊）。
 */
export default function SignoffPanel({ payload, onSigned }) {
  const { push } = useToast();
  const [leader, setLeader] = useState(null);
  const [openSign, setOpenSign] = useState(false);
  const [withSig, setWithSig] = useState(true);
  const [selected, setSelected] = useState(() => new Set());
  const [result, setResult] = useState(null);
  const [svg, setSvg] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const entries = useMemo(() => {
    const progress = payload?.progress || {};
    return Object.entries(progress)
      .filter(([, v]) => v?.date)
      .map(([id, v]) => ({
        id,
        date: v.date || '',
        assessor: v.assessor || '',
        signed: !!(v.assessor || payload?.signatures?.[id]),
        name: nameOf(id),
      }))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [payload]);

  useEffect(() => {
    setSelected(new Set(entries.filter((e) => !e.signed).map((e) => e.id)));
  }, [entries]);

  const chosen = entries.filter((e) => selected.has(e.id));

  useEffect(() => {
    let alive = true;
    if (!leader || chosen.length === 0) {
      setResult(null);
      setSvg('');
      return () => {
        alive = false;
      };
    }
    setBusy(true);
    setError('');
    (async () => {
      const png = withSig ? await shrinkSignature(leader.png) : null;
      const res = await encodeSignoff({
        member: payload.member,
        leader: { ...leader, png },
        items: chosen.map((e) => ({ id: e.id, date: e.date, assessor: leader.name })),
        note: 'ROVERBOOK 領袖核簽',
      });
      if (!alive) return;
      setResult(res);
      if (res.tooBig && withSig) {
        setWithSig(false);
        return;
      }
      try {
        setSvg(res.tooBig ? '' : qrSvg(res.value, { cell: 5 }));
      } catch (e) {
        setSvg('');
        setError(e.message || '未能產生二維碼');
      }
    })()
      .catch((e) => alive && setError(e.message || '未能產生回傳碼'))
      .finally(() => alive && setBusy(false));
    return () => {
      alive = false;
    };
  }, [leader, selected, withSig, entries, payload]);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (!payload?.progress || entries.length === 0) {
    return (
      <section className="signpanel">
        <h2>
          <Icon name="seal" size={16} /> 領袖核簽
        </h2>
        <p className="signpanel__hint">
          成員今次未分享「訓練進度」，所以未可以核簽。請成員重新出示二維碼並剔選「訓練進度」。
        </p>
      </section>
    );
  }

  return (
    <section className="signpanel">
      <h2>
        <Icon name="seal" size={16} /> 領袖核簽
      </h2>
      <p className="signpanel__hint">
        簽一次，套用到下面揀選的項目；之後會產生一個「回傳碼」讓成員掃回自己的紀錄冊。
        核簽只會傳這一張簽名同項目清單，唔會傳整本紀錄冊。
      </p>

      <div className="signpanel__leader">
        {leader ? (
          <div className="signpanel__sig">
            {leader.png && <img src={leader.png} alt="領袖簽名" />}
            <span>
              {leader.name}
              {leader.title ? ` · ${leader.title}` : ''}
              {leader.at ? ` · ${leader.at}` : ''}
            </span>
            <button className="linkbtn" onClick={() => setOpenSign(true)}>
              重簽
            </button>
          </div>
        ) : (
          <button className="btn btn--gold" onClick={() => setOpenSign(true)}>
            <Icon name="pen" size={15} /> 以領袖身分簽名
          </button>
        )}
      </div>

      <div className="signpanel__list">
        <div className="signpanel__listhead">
          <span>項目（{chosen.length} / {entries.length}）</span>
          <button
            className="linkbtn"
            onClick={() => setSelected(new Set(entries.map((e) => e.id)))}
          >
            全選
          </button>
          <button className="linkbtn" onClick={() => setSelected(new Set())}>
            全不選
          </button>
        </div>
        <ul>
          {entries.map((entry) => (
            <li key={entry.id} className={selected.has(entry.id) ? 'is-on' : ''}>
              <label>
                <input type="checkbox" checked={selected.has(entry.id)} onChange={() => toggle(entry.id)} />
                <span className="signpanel__item">
                  <strong>{entry.name}</strong>
                  <em>
                    {entry.date}
                    {entry.assessor ? ` · 已由 ${entry.assessor} 簽` : ' · 待核簽'}
                  </em>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      {leader && chosen.length > 0 && (
        <div className="signpanel__code">
          {busy && !result && <p className="qrstatus">正在產生回傳碼…</p>}
          {svg && <div className="qrpanel__code" dangerouslySetInnerHTML={{ __html: svg }} />}
          {result && (
            <div className="qrmeter">
              <span className={`qrmeter__bar${result.tooBig ? ' is-over' : ''}`}>
                <i style={{ width: `${Math.min(100, (result.chars / QR_LIMIT) * 100)}%` }} />
              </span>
              <span className="tiny">
                {result.chars} / {QR_LIMIT} 字元 · {result.compressed ? '已壓縮' : '未壓縮'}
              </span>
            </div>
          )}
          {result?.tooBig && (
            <p className="qrpanel__warn">
              <Icon name="alert" size={15} /> 項目太多，已自動改為「不附簽名圖」仍然超標。請減少項目，或分兩次核簽。
            </p>
          )}
          {!result?.tooBig && (
            <label className="signpanel__withsig">
              <input
                type="checkbox"
                checked={withSig}
                onChange={(e) => setWithSig(e.target.checked)}
              />
              附上簽名墨跡（取消可縮細回傳碼）
            </label>
          )}
          {result && !result.tooBig && (
            <button
              className="btn btn--ghost btn--sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(result.value);
                  push('已複製回傳碼');
                } catch {
                  push('瀏覽器未允許複製', 'error');
                }
              }}
            >
              <Icon name="copy" size={14} /> 複製回傳碼
            </button>
          )}
          {onSigned && (
            <button className="btn btn--primary btn--sm" onClick={() => onSigned(chosen, leader)}>
              <Icon name="check" size={14} /> 完成這次核簽
            </button>
          )}
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      <SignModal
        open={openSign}
        onClose={() => setOpenSign(false)}
        title="領袖核簽"
        subtitle="簽名會壓縮後放入回傳碼；成員一掃即寫入紀錄冊。"
        defaultTitle=""
        onSave={(sig) => {
          setLeader(sig);
          setOpenSign(false);
        }}
      />
    </section>
  );
}
