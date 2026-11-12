# Changelog · ROVERBOOK 樂行童軍紀錄冊

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
