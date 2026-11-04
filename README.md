# ROVERBOOK · 樂行童軍紀錄冊

一本藍色布面、可以逐頁填寫的電子紀錄冊。整個畫面就是封面，翻開後每一章是一頁紙；
點一下任何一行就可以打字，字多會自動縮小，也可以放大輸入。領袖可即場簽名。

- **毋須登入**：沒有帳號、沒有密碼，資料留在你這部裝置。
- **版面即紀錄冊**：15 頁，次序跟紙本紀錄冊的章節；A4 比例，可列印。
- **點擊即寫**：每條線／每一格都可以直接輸入，字體自動縮到格內；右上角「放大」可整頁放大，每格亦有放大輸入。
- **可核實**：每個訓練細項、服務、獎章、續會都有領袖／主考簽名。
- **可分享**：自選章節，生成二維碼或連結；隨時作廢。
- **可帶走**：Apple / Google Wallet pass、A4 列印、JSON 備份、ROVERBADGE 進度交換。

> 原型示範，非香港童軍總會官方系統。章節次序參考《Rover Scout Record Book》；
> 訓練綱要對應 2026 第五版（32 細項）。

---

## 1. 頁面（每頁 = 紀錄冊一頁）

| 頁 | 內容 | 主要欄位 |
|---|---|---|
| 封面 | 藍布面、燙金 | 持有人、團籍、年份 |
| 1 | 個人資料 | 相片、姓名、會員編號、YMIS、聯絡、緊急聯絡人、持有人簽署 |
| 2 | 旅部資料 | 主辦機構、旅長、團長、集會地點、旅印 |
| 3 | 童軍紀錄 | 小童軍 → 樂行童軍各階段 |
| 4 | 會員資格 | 每年一格、有效期至 12 月 31 日、團長簽署 |
| 5 | 服務紀錄 | 崗位、期間、委任人、核實簽署 |
| 6 | 獎章及獎勵 | 名稱、日期、機構、頒授簽署 |
| 7 | 會員章 | 13 項（ACT／UND／ETQ／PRM／CP） |
| 8 | 樂行童軍肩章 | 啟導（INTRO） |
| 9 | 樂行童軍獎章（一） | 準領袖、童軍技能、服務 |
| 10 | 樂行童軍獎章（二） | 國際視野、興趣技能、身心健康、挑戰 |
| 11 | 貝登堡獎章 | 七項全部 |
| 12 | 遠足及海外活動 | 時段、項目、描述 |
| 13 | 其他經驗 | 時段、項目、描述 |
| 14 | 簽署及聲明 | 聲明、持有人簽署、領袖核實、旅印 |
| 15 | 數位附錄 | 備份、分享、ROVERBADGE、錢包、清除資料 |

合共 15 頁（頁碼顯示「第 n 頁」及底部章節名）。目錄是覆蓋式抽屜，不佔頁數。

> 我未能從你的 Google Drive 找到 `Rover Scout Record Book (v 20260727).pdf`（只找到訓練綱要 PDF），
> 所以頁面是按紀錄冊章節重建。你上載 PDF 或逐頁截圖後，可再逐頁對齊原文、表格位置與頁數。

## 2. 填寫方式（第 3 點）

- **點一下**任何底線／方格 → 即刻變成輸入框，可以打字；失焦即儲存。
- **自動縮字**：字數超出格線時字體會逐步縮小（最小 7px），保持一行／固定高度，不會撐爆版面。
- **放大**：
  - 每格右上角有「⤢」按鈕 → 彈出大字輸入框（Enter 完成、Esc 取消）。
  - 右上角「放大」→ 整頁放大 1.4 倍，可左右／上下捲動查看細節。
- **手寫**：簽名欄（持有人、領袖、主考、續會）用簽名板，支援手指／觸控筆、壓感線寬、復原、清除；連姓名、職位、日期。
- 每次修改自動儲存（localStorage：`roverbook.book.v2`）。

## 3. 分享與私隱

11 組內容逐項勾選，建立唯讀快照（`/v/:id`）＋二維碼；刪除金鑰留在本機，只有成員可作廢連結。
更新內容會產生新連結，舊連結即時失效。未勾選的聯絡資料會在伺服器端清空。

## 4. 錢包（第 5 點：你其實唔需要寫程式）

Wallet 卡只包含姓名、團籍、會籍至、二維碼。有三條路，任選一條：

**A. 今日就用（零成本）**
iPhone Safari → 分享 → 加入主畫面；Android Chrome → 安裝應用程式。開啟速度同 App 一樣，毋須憑證。

**B. Apple Wallet（需要付費開發者帳戶）**
Apple 規定任何 Wallet pass 都要用 Pass Type ID 憑證簽名，所以一定要 Apple Developer Program（個人名義，年費約 US$99）。
步驟：建立 Pass Type ID → 下載 `.p12` → 連同 Apple WWDR 憑證放上伺服器 → 設 5 個環境變數 → 重啟。
App 內「錢包」對話框已寫明每一步，並會顯示「欠幾多項」。

**C. Google Wallet（免費）**
Google Wallet Business Console 取得 Issuer ID（免費）→ 建 Generic Class → 建服務帳戶 JSON → 設 3 個環境變數 → 重啟。

未設定時，按「加入錢包」會回 501 並列出缺少哪幾個變數（不會假裝成功）。

```
# Apple
APPLE_PASS_TYPE_ID=pass.hk.yourname.roverbook
APPLE_TEAM_ID=XXXXXXXXXX
APPLE_PASS_CERT_P12=/path/signerCert.p12
APPLE_PASS_CERT_PASSWORD=********
APPLE_WWDR_P12=/path/wwdr.p12
# Google
GOOGLE_WALLET_ISSUER_ID=33880000000xxxxxxx
GOOGLE_WALLET_SA_JSON=/path/service-account.json
GOOGLE_WALLET_CLASS_ID=your.class.id
# 對外網址
PUBLIC_BASE_URL=https://your.domain
```

## 5. 與 ROVERBADGE 互通

同一套 `L1…L4` 項目編號。訓練頁或附錄可匯出 ROVERBADGE 相容 JSON（`progress` / `progress_mock`）；
匯入時先配 YMIS、再配姓名，不會覆寫本機已有的日期與簽名。只交換「項目 + 日期」，不交換簽名。

## 6. 開始使用

```bash
npm install
npm run dev      # http://localhost:3001
npm run smoke    # 39 項：封面、15 頁、填寫／放大、分享、API、Wallet 501
npm run build && npm start
```

環境變數：`PORT`（預設 3001）、`PUBLIC_BASE_URL`。

## 7. 結構

```
server/   index.js（Vite/靜態）、api.js（share/QR/wallet）、store.js、wallet.js
shared/   book.js（模型、SECTIONS、分享快照、ROVERBADGE、demoBook）、syllabus.js（32 項）
web/src/  App.jsx（封面／翻頁／目錄）、components/{Write,Ink,Paper,Edit,...}.jsx
          pages/ 15 頁 + Welcome + SharedBook、styles.css（藍布面＋紙頁＋列印）
scripts/  smoke.mjs、make-wallet-assets.mjs
```

## 8. 已知限制

- 資料在 localStorage；清除瀏覽器資料會失去，請定期匯出備份。
- 自動縮字是版面效果，不是無限容量：極長文字仍建議用放大輸入查看。
- 分享快照是建立當刻的副本；更新會換新連結。
- 簽名是筆跡圖像，不是 PKI 數碼簽章。
- 綱要為 2026 第五版，官方更新時請自行核對。

---

非香港童軍總會官方產品。
