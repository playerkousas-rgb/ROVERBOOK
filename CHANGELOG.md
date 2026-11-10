# Changelog · ROVERBOOK 樂行童軍紀錄冊

## v2.1.1 (2026-11-10)

### 實測修訂（參照 CUBSBOOK v1.2.9 實測改善）

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
