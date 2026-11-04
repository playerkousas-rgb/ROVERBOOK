/**
 * 把簽名墨跡縮成適合放入二維碼的大小：等比縮至 320×96 以內，
 * 並壓成單色（透明底），令 PNG 大幅縮細。
 */
export function shrinkSignature(dataUrl, { maxW = 320, maxH = 96 } = {}) {
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
