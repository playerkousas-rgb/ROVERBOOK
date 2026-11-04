import qrcode from 'qrcode-generator';

/** 由文字產生二維碼 SVG（純前端，毋須伺服器）。 */
export function qrSvg(text, { cell = 5, margin = 4, ecl = 'L' } = {}) {
  const qr = qrcode(0, ecl);
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: cell, margin, scalable: true });
}
