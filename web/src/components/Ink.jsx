import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../ui.jsx';

const INK = '#1d2b3f';

export function Ink({ dataUrl, height = 46, className = '' }) {
  if (!dataUrl) return null;
  return (
    <img
      className={`ink ${className}`}
      src={dataUrl}
      alt="簽名"
      style={{ maxHeight: height, maxWidth: '100%', width: 'auto', height: 'auto' }}
    />
  );
}

function trimCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return null;
  const pad = 10;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width, maxX + pad);
  maxY = Math.min(height, maxY + pad);
  const out = document.createElement('canvas');
  out.width = maxX - minX;
  out.height = maxY - minY;
  out.getContext('2d').drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL('image/png');
}

export function SignaturePad({ onInk }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const stack = useRef([]);
  const [empty, setEmpty] = useState(true);

  const setup = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = wrap.getBoundingClientRect();
    canvas.width = Math.max(320, rect.width) * dpr;
    canvas.height = 210 * dpr;
    canvas.style.width = '100%';
    canvas.style.height = '210px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;
    ctx.fillStyle = INK;
  }, []);

  useEffect(() => {
    setup();
  }, [setup]);

  const pos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const pushSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    stack.current.push(canvas.toDataURL());
    if (stack.current.length > 12) stack.current.shift();
  };

  const start = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    pushSnapshot();
    drawing.current = true;
    last.current = pos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.arc(last.current.x, last.current.y, 1.1, 0, Math.PI * 2);
    ctx.fill();
  };

  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const p = pos(e);
    const ctx = canvasRef.current.getContext('2d');
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
    ctx.lineWidth = 1.4 + pressure * 2.2;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (empty) setEmpty(false);
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const dataUrl = trimCanvas(canvasRef.current);
    setEmpty(!dataUrl);
    onInk?.(dataUrl);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    pushSnapshot();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
    onInk?.(null);
  };

  const undo = () => {
    const snapshot = stack.current.pop();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (snapshot) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = trimCanvas(canvas);
        setEmpty(!dataUrl);
        onInk?.(dataUrl);
      };
      img.src = snapshot;
    } else {
      setEmpty(true);
      onInk?.(null);
    }
  };

  return (
    <div className="pad" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="pad__canvas"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        onPointerCancel={end}
      />
      {empty && <span className="pad__hint">在此以手指或滑鼠簽名</span>}
      <div className="pad__tools">
        <button type="button" className="pad__tool" onClick={undo}>
          <Icon name="back" size={14} /> 復原
        </button>
        <button type="button" className="pad__tool" onClick={clear}>
          <Icon name="trash" size={14} /> 清除
        </button>
      </div>
    </div>
  );
}

export function SignModal({ open, onClose, onSave, title = '簽署', subtitle, defaultName = '', defaultTitle = '', allowTitle = true }) {
  const [ink, setInk] = useState(null);
  const [name, setName] = useState(defaultName);
  const [role, setRole] = useState(defaultTitle);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (open) {
      setInk(null);
      setName(defaultName);
      setRole(defaultTitle);
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [open, defaultName, defaultTitle]);

  if (!open) return null;

  const canSave = !!ink && name.trim().length > 0 && date;

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--sign" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal__head">
          <div>
            <span className="eyebrow">SIGNATURE</span>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="關閉">
            <Icon name="x" size={18} />
          </button>
        </header>
        <div className="modal__body">
          <div className="sign-grid">
            <label className="field">
              <span className="field__label">簽署人姓名</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="例：陳大文" />
            </label>
            {allowTitle && (
              <label className="field">
                <span className="field__label">職位／身分（可留空）</span>
                <input
                  className="input"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="可留空；一般簽署只寫姓名即可"
                />
              </label>
            )}
            <label className="field">
              <span className="field__label">日期</span>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>
          <SignaturePad onInk={setInk} />
          <p className="sign-note">
            簽名只會儲存在這本紀錄冊（你的裝置）。如需更改，可隨時重新簽署。
          </p>
          <div className="modal__actions">
            <button className="btn btn--ghost" onClick={onClose}>
              取消
            </button>
            <button
              className="btn btn--primary"
              disabled={!canSave}
              onClick={() => onSave({ png: ink, name: name.trim(), title: role.trim(), at: date })}
            >
              <Icon name="check" size={16} /> 確認簽署
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SignatureBlock({ label = '簽署', value, onSign, onClear, hint, compact = false, name }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`sigblock ${compact ? 'sigblock--compact' : ''} ${value ? 'is-signed' : ''}`}>
      <div className="sigblock__head">
        <span className="sigblock__label">{label}</span>
        {value && (
          <div className="sigblock__actions">
            <button type="button" className="linkbtn" onClick={() => setOpen(true)}>
              重簽
            </button>
            {onClear && (
              <button type="button" className="linkbtn linkbtn--danger" onClick={onClear}>
                清除
              </button>
            )}
          </div>
        )}
      </div>
      {value ? (
        <>
          <Ink dataUrl={value.png} height={compact ? 32 : 44} />
          {(value.name || value.at) && (
            <span className="sigblock__meta">{[value.name, value.at].filter(Boolean).join(' · ')}</span>
          )}
        </>
      ) : (
        <button type="button" className="sigblock__empty" onClick={() => setOpen(true)}>
          <Icon name="edit" size={15} />
          <span>{hint || '點擊簽署'}</span>
        </button>
      )}
      <SignModal
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        defaultName={value?.name || name || ''}
        defaultTitle={value?.title || ''}
        onSave={(sig) => {
          onSign?.(sig);
          setOpen(false);
        }}
      />
    </div>
  );
}
