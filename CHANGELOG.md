# Changelog · ROVERBOOK 樂行童軍紀錄冊

## v2.4.0 (2026-11-26)

### 新增（Added · 指定入口白名單 Store Gate，對齊同系列支部紀錄冊）

- **頂層跳板 `entry-gate`**：原樣複製治理真理倉 `playerkousas-rgb/readme` @ `6ebfdd72a1ea5a5e83df4a6644fc66d0236df98e` 的 `templates/vercel/store_gate_v1.0.js` 至 `web/public/store_gate_v1.0.js`（與其他支部紀錄冊同一份檔，md5 `4f06c205…`，不在地修改閘邏輯），只在 `web/index.html` 的 `<head>`（緊接 `<meta charset>`、`<title>` 之前）以 `initStoreGate()` 傳入 ROVERBOOK 設定：`appKey: 'roverbook'`、`mode: localDev ? 'open' : 'entry-gate'`、`portalIds: ['appstore']`、`silentPortalIds: ['member']`、`allowStandalone: true`、`autoRedirectSeconds: 0`。本機 `localhost`／`127.0.0.1`／`[::1]` 自動改用 `open`，`npm run dev` 不會被自己的閘擋住；Vercel Production／Preview 照行 `entry-gate`。
- **放行規則**：**唯一公開入口是 SCOUT APP STORE**（同時是「落架開關」——日後在 APP STORE 落架，普通人就沒有入口，直開網址只會見到白名單卡；已裝主畫面用家照用，避免失去更新／匯出）。成員系統是**唯一例外**：本身公開並已內置四本紀錄冊，所以 `Referer` 照樣放行，但**卡上永不顯示、不畫掣**，免得例外變成公開後門。通告圖書館、區管理系統、GEMINI 一律不放行。由 APP STORE 進入會在本分頁記住通行（`sessionStorage['roverbook.store_pass']`）；直接開網址的新工作階段顯示治理倉預設文案白名單卡，只有一粒「前往 APP STORE」按鈕，**不**自動跳轉。
- **分享連結同樣經閘（用戶定案 2026-11-26）**：`/v/<id>` 唯讀分享頁與其他支部紀錄冊一致，收件人先經 APP STORE 進入才看得到已分享章節；分享功能、`deleteToken` 作廢機制、`#v=` 片段傳輸全部不變。
- **不用 `iframe-only`**：BOOK 有本機長期儲存與 PWA，屬 SG2 禁區（iframe 內儲存分家、會踢走已裝主畫面的用家）。`frame-ancestors` 服務平台嵌入白名單（ADR 見 README「白名單系統」）**維持不變**，兩個白名單並存。
- **啟動與離線**：`web/src/main.jsx` 只在 `document.documentElement` 沒有 `data-store-gated` 時才掛載 React 及註冊 PWA（避免先閃紀錄冊或裝出打不開的圖示）；`web/public/sw.js` 把 `/store_gate_v1.0.js` 放入 `SHELL` 並以 cache-first 提供（離線一樣判斷得到入口）；`vercel.json` 的 SPA rewrite 明確排除該檔（連同 `/assets/`、`/icons/`、`/img/`、`/sw.js`、`/manifest.webmanifest`、`favicon*`），避免被吞成 `index.html`。
- **讚好／收藏（SG18）**：新增 `web/src/components/StoreSupport.jsx`，頂欄及歡迎頁各放一次，只以 `ScoutStoreGate.getAppStoreUrl('roverbook')` 開新分頁返回 APP STORE 詳情卡（slug 對照主站 migration `20261116-app-slug-seed.sql`：`roverbook.vercel.app → roverbook`）；零寫死網址、不直連主站資料庫、不複製任何密鑰；讀不到閘腳本時整粒掣隱藏，列印時隱藏，細螢幕只留心形圖標。因為已有常駐回跳掣，**不開** `supportNudge`（免得同一用家被騷擾兩次）。

### 文件（Docs）

- 新增 [`docs/adr/0006-entry-gate-whitelist.md`](docs/adr/0006-entry-gate-whitelist.md)：記錄決策、與 `frame-ancestors` 嵌入白名單的分工（「被誰嵌入」vs「由哪裡開啟」）、落架開關及如實限制——**設計目標是擋一般用家（誤傳連結／舊書籤／搜尋結果），不是擋技術人員**：改 `sessionStorage`、偽造 `Referer` 或自動化瀏覽器都繞得過，屬已知並接受，因此不另加後端驗票或反調試；`/api/leader`（`LEADER_CODE`）與 `/api/roverbadge` 不受此閘保護。
- `README.md` 新增「指定入口白名單（Store Gate）」一節（逐情況放行表、私隱與限制、離線及舊連結、分享連結、落架與關站方法），並補上正式網址 `canonical`。
- 白名單卡沿用治理倉預設文案（SG19 簡短人話版），與其他紀錄冊一致，**不**加 `customTitle`／`customMessage`。

### 測試（Tests）

- 新增 `tests/store_gate.test.mjs`（62 項）並加入 `npm test`：入口來源精確比對（含 `scoutappstore.vercel.app.evil.com` 前綴偽造、圖書館／區管理系統／GEMINI 攔截）、靜默放行與工作階段通行、主畫面豁免、`sessionStorage` 被封鎖時仍可進入但重整要再經入口、攔截卡只有一粒 APP STORE 按鈕且遮罩不露出底層、卡片文案＝治理倉預設、閘檔案位置（`<meta charset>` 之後、`<title>` 之前）、SW 預快取與 cache-first、SPA rewrite 排除、`main.jsx` 啟動守衛、`frame-ancestors` 不變、SG18 slug 與列印隱藏，以及「閘檔案保持治理倉原樣」與文件如實交代限制。
- 以 jsdom 按真實 `index.html` ＋ 閘腳本實測 7 種情境：直開網址、開啟 `/v/<id>` 分享連結、已裝主畫面、由 APP STORE 進入、由成員系統進入（靜默放行）、由圖書館進入、本機 `localhost`（自動 `open`）——結果與上述放行表完全一致。
- 版本號同步升至 `v2.4.0`：`package.json`、`package-lock.json`、`shared/book.js` `APP_VERSION`、`web/index.html` meta／`window.APP_VERSION`、Service Worker 快取 `SW_VERSION` / `VERSION = 'v8'`；`tests/demo_book.test.mjs`、`tests/ui_contracts.test.mjs` 的版號斷言同步更新。

## v2.3.0 (2026-11-26)

### 嵌入白名單系統（iframe embed whitelist）

- **單一真相**：`shared/embed.js` 新增 `EMBED_WHITELIST`（預設只含正式服務平台 `https://member-portal-sigma-swart.vercel.app`）、`normalizeEmbedOrigin`／`parseEmbedWhitelist`／`buildFrameAncestors`／`isOriginAllowed` 等純函式；`FRAME_ANCESTORS` 改由白名單推導（向後兼容）。只接受 https 來源（路徑自動剝除），拒絕萬用字元、帳密、非 http(s) scheme 與 `null`；`http://localhost`／`127.0.0.1` 只在非 Vercel 開發環境或 `ROVERBOOK_PROXY_TEST=1` 自架測試容許。
- **自架伺服器即時生效**：`server/whitelist.js` 合併預設清單 + 環境變數 `EMBED_WHITELIST`（逗號／分號／空白分隔，不合格項目剔除並報告）；`server/index.js` 新增全站安全標頭中介層，把由白名單推導的 CSP `frame-ancestors`、`X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy` 套到每個回應（包括靜態檔與 Vite dev）——自架部署首次與 Vercel 有同一套嵌入管制。啟動時印出生效白名單。
- **Vercel 部署烤同步**：`scripts/sync-embed-headers.mjs`（`npm run sync:embed`，另支援 `-- --check`）把 `shared/embed.js` 白名單烤入 `vercel.json` 全站 CSP；Vercel 靜態標頭在部署時讀取，故 `VERCEL=1` 時不讀 `EMBED_WHITELIST`，API 與 CSP 保持一致，避免「API 話得、CSP 唔俾」。
- **公開查詢 API**：`api/embed.js`（Vercel Serverless + Express 同一處理器）——`GET /api/embed` 回傳生效白名單、CSP 值、iframe allow 契約與管理提示；`GET /api/embed?origin=…`／`POST /api/embed { origin }` 核實來源是否獲准嵌入；只讀不寫、零金鑰、零個人資料，其餘方法 405。`vite.config.js` 獨立 dev/preview 亦掛載同一 API 與標頭。
- **介面**：數位附錄新增「嵌入白名單 · 服務平台」卡（`EmbedWhitelistCard`）——生效清單（正式平台／環境變數追加／預設徽章）、複製 CSP 與平台 iframe 範例、即場核實任何來源、離線自動退回內建預設；平台內開啟時 `EmbedWelcomeNote` 經 `document.referrer` 顯示嵌入來源並標示「已在白名單」（標頭未同步時提出警告）。新增 `web/src/embedWhitelist.js` 橋接與 `.embedwl__*` 樣式；補回 `.no-print` 的列印隱藏定義。
- **文件與測試**：README「服務平台 iframe 嵌入（白名單系統）」整節重寫（管理方法、驗證規則、API、指令），`.env.example` 新增 `EMBED_WHITELIST`；新增 `tests/embed_whitelist.test.mjs`（純函式、環境變數合併、Vercel／本機門檻、API、烤同步冪等與漂移修復、接線與文件合約）並加入 `npm test`。
- **版本同步修正**：版號升至 `2.3.0`／`v2.3.0`，Service Worker 快取升至 `v7`；`shared/book.js` 新增 `SW_VERSION` 作單一真相，`demo_book`／`ui_contracts` 測試與 `smoke.mjs` 改由它核對（修正 smoke 殘留的 `v5` 硬編碼漂移）。

### ROVERBADGE 服務紀錄同步修復（原未發布項）

- **修復 ROVERBADGE 服務紀錄同步／匯入後在 BOOK 看不到**：上游 `action: 'load'` 本身不含服務紀錄，`api/roverbadge.js` 的 `load` 現同步另呼叫上游 `getServiceRecords`（`{ token, target_ymis }`），失敗時安全降級為 `[]`；清洗時剔除 `status === 'rejected'`，只保留 `id / activity / date / hours / place`（零個人資料）附於回應 `serviceRecords`。`shared/book.js` 的 `importFromRoverBadge` 將其寫入本冊 `book.service` 服務紀錄供檢視，以 `badgeRecordId` 及 `date|活動名稱` 去重且不覆寫本機手寫行，並回傳 `serviceImported`；同步卡提示會顯示已錄入服務紀錄筆數。BOOK 為檢視端：服務紀錄只作 BADGE → BOOK 唯讀匯入，BOOK → BADGE 的寫入仍只經「待領袖核實（pending）」，須領袖在 BADGE 內 CONFIRM；客戶端直接呼叫 `getServiceRecords` 仍為 403。

## v2.2.1 (2026-11-14)

- 全站設定 `Content-Security-Policy: frame-ancestors 'self' https://member-portal-sigma-swart.vercel.app`，只允許 ROVERBOOK 自身及正式服務平台嵌入；保留相機 `Permissions-Policy`。
- 嵌入模式加入分割儲存、備份還原及 Safari 限制提示；選單可開啟獨立版，已有紀錄冊可直接匯出備份。
- 相機掃描、完整備份／還原及 Service Worker 離線功能維持；快取升至 `v6`，加入 iframe 部署合約測試。

## v2.2.0 (2026-11-12)

### 紙本頁碼全面校正（以官方《Rover Scout Record Book v20260727》為唯一依據）

- **封面不再當作第 1 頁**：官方封面不印頁碼，本版改為「封面（不計頁碼）+ 內頁印刷頁 1–42 = 43 張紙」，PDF 張次 = 印刷頁 + 1。SECTIONS 的 `page`（印刷頁）與 `sheet`（PDF 張次）分開，`PAGE_TOTAL = 42`、`SHEET_TOTAL = 43` 由資料自動計算，不再硬編碼。
- **修正沿用其他 BOOK 專案的頁數／文案**：App 目錄、Contents 說明、PrintBook 列印頁、MenuDialog 列印選單、Paper 頁眉全部改用同一組常數；刪除殘留的「41 頁」、「43 頁」、「1–43」等不一致文案。
- **目錄補齊**：Contents 現在列出所有內頁（包括第 41 頁誓詞及第 42 頁徽章參考頁），並新增自動回歸測試防止漏頁／重複。
- **表格行數照官方 PDF 重校**：會員資格改為第 7 頁 5 行＋第 8 頁 6 行（共 11 行，原先錯為 5＋5）；服務紀錄由 7 行改回 6 行；遷移地址由 3 行改回 5 行；會員章活動由 3 行改回 4 行；遠足及海外活動兩頁均為 12 行。所有行數集中於 `PAGE_ROWS`，並由測試守住。
- **列印頁眉**：內頁印「第 N 頁 · 共 42 頁」，封面印「封面 · 共 43 張」；`/print` 仍為 43 張紙、一紙對一個官方 PDF 頁。

### 示範紀錄冊：本支部最高獎章申請測試狀態

- 示範資料改為明顯虛構的「陳大文（示範）」、SCOUT ID `0000000000`、電話 `0000 0000`、`example.org` 電郵及示範地址，避免與真實成員混淆。
- 填滿 15 個 L3 細項（七項考驗全部完成）、區／地域總監會面、樂行童軍獎章頒發及證書編號；貝登堡獎章**尚未頒發**，PT/69、PT/21、PT/22 全部可生成，方便真機核對「最高獎章申請」列印。
- PT/69、PT/21、PT/22 及表格首頁均加上「**示範樣本，只供測試，不可遞交**」橫額、英文對照及列印水印；簽署只顯示職位（示範團長／示範主席等），全部為抽象墨跡，不冒用真人簽名。
- **阻斷示範資料進入正式系統**：`isDemoBook()` 識別示範簿；同步卡顯示鎖定提示，停用 ROVERBADGE 登入／送交／進度檔匯出及匯入；`exportForRoverBadge`、`importFromRoverBadge` 及 `collectPendingForRoverBadge` 均有防護；`api/roverbadge.js` 亦拒絕 `demo` 或全零 SCOUT ID 的寫入。完整備份／還原維持離線可用。

### 測試、版本及離線快取

- 新增 `tests/page_map.test.mjs`（頁碼骨架、關鍵頁對照、目錄完整性、列印文案、表格行數、README 對照表同步）及 `tests/demo_book.test.mjs`（PT/22 就緒、七項完成、示範標示、防同步、版本／快取）。
- `npm test` 已加入上述兩個回歸測試。
- 版號升至 `2.2.0` / `v2.2.0`；Service Worker 快取版本升至 `v5`，更新後會清走舊 cache。

## v2.1.1 (2026-11-10)

### 實測修訂（真機列印及同步測試改善）

- **ROVERBADGE 預設橋接網址與已登記旅團自動列舉去重**
  - `api/roverbadge.js`、`web/src/roverbadgeBridge.js` 與 `.env.example` 統一以 `https://roverbadge.vercel.app` 為預設 ROVERBADGE 來源，支援透過 `ROVERBADGE_ORIGIN` 覆寫。
  - `GET /api/roverbadge` 讀取上游 `/api/troops` 時自動剔除 `connected === false` 與主鍵已存在的 `_aliasOf` 重複別名，並回傳 `origin`（經安全檢核）與 `upstreamOk` 旗標。
  - `vite.config.js` 在獨立 Vite 開發與預覽伺服器中直接掛載 `api/roverbadge.js` 至 `/api/roverbadge`。
  - `RoverBadgeSyncCard.jsx` 於頁面掛載時自動偵測 `/api/roverbadge`（失敗時靜默進入獨立模式，絕不阻斷紀錄冊），在連接按鈕與下拉選單明確顯示自動讀取到的已登記旅團清單（保留前導零並依數值順序排列）。

- **未連接／登入 ROVERBADGE 前鎖定進度檔匯出／匯入（完整備份維持離線可用）**
  - `RoverBadgeSyncCard.jsx` 在 `!session` 時隱藏並鎖定「匯出待領袖核實進度檔」與「從 ROVERBADGE 匯入領袖已核實進度檔」，改顯示清楚的鎖定提示（並標明本機「完整備份 JSON／還原備份 JSON」仍可完全離線使用）；`onExportFile` 與 `onImportFile` 亦加上 `session?.token && session?.ymis` 雙重防衛。
  - `Welcome.jsx`、`MenuDialog.jsx` 與 `Appendix.jsx` 的本機備份還原一律以 `isBookBackupFile` / `isBadgeProgressFile` 區分檔案類型，明確擋下 ROVERBADGE 進度檔並引導先開啟紀錄冊後至「數位附錄」登入再匯入，同時重置檔案 `<input>` 的 `value` 以支援重選同一檔案。
  - 登入後的 ROVERBADGE 對話安全保存在 `sessionStorage`（僅含 token、正規化 SCOUT ID 與旅團編號，無密碼及個人資料）。

- **條件式「前往 ROVERBADGE 開戶」提示**
  - 僅在旅團清單為空（含上游列表暫時無法讀取時）或於旅團下拉選單選擇「找不到我的旅團（前往 ROVERBADGE 開戶）」／點擊「找不到旅團？」時顯示開戶提示，外連按鈕（`target="_blank" rel="noopener noreferrer"`）指向後端回傳的 `origin`。
  - 清單為空時另提供「重新讀取旅團清單」與可選「手動輸入旅團編號」；選取「找不到我的旅團」時自動隱藏 SCOUT ID、密碼欄及登入送出鈕。

- **樣式、圖示與自動化驗證**
  - `web/src/ui.jsx` 補齊 `refresh` 圖示；`web/src/styles.css` 新增搭配 ROVERBOOK 藍金紙頁配色的 `.roversync` / `.roversync__*`（含 `.roversync__locked`、`.roversync__notfound`、`.roversync__offline`）、列印隱藏規則與響應式 `.toasts` 置中包裹樣式。
  - 同步更新版號 `2.1.1` / `v2.1.1` 與 Service Worker 快取版本（`v4`），並新增 `tests/standalone_book.test.mjs`、`tests/ui_contracts.test.mjs` 及擴充 `tests/roverbadge_sync.test.mjs`。

## v2.1.0 (2026-04-20)

- 初版 ROVERBOOK 樂行童軍電子紀錄冊（43 頁逐頁對應紙本、中英雙語切換、三張官方申請表生成、QR 傳送與領袖核簽、儲存健康管理、PWA 離線使用及可選 ROVERBADGE 橋接）。
