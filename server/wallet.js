// Apple / Google Wallet pass 產生器。
// 需要商戶憑證（Apple Developer Pass Type ID / Google Wallet Issuer）才可簽發；
// 未設定時回傳清楚嘅設定指引，介面會顯示「未連接」。

import { PKPass } from 'passkit-generator';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSET_DIR = path.join(__dirname, 'assets', 'wallet');

const asset = (name) => fs.readFileSync(path.join(ASSET_DIR, name));

const APPLE_KEYS = ['APPLE_PASS_TYPE_ID', 'APPLE_TEAM_ID', 'APPLE_PASS_CERT_P12', 'APPLE_PASS_CERT_PASSWORD', 'APPLE_WWDR_P12'];
const GOOGLE_KEYS = ['GOOGLE_WALLET_ISSUER_ID', 'GOOGLE_WALLET_SA_JSON', 'GOOGLE_WALLET_CLASS_ID'];

export function walletStatus() {
  const appleMissing = APPLE_KEYS.filter((k) => !process.env[k]);
  const googleMissing = GOOGLE_KEYS.filter((k) => !process.env[k]);
  return {
    publicBaseUrl: process.env.PUBLIC_BASE_URL || null,
    apple: {
      configured: appleMissing.length === 0,
      missing: appleMissing,
      passTypeId: process.env.APPLE_PASS_TYPE_ID || null,
      steps: [
        'Apple Developer → Certificates, Identifiers & Profiles → Pass Type IDs（例：pass.hk.roverbook.card）',
        '建立對應的 Pass Type ID 憑證並匯出 .p12（設定密碼）',
        '下載 Apple WWDR 中繼憑證 .p12',
        '設定環境變數：APPLE_PASS_TYPE_ID、APPLE_TEAM_ID、APPLE_PASS_CERT_P12（base64）、APPLE_PASS_CERT_PASSWORD、APPLE_WWDR_P12（base64）',
      ],
    },
    google: {
      configured: googleMissing.length === 0,
      missing: googleMissing,
      issuerId: process.env.GOOGLE_WALLET_ISSUER_ID || null,
      steps: [
        'Google Wallet Business Console 申請 Issuer（取得 Issuer ID）',
        '建立服務帳戶並啟用 Google Wallet API，下載 JSON 金鑰',
        '建立 Generic Class（例：<issuer>.roverbook_card）',
        '設定環境變數：GOOGLE_WALLET_ISSUER_ID、GOOGLE_WALLET_CLASS_ID、GOOGLE_WALLET_SA_JSON（base64）',
      ],
    },
  };
}

function memberSummary(snapshot) {
  const m = snapshot.member || {};
  const done = Object.values(snapshot.progress || {}).filter((p) => p?.date).length;
  const awards = Object.entries(snapshot.badges || {})
    .filter(([, v]) => v?.date)
    .map(([k]) => ({ L1: '會員章', L2: '樂行童軍肩章', L3: '樂行童軍獎章', L4: '貝登堡獎章' })[k])
    .filter(Boolean);
  const lastRenewal = [...(snapshot.renewals || [])].sort((a, b) => String(b.year).localeCompare(String(a.year)))[0];
  return {
    name: m.nameZh || '樂行童軍',
    nameEn: m.nameEn || '',
    crew: m.crew || '',
    group: m.group || '',
    memberNo: m.memberNo || m.ymis || '',
    validUntil: lastRenewal?.validUntil || '',
    progress: `${done} / 32`,
    awards: awards.join('、') || '尚未獲頒',
    phone: m.phone || '',
    email: m.email || '',
  };
}

export function buildPassJson({ snapshot, shareUrl, serial }) {
  const s = memberSummary(snapshot);
  return {
    formatVersion: 1,
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID || 'pass.hk.roverbook.card',
    teamIdentifier: process.env.APPLE_TEAM_ID || 'TEAMID',
    organizationName: 'ROVERBOOK 樂行童軍紀錄冊',
    serialNumber: serial,
    description: `${s.name} 的樂行童軍紀錄卡`,
    logoText: '樂行童軍紀錄冊',
    backgroundColor: 'rgb(13, 52, 42)',
    foregroundColor: 'rgb(247, 243, 230)',
    labelColor: 'rgb(216, 184, 113)',
    generic: {
      headerFields: [{ key: 'name', label: '姓名 NAME', value: s.name }],
      primaryFields: [{ key: 'crew', label: '團籍 CREW', value: s.crew || '—' }],
      secondaryFields: [
        { key: 'memberNo', label: '會員編號 NO.', value: s.memberNo || '—' },
        { key: 'valid', label: '會籍有效至 VALID', value: s.validUntil || '—' },
      ],
      auxiliaryFields: [
        { key: 'progress', label: '訓練進度', value: s.progress },
        { key: 'awards', label: '獎章', value: s.awards },
      ],
      backFields: [
        { key: 'about', label: '關於這張卡', value: '由 ROVERBOOK 產生。卡片內容由成員在本機維護，分享範圍由成員決定；此二維碼只連到你分享的紀錄。' },
        { key: 'contact', label: '緊急聯絡', value: s.phone ? `${s.phone}` : '成員未分享' },
        { key: 'revoke', label: '收回', value: '成員可以隨時在 ROVERBOOK 更換或刪除分享連結，此卡上的二維碼便會失效。' },
        { key: 'source', label: '資料來源', value: 'ROVERBOOK · 樂行童軍電子紀錄冊（非香港童軍總會官方產品）' },
      ],
    },
    barcode: {
      format: 'PKBarcodeFormatQR',
      message: shareUrl,
      messageEncoding: 'iso-8859-1',
      altText: 'ROVERBOOK',
    },
    barcodes: [
      {
        format: 'PKBarcodeFormatQR',
        message: shareUrl,
        messageEncoding: 'iso-8859-1',
        altText: 'ROVERBOOK',
      },
    ],
  };
}

export async function buildApplePass({ snapshot, shareUrl, serial }) {
  const certificates = {
    wwdr: Buffer.from(process.env.APPLE_WWDR_P12, 'base64'),
    signerCert: Buffer.from(process.env.APPLE_PASS_CERT_P12, 'base64'),
    signerKey: Buffer.from(process.env.APPLE_PASS_CERT_P12, 'base64'),
    signerKeyPassphrase: process.env.APPLE_PASS_CERT_PASSWORD,
  };
  const passJson = buildPassJson({ snapshot, shareUrl, serial });
  const pass = new PKPass(
    {
      'icon.png': asset('icon.png'),
      'icon@2x.png': asset('icon@2x.png'),
      'icon@3x.png': asset('icon@3x.png'),
      'logo.png': asset('logo.png'),
      'logo@2x.png': asset('logo@2x.png'),
      'pass.json': Buffer.from(JSON.stringify(passJson)),
    },
    certificates,
  );
  return pass.getAsBuffer();
}

export function buildGoogleObject({ snapshot, shareUrl, objectId }) {
  const s = memberSummary(snapshot);
  const base = process.env.PUBLIC_BASE_URL;
  const logoUri = base ? `${base}/assets/wallet/logo.png` : undefined;
  return {
    id: objectId,
    classId: objectId.split('.').slice(0, 2).join('.'),
    genericType: 'GENERIC_TYPE',
    state: 'ACTIVE',
    cardTitle: { defaultValue: { language: 'zh-Hant', value: '樂行童軍紀錄冊' } },
    header: { defaultValue: { language: 'zh-Hant', value: s.name } },
    subheader: { defaultValue: { language: 'zh-Hant', value: s.crew || '樂行童軍' } },
    hexBackgroundColor: '#0d342a',
    ...(logoUri ? { logo: { sourceUri: { uri: logoUri } } } : {}),
    textModulesData: [
      { id: 'memberNo', header: '會員編號', body: s.memberNo || '—' },
      { id: 'valid', header: '會籍有效至', body: s.validUntil || '—' },
      { id: 'progress', header: '訓練進度', body: s.progress },
      { id: 'awards', header: '獎章', body: s.awards },
    ],
    barcode: { type: 'QR_CODE', value: shareUrl, alternateText: 'ROVERBOOK' },
    heroImage: logoUri ? { sourceUri: { uri: logoUri } } : undefined,
  };
}

export function buildGoogleSaveUrl({ snapshot, shareUrl, serial }) {
  const sa = JSON.parse(Buffer.from(process.env.GOOGLE_WALLET_SA_JSON, 'base64').toString('utf8'));
  const issuer = process.env.GOOGLE_WALLET_ISSUER_ID;
  const classId = process.env.GOOGLE_WALLET_CLASS_ID || 'roverbook_record';
  const objectId = `${issuer}.${classId}_${String(serial).replace(/[^a-zA-Z0-9_]/g, '')}`;
  const genericObject = buildGoogleObject({ snapshot, shareUrl, objectId });
  const origins = process.env.PUBLIC_BASE_URL ? [process.env.PUBLIC_BASE_URL] : [];
  const claims = {
    iss: sa.client_email,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    ...(origins.length ? { origins } : {}),
    payload: { genericObjects: [genericObject] },
  };
  const token = jwt.sign(claims, sa.private_key, { algorithm: 'RS256' });
  return { saveUrl: `https://pay.google.com/gp/v2/save/${token}`, genericObject };
}
