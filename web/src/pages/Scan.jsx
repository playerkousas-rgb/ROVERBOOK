import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Link, navigate } from '../router.jsx';
import { Crest, Icon } from '../ui.jsx';
import SignoffPanel from '../components/SignoffPanel.jsx';
import { KIND_SIGNOFF, TRANSFER_OPTIONS, decodePayload } from '@shared/transfer.js';
import { SnapshotView } from './SharedBook.jsx';

const SCAN_KEY = 'roverbook.scan.v1';
const SIGNOFF_KEY = 'roverbook.signoff.v1';

const routePayload = (payload) => {
  try {
    if (payload.t === KIND_SIGNOFF) {
      window.sessionStorage.setItem(SIGNOFF_KEY, JSON.stringify(payload));
      navigate('/scan/signoff');
    } else {
      window.sessionStorage.setItem(SCAN_KEY, JSON.stringify(payload));
      navigate('/scan/view');
    }
  } catch {
    /* private mode */
  }
};

const readScan = () => {
  try {
    return JSON.parse(window.sessionStorage.getItem(SCAN_KEY) || 'null');
  } catch {
    return null;
  }
};

/* ------------------------------------------------------------ 掃描頁面 */

export default function Scan() {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('starting');
  const [error, setError] = useState('');
  const [manual, setManual] = useState('');
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let stream = null;
    let timer = null;
    let detector = null;
    const canvas = document.createElement('canvas');
    const video = videoRef.current;

    const stop = () => {
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };

    const accept = async (raw) => {
      try {
        const payload = await decodePayload(raw);
        routePayload(payload);
        stop();
        setStatus('done');
      } catch (e) {
        setError(e.message || '未能讀取這個二維碼');
        setStatus('error');
      }
    };

    const tick = async () => {
      if (cancelled) return;
      if (video && video.readyState >= 2) {
        let value = '';
        if (detector) {
          try {
            const codes = await detector.detect(video);
            if (codes?.length) value = codes[0].rawValue || '';
          } catch {
            /* 下一格再試 */
          }
        } else if (video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' });
            if (code?.data) value = code.data;
          }
        }
        if (value) {
          accept(value);
          return;
        }
      }
      timer = setTimeout(tick, 320);
    };

    (async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setStatus('blocked');
        setError('這個瀏覽器未支援相機。請用 Chrome 開啟（網址必須是 https://）。');
        return;
      }
      if (!window.isSecureContext) {
        setStatus('blocked');
        setError('相機只可以在 https:// 或 localhost 使用；請用部署後的網址。');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } catch (e) {
        setStatus('blocked');
        setError(
          e?.name === 'NotAllowedError'
            ? '未獲相機權限。請在網址列左邊的鎖頭→相機→允許，然後重新載入。'
            : '未能開啟相機，請確認沒有其他程式正在使用。',
        );
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      if (video) {
        video.srcObject = stream;
        try {
          await video.play();
        } catch {
          /* iOS 需要用戶手勢，下面有「重新啟動相機」 */
        }
      }
      if ('BarcodeDetector' in window) {
        try {
          detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        } catch {
          detector = null;
        }
      }
      setStatus('scanning');
      tick();
    })();

    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  return (
    <div className="scanpage">
      <header className="scanhead">
        <Link to="/" className="scanhead__back" aria-label="返回">
          <Icon name="back" size={18} />
        </Link>
        <div>
          <span className="eyebrow">LEADER MODE</span>
          <h1>掃描成員的紀錄冊</h1>
          <p>把鏡頭對準成員手機上的二維碼。唔需要名單、唔需要上網，掃邊個睇邊個。</p>
        </div>
      </header>

      <div className={`scanner scanner--${status}`}>
        <video ref={videoRef} className="scanner__video" playsInline muted autoPlay />
        <div className="scanner__frame" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>

        {status === 'starting' && (
          <div className="scanner__overlay">
            <Crest size={34} />
            <p>正在開啟相機…</p>
          </div>
        )}

        {status === 'blocked' && (
          <div className="scanner__overlay scanner__overlay--error">
            <Icon name="alert" size={26} />
            <p>{error}</p>
          </div>
        )}

        {status === 'scanning' && <p className="scanner__hint">將成員手機的二維碼放入框內</p>}
      </div>

      <div className="scanactions">
        <button
          className="btn btn--ghost"
          onClick={() => {
            setShowManual((v) => !v);
            setError('');
          }}
        >
          <Icon name="link" size={15} /> 貼上二維碼內容
        </button>
        <Link to="/forms" className="btn btn--ghost">
          <Icon name="seal" size={15} /> 生成申請表
        </Link>
      </div>

      {showManual && (
        <div className="scanmanual">
          <label>
            <span>如果相機用不到，可以請成員「複製內容」再貼到這裡（RB1… 開頭）</span>
            <textarea
              rows={4}
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="RB1.H4sIAAAAAAAA..."
            />
          </label>
          <button
            className="btn btn--primary"
            onClick={async () => {
              try {
                const payload = await decodePayload(manual);
                routePayload(payload);
              } catch (e) {
                setError(e.message || '未能讀取內容');
              }
            }}
          >
            讀取
          </button>
        </div>
      )}

      {error && status !== 'blocked' && <p className="form-error">{error}</p>}

      <p className="scanfoot">
        二維碼只包含成員今次剔選的內容，讀取後只會顯示在這部手機，不會上傳。
        <br />
        如需相片或全部簽名，請成員用「匯出備份」傳檔案。
      </p>
    </div>
  );
}

/* -------------------------------------------------------- 掃描後檢視 */

function toSnapshot(payload) {
  const member = { ...(payload.member || {}) };
  if (payload.photo) member.photo = payload.photo;
  return {
    member,
    include: { particulars: true },
    contact: payload.contact || null,
    training: !!payload.progress,
    progress: payload.progress || {},
    pages: payload.pages || {},
    summaries: payload.summaries || {},
    signatures: payload.signatures ? true : undefined,
    holderSignature: payload.holderSignature || null,
    endorsement: payload.signatures?.__endorsement || null,
    scouting: [],
    service: [],
    awards: [],
    expeditions: [],
    additional: [],
    renewals: [],
  };
}

export function ScanView() {
  const payload = readScan();

  if (!payload) {
    return (
      <div className="scanpage">
        <header className="scanhead">
          <Link to="/scan" className="scanhead__back" aria-label="返回掃描">
            <Icon name="back" size={18} />
          </Link>
          <div>
            <span className="eyebrow">LEADER MODE</span>
            <h1>未收到紀錄冊</h1>
            <p>
              請先掃描成員的二維碼。掃描成功後，這個畫面會顯示成員今次剔選的資料：個人資料、訓練進度、活動簡述及簽署。
              資料只留在這部手機，關閉瀏覽器即消失。
            </p>
          </div>
        </header>
        <Link to="/scan" className="btn btn--primary">
          <Icon name="qr" size={15} /> 去掃描
        </Link>
      </div>
    );
  }

  const snapshot = toSnapshot(payload);
  const received = TRANSFER_OPTIONS.filter((o) => (payload.sel || []).includes(o.key));
  const summaries = Object.entries(payload.summaries || {});

  return (
    <div className="scanview">
      <div className="scanview__bar">
        <Link to="/scan" className="btn btn--ghost btn--sm">
          <Icon name="back" size={14} /> 再掃一個
        </Link>
        <span className="scanview__title">
          {payload.member?.nameZh || '成員'} · 收到 {received.length} 組資料
        </span>
      </div>

      <div className="scanview__tags">
        {received.map((o) => (
          <span key={o.key} className={`scanview__tag${o.sensitive ? ' is-sensitive' : ''}`}>
            {o.label}
          </span>
        ))}
      </div>

      {summaries.length > 0 && (
        <section className="scanview__summaries">
          <h2>活動簡述 <em>Summaries</em></h2>
          <dl>
            {summaries.map(([key, value]) => (
              <div key={key}>
                <dt>{key.split('.')[0]}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <SignoffPanel payload={payload} />

      <SnapshotView
        snapshot={snapshot}
        createdAt={payload.at}
        views={0}
        flag="二維碼接收 · 唯讀"
        source="二維碼"
      />
    </div>
  );
}
