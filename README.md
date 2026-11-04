# ROVERBOOK · 樂行童軍紀錄冊

把《樂行童軍紀錄冊》變成一本可以在手機上逐頁填寫、請領袖即場簽名、放進錢包的電子紀錄冊。

- **毋須登入**：沒有帳號、沒有密碼。紀錄冊就是你這部裝置上的一份資料。
- **像一本書**：封面、書脊、左右頁、頁碼、印章；不是儀表板。
- **可核實**：每個章節、每項訓練細項、每年續會都有領袖／主考簽名欄。
- **可分享**：自行勾選公開章節，產生二維碼或連結；隨時作廢。
- **可帶走**：Apple Wallet / Google Wallet pass、A4 列印、JSON 備份；可與 [ROVERBADGE](https://github.com/playerkousas-rgb/ROVERBADGE) 交換進度。

> 這是可運作的原型，並非香港童軍總會官方系統。章節結構參考《Rover Scout Record Book (v 20260727)》，訓練綱要對應 2026 第五版（32 項細項）。

---

## 1. 為何不是把紙本轉成 PDF

| | 紙本 / PDF | ROVERBOOK |
|---|---|---|
| 攜帶 | 整本 43 頁 | 一個網址，可加到主畫面 |
| 更新 | 印了不能改 | 即時更新，自動儲存在本機 |
| 簽署 | 手寫、蓋章 | 領袖在成員裝置上直接簽，附姓名、職位、日期 |
| 分享 | 整本交出去 | 逐章勾選，只給需要的部分 |
| 核實 | 翻到某一頁 | 掃二維碼即看到最新版本；舊連結可即時作廢 |
| 續會 | 每年一頁 | 每年一格，由團長簽署 |

PDF 匯出仍可用（瀏覽器列印 → A4），但它是**輸出**，不是產品本身。

## 2. 核心設計決定

1. **沒有帳號系統。** 卡片屬於使用者本人；資料存在瀏覽器 `localStorage`（key：`roverbook.book.v2`）。換機靠匯出／匯入 JSON 備份。
2. **分享是「快照」，不是即時授權。** 按「分享」時把勾選的章節打包成一份唯讀快照上載，取得 `id`、網址與 `deleteToken`。刪除金鑰只留在成員本機，所以只有成員可以作廢連結。
3. **簽名只留在本機。** 簽名是矢量筆跡（PNG data URL）＋姓名／職位／日期，存於紀錄冊；只有成員選擇分享「簽署及旅印」時才會出現在分享頁。
4. **沒有家長同意、沒有 18 歲限制。** 與實體紀錄冊一致。
5. **ROVERBADGE 各自獨立。** 兩個系統可單獨使用；同時使用時只交換「YMIS + 項目日期」，不交換簽名。

## 3. 功能

**紀錄冊（12 章）**
1. 目錄 — 章節、頁碼、進度／會籍摘要
2. 個人資料 — 相片、中英文姓名、會員編號、YMIS、聯絡方法、緊急聯絡人、持有人簽署
3. 旅部資料 — 主辦機構、旅長、團長、集會地點、旅印示意
4. 童軍紀錄 — 由小童軍到樂行童軍的每一段（可加行）
5. 會員資格 — 每年一格，有效期至 12 月 31 日，團長簽署；自動顯示目前會籍是否有效
6. 服務紀錄 — 崗位、期間、委任人、核實簽署
7. 獎章及獎勵 — 名稱、日期、頒發機構、頒授簽署
8. 訓練計劃 — 四項漸進獎章、32 項細項；逐項日期 + 主考簽署；整枚獎章的頒授日期與領袖簽署
9. 遠足及海外活動
10. 其他經驗
11. 簽署及聲明 — 持有人聲明、領袖核實（姓名／職位／日期／簽名）、旅印
12. 數位附錄 — 本機儲存資訊、備份、分享二維碼、錢包、ROVERBADGE 旅團編號、清除資料

**其他**
- 分享對話框：11 組內容獨立勾選，警告聯絡資料外洩風險，更新即輪換連結
- 錢包：Apple Wallet（`.pkpass`）、Google Wallet（save URL）、PWA「加到主畫面」
- 列印：A4、隱藏操作介面、左右頁自動分頁
- 示範資料：選單 →「載入示範紀錄冊」（林卓瑤，21/32 項，含已簽名紀錄）

## 4. 快速開始

```bash
npm install
npm run dev          # http://localhost:3001 （綁 0.0.0.0）
npm run smoke        # 另開終端；29 項 jsdom + API 測試
npm run build        # 輸出 dist/
npm start            # NODE_ENV=production，伺服器直接服務 dist/ + SPA fallback
```

環境變數：`PORT`（預設 3001）、`PUBLIC_BASE_URL`（反代後對外網址，用於分享連結與 Wallet pass）。

## 5. 專案結構

```
server/
  index.js       express + Vite middleware（dev）／靜態 dist（prod）
  api.js         /api/share、/api/qr.svg、/api/wallet/*
  store.js       分享快照儲存（data/shares.json，只存 hash 過的刪除金鑰）
  wallet.js      Apple / Google pass 產生與 walletStatus()
  assets/wallet/ pass 圖檔（icon、logo、strip）
shared/
  book.js        資料模型、統計、分享快照、ROVERBADGE 匯入匯出、demoBook()
  syllabus.js    2026 第五版綱要：4 獎章 / 14 段 / 32 細項
web/
  index.html     manifest、PWA icon、theme
  src/App.jsx    路由與頂欄、章節對應
  src/pages/     12 章 + Welcome + SharedBook（唯讀分享頁）
  src/components/ Ink（簽名）、Paper（書頁／目錄／封面）、Edit（欄位）、三個對話框
  src/styles.css 紙本裝訂視覺、響應式、列印樣式
scripts/
  smoke.mjs      煙霧測試
  make-wallet-assets.mjs  由幾何 SVG 產生 pass 圖（sharp）
```

## 6. API

| Method | Path | 說明 |
|---|---|---|
| `POST` | `/api/share` | body `{snapshot}` → `{id, path, url, deleteToken, createdAt}`；缺 `snapshot.member` 回 400 |
| `GET` | `/api/share/:id` | → `{id, snapshot, createdAt, views}`；每次瀏覽 `views+1`；不存在 404 |
| `DELETE` | `/api/share/:id` | body／query `deleteToken`；錯誤 403、不存在 404 |
| `GET` | `/api/qr.svg?d=` | SVG 二維碼（深綠 `#123f33`、透明底） |
| `GET` | `/api/wallet/status` | 各平台是否已配置、缺少哪些環境變數、設定步驟 |
| `GET` | `/api/wallet/preview/:id` | 產生 pass JSON 預覽 |
| `POST` | `/api/wallet/apple` | `{id}` → `.pkpass`；未配置回 501 + `missing`／`steps` |
| `POST` | `/api/wallet/google` | `{id}` → `{saveUrl}`；未配置回 501 |
| `GET` | `/healthz` | `{ok:true}` |

分享快照的 11 組欄位：`particulars`、`contact`、`group`、`scouting`、`training`、`service`、`awards`、`expeditions`、`additional`、`renewals`、`signatures`。未勾選的 `contact` 會在伺服器端直接清空（不是只在前端隱藏）。

## 7. 錢包設定（選用）

沒有憑證時，App 仍可正常使用；按「加入錢包」會顯示缺少哪幾個變數（HTTP 501），不會假裝成功。

**Apple Wallet**
1. Apple Developer → Pass Type IDs 建立（例：`pass.hk.roverbook.card`）
2. 下載 Pass 憑證與 Apple WWDR，匯出 `.p12`
3. 設定環境變數：

```
APPLE_PASS_TYPE_ID=pass.hk.roverbook.card
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_PASS_CERT_P12=/path/to/signerCert.p12
APPLE_PASS_CERT_PASSWORD=********
APPLE_WWDR_P12=/path/to/wwdr.p12
PUBLIC_BASE_URL=https://your.domain
```

**Google Wallet**
1. Google Wallet Business Console 取得 Issuer ID、建立 Generic Class
2. 建立服務帳戶並下載 JSON

```
GOOGLE_WALLET_ISSUER_ID=33880000000xxxxxxx
GOOGLE_WALLET_SA_JSON=/path/to/service-account.json
GOOGLE_WALLET_CLASS_ID=your.class.id
```

pass 只包含姓名、團籍、會員有效日期與分享連結／二維碼，不含完整紀錄。

## 8. 與 ROVERBADGE 互通

- 項目編號相同（`L1-…` 至 `L4-…`），所以兩邊的進度可以直接對照。
- **匯出**：訓練頁或選單 →「匯出進度」，產生 ROVERBADGE 相容 JSON（`progress` / `progress_mock`、`members`，附旅團編號）。
- **匯入**：接受 ROVERBADGE 的 `progress_mock`、單一成員進度表，或 `{項目ID: 日期}`。會先比對 YMIS，再比對姓名，最後才取第一位成員。
- 匯入**不會覆寫**本機已有日期與簽名；來源項目會標示 `ROVERBADGE` 標籤。
- 兩個系統可獨立運作，不需要同時安裝。

## 9. 已知限制

- 資料在 `localStorage`：清除瀏覽器資料會失去紀錄冊，請定期匯出備份（附錄頁有按鈕）。
- 分享快照存放於伺服器 `data/shares.json`，是**建立當刻**的副本；更新內容會產生新連結（舊連結失效，這是刻意的）。
- 沒有端到端加密；不要在分享內容勾選不必要的聯絡資料。
- 簽名以圖片儲存，不是合規格的數碼簽章（沒有 PKI）。
- 綱要為 2026 第五版；如總會更新綱要，請以官方文件為準。

## 10. 煙霧測試涵蓋

`npm run smoke`：新用戶封面、12 章渲染、新增服務並自動儲存、勾選訓練項目、分享對話框建立連結、分享 API（POST／GET／403／DELETE／404）、公開分享頁、失效連結頁、QR SVG、Wallet status／501 分支／pass JSON、`/healthz`。

---

非香港童軍總會官方產品。紀錄冊內容與簽名由使用者自行負責；正式用途請配合領袖核實與官方文件。
