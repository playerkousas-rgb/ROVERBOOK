import React, { useState } from 'react';
import { api } from '../api.js';
import { Icon, Modal, useToast } from '../ui.jsx';

export default function RequestDialog({ target, defaultScope = 'basic', onClose, onSent }) {
  const { push } = useToast();
  const [scope, setScope] = useState(defaultScope);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    try {
      await api.post('/connections/request', { memberId: target.id, scope, message });
      push(scope === 'full' ? '已送出「全部資料」請求' : '已送出連結請求');
      onSent?.();
      onClose();
    } catch (e) {
      push(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`向 ${target.nameZh} 發出請求`}
      subtitle="對方會收到通知，並可選擇分享的範圍。成員批准前，你只看到公開資料。"
      onClose={onClose}
    >
      <div className="scope-picker">
        <button className={scope === 'basic' ? 'scope-option is-active' : 'scope-option'} onClick={() => setScope('basic')}>
          <span className="scope-option__icon">
            <Icon name="users" size={18} />
          </span>
          <strong>連結（已連結資料）</strong>
          <p>讀取成員標示為「公開」及「已連結」的欄位，例如訓練進度、服務紀錄。</p>
        </button>
        <button className={scope === 'full' ? 'scope-option is-active' : 'scope-option'} onClick={() => setScope('full')}>
          <span className="scope-option__icon">
            <Icon name="eye" size={18} />
          </span>
          <strong>全部資料</strong>
          <p>包括聯絡方法、出生日期、緊急聯絡人等私人欄位。成員可拒絕或日後收回。</p>
        </button>
      </div>

      <label className="field" style={{ marginTop: 18 }}>
        <span className="field__label">請求原因（選填，會顯示給成員）</span>
        <textarea
          className="input input--area"
          value={message}
          maxLength={200}
          placeholder="例：地域訓練組需要核對你的貝登堡獎章進度"
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>

      <div className="form-actions">
        <button className="btn btn--ghost" onClick={onClose}>
          取消
        </button>
        <button className="btn btn--primary" onClick={send} disabled={busy}>
          {busy ? '送出中…' : scope === 'full' ? '請求全部資料' : '送出連結請求'}
        </button>
      </div>
    </Modal>
  );
}
