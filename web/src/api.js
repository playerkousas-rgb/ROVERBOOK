async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const type = res.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }
  if (res.ok && data === null) {
    const err = new Error('此部署未提供伺服器功能（分享需要 Node 伺服器）；其餘紀錄冊功能不受影響。');
    err.status = res.status;
    throw err;
  }
  if (!res.ok) {
    const err = new Error(data?.error || '未能連接伺服器，請稍後再試');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body }),
  del: (p, body) => request(p, { method: 'DELETE', body }),
};

export const qrUrl = (data) => `/api/qr.svg?d=${encodeURIComponent(data)}`;
