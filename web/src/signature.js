/**
 * 把墨跡（簽名或手寫）縮到指定大小並壓成單色（透明底），
 * 令存在瀏覽器的資料大幅縮細；預設 320×96（適合放入二維碼）。
 */
export function shrinkInk(dataUrl, { maxW = 320, maxH = 96 } = {}) {
  return new Promise((resolve) => {
    if (!dataUrl) return resolve(null);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(maxW / (img.width || 1), maxH / (img.height || 1), 1);
        const width = Math.max(1, Math.round((img.width || 1) * scale));
        const height = Math.max(1, Math.round((img.height || 1) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0, width, height);
        try {
          const frame = ctx.getImageData(0, 0, width, height);
          const px = frame.data;
          for (let i = 0; i < px.length; i += 4) {
            if (px[i + 3] > 90) {
              px[i] = 24;
              px[i + 1] = 26;
              px[i + 2] = 22;
              px[i + 3] = 255;
            } else {
              px[i + 3] = 0;
            }
          }
          ctx.putImageData(frame, 0, 0);
        } catch {
          /* 讀不到像素就用原圖縮細 */
        }
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}


/** 簽名：預設 320×96（回傳碼用）。 */
export function shrinkSignature(dataUrl, opts) {
  return shrinkInk(dataUrl, opts);
}

/** 相片：用 canvas 重新壓成 JPEG，避免 localStorage 被大圖撐爆。 */
export function shrinkPhoto(dataUrl, { maxW = 360, quality = 0.72 } = {}) {
  return new Promise((resolve) => {
    if (!dataUrl) return resolve(null);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxW / (img.width || 1));
        const width = Math.max(1, Math.round((img.width || 1) * scale));
        const height = Math.max(1, Math.round((img.height || 1) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
