import React, { useRef } from 'react';
import { Icon } from '../ui.jsx';
import Write from './Write.jsx';

export function Field({
  label,
  en,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  multiline = false,
  className = '',
  rows = 2,
}) {
  return (
    <div className={`field ${className}`}>
      {(label || en) && (
        <span className="field__label">
          {label}
          {en && <em>{en}</em>}
        </span>
      )}
      <Write
        value={value}
        onChange={onChange}
        type={type}
        multiline={multiline}
        rows={rows}
        placeholder={placeholder}
        label={label || en || placeholder}
      />
    </div>
  );
}

export function InlineField({ value, onChange, placeholder = '', type = 'text', className = '', width }) {
  return (
    <span className={`inline-field ${className}`} style={width ? { width } : undefined}>
      <Write value={value} onChange={onChange} type={type} compact placeholder={placeholder} max={12} />
    </span>
  );
}

export function PhotoPicker({ value, onChange }) {
  const ref = useRef(null);
  const upload = (file) => {
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const size = 360;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const min = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
      URL.revokeObjectURL(url);
      onChange(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = url;
  };
  return (
    <div className="photo">
      <button type="button" className="photo__frame" onClick={() => ref.current?.click()} title="上載相片">
        {value ? <img src={value} alt="相片" /> : <Icon name="camera" size={22} />}
      </button>
      <span className="photo__hint">相片（請加蓋旅印）</span>
      {value && (
        <button type="button" className="linkbtn linkbtn--small" onClick={() => onChange(null)}>
          移除
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => upload(e.target.files?.[0])}
      />
    </div>
  );
}

export function DeleteRow({ onClick }) {
  return (
    <button type="button" className="rowdel" onClick={onClick} title="刪除這一行" aria-label="刪除這一行">
      <Icon name="x" size={13} />
    </button>
  );
}

export function AddRow({ onClick, label = '加一行' }) {
  return (
    <button type="button" className="addrow" onClick={onClick}>
      <Icon name="plus" size={14} /> {label}
    </button>
  );
}

export function VerifiedTag({ signature, label = '已簽署' }) {
  if (!signature) return <span className="tag tag--muted">未簽署</span>;
  return (
    <span className="tag tag--signed" title={`${signature.name} · ${signature.at}`}>
      <Icon name="verified" size={12} /> {label}
    </span>
  );
}
