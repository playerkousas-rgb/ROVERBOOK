import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useBook } from '../bookContext.js';
import { Icon, Modal, useToast } from '../ui.jsx';
import { QR_LIMIT, TRANSFER_OPTIONS, encodeTransfer } from '@shared/transfer.js';
import { qrSvg } from '../qr.js';

export function ShowQrButton({ className = 'btn btn--ghost btn--sm', label = '出示二維碼' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>
        <Icon name="qr" size={14} /> {label}
      </button>
      <ShowQrDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export default function ShowQrDialog({ open, onClose }) {
  const { book } = useBook();
  const { push } = useToast();
  const [selected, setSelected] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [svg, setSvg] = useState('');
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setSelected([]);
    setResult(null);
    setError('');
    setSvg('');
  }, [open]);

  const toggle = (key) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  useEffect(() => {
    let alive = true;
    if (!open || selected.length === 0) {
      setResult(null);
      setSvg('');
      setError('');
      return () => {
        alive = false;
      };
    }
    setBusy(true);
    setError('');
    encodeTransfer(book, selected)
      .then((res) => {
        if (!alive) return;
        setResult(res);
        if (res.tooBig) {
          setSvg('');
          return;
        }
        try {
          setSvg(qrSvg(res.value));
        } catch (e) {
          setSvg('');
          setError(e.message || '未能產生二維碼');
        }
      })
      .catch((e) => alive && setError(e.message || '未能產生二維碼'))
      .finally(() => alive && setBusy(false));
    return () => {
      alive = false;
    };
  }, [open, selected, book]);

  const chosenHeavy = selected.filter((k) => TRANSFER_OPTIONS.find((o) => o.key === k)?.heavy);
  const ratio = result ? Math.min(100, Math.round((result.chars / QR_LIMIT) * 100)) : 0;
  const tip = useMemo(() => {
    if (!result) return '';
    if (result.tooBig) return '資料超出二維碼容量，請取消「近照」或「簽署」，或分兩次傳送。';
    if (ratio > 80) return '接近上限，掃描時請把手機放穩、光線充足。';
    return '請領袖在 ROVERBOOK 開啟「領袖模式」後用「掃描二維碼」讀取；毋須上網、毋須帳號。';
  }, [result, ratio]);

  if (!open) return null;

  return (
    <Modal onClose={onClose} eyebrow="QR · 出示給領袖" title="出示二維碼" wide>
      <p className="qrlead">
        預設<strong>不會</strong>放入任何資料。請剔選今次想給領袖看的項目，剔幾多、看幾多，每次都要重新剔。
      </p>

      <div className="qrgrid">
        {TRANSFER_OPTIONS.map((opt) => (
          <label key={opt.key} className={`qropt${selected.includes(opt.key) ? ' is-on' : ''}`}>
            <input type="checkbox" checked={selected.includes(opt.key)} onChange={() => toggle(opt.key)} />
            <span>
              <strong>
                {opt.label}
                {opt.sensitive && <b className="qropt__tag">敏感</b>}
                {opt.heavy && <b className="qropt__tag qropt__tag--heavy">大檔案</b>}
              </strong>
              <em>{opt.en}</em>
              <small>{opt.hint}</small>
            </span>
          </label>
        ))}
      </div>

      <div className="qrpanel">
        {selected.length === 0 && (
          <div className="qrpanel__empty">
            <Icon name="qr" size={34} />
            <p>請先在上面剔選要傳送的項目。</p>
          </div>
        )}

        {selected.length > 0 && busy && !result && <p className="qrstatus">正在整理資料…</p>}

        {result && !result.tooBig && svg && (
          <div className="qrpanel__code" ref={boxRef} dangerouslySetInnerHTML={{ __html: svg }} />
        )}

        {result?.tooBig && (
          <div className="qrpanel__warn">
            <Icon name="alert" size={16} />
            <div>
              <strong>超出二維碼容量</strong>
              <p>{tip}</p>
              {chosenHeavy.length > 0 && <p className="tiny">建議先取消：{chosenHeavy.join('、')}</p>}
            </div>
          </div>
        )}

        {error && <p className="form-error">{error}</p>}

        {result && (
          <div className="qrmeter">
            <span className={`qrmeter__bar${result.tooBig ? ' is-over' : ''}`}>
              <i style={{ width: `${ratio}%` }} />
            </span>
            <span className="tiny">
              {result.chars} / {QR_LIMIT} 字元 · {result.compressed ? '已壓縮' : '未壓縮'}
            </span>
          </div>
        )}
      </div>

      {tip && !result?.tooBig && <p className="qrtip">{tip}</p>}

      <div className="modal__actions">
        <button
          className="btn btn--ghost"
          disabled={!result || result.tooBig}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(result.value);
              push('已複製二維碼內容');
            } catch {
              push('瀏覽器未允許複製', 'error');
            }
          }}
        >
          <Icon name="copy" size={14} /> 複製內容
        </button>
        <button className="btn btn--primary" onClick={onClose}>
          完成
        </button>
      </div>
    </Modal>
  );
}
