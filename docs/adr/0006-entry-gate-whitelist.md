# ADR 0006 — 指定入口白名單（Store Gate）

- 狀態：已採用（2026-11-26）
- 決策者：維護者（依治理真理倉 `playerkousas-rgb/readme` 的 SG1–SG19；做法對齊同系列其他支部紀錄冊）
- 相關：[README §指定入口白名單（Store Gate）](../../README.md)、[`store_gate_v1.0.js`](../../web/public/store_gate_v1.0.js)、[`StoreSupport.jsx`](../../web/src/components/StoreSupport.jsx)（本倉未有 ADR 0004；服務平台 iframe 嵌入白名單的決策記於 README「白名單系統」一節）

## 背景

ROVERBOOK 用家手上係**真實紀錄**（成員進度、考章、服務、頒發、簽名），全部存在裝置自己的
`localStorage`。治理倉把這一類 App 歸入「管制宜寬鬆」（SG2／SG11-a），並且：

- **不可以**用 `iframe-only`（純 iframe 白名單）：iOS 主畫面開 App 屬頂層導覽，會被閘踢走；跨站
  iframe 亦會令儲存分家、ITP 有機會清走資料（SG2 五類禁區第一、二項）。
- **可以**用頂層跳板 `entry-gate`：子站保留自己的一等網域，`localStorage`、PWA、Cookie 全部照舊，
  只係「唔經入口嘅直接開啟」顯示白名單提示卡（SG3／SG5）。

## 決策

1. **原樣複製治理倉的閘腳本，不在地修改閘邏輯。**
   來源：`playerkousas-rgb/readme` @ `6ebfdd72a1ea5a5e83df4a6644fc66d0236df98e` 的
   `templates/vercel/store_gate_v1.0.js` → `web/public/store_gate_v1.0.js`（Vite 會複製到 `dist/`）。
   與同系列其他支部紀錄冊同一份檔案（md5 `4f06c205e5ca5df45694da9fffa9dd4f`），
   入口註冊表 `PORTAL_REGISTRY` 由治理倉單一維護。
2. **模式：`entry-gate`。** 不用 `iframe-only`（理由見上）、不用 `closed`（軟關站要另經用戶確認）。
3. **設定（`web/index.html` 的 `<head>`，緊接 `<meta charset>`）**

   ```js
   initStoreGate({
     appKey: 'roverbook',
     mode: localDev ? 'open' : 'entry-gate',
     portalIds: ['appstore'],
     silentPortalIds: ['member'],
     allowStandalone: true,
     autoRedirectSeconds: 0,
   });
   ```

   - `appKey: 'roverbook'`：工作階段通行證存於 `sessionStorage['roverbook.store_pass']`，不寫入紀錄冊，
     亦不會與其他 BOOK 互通。
   - `portalIds: ['appstore']`（SG17）：BOOK 類只認 APP STORE 做入口；分享連結／QR 由 APP STORE 產生（SG9）。
   - `silentPortalIds: ['member']`：成員系統是**唯一例外**——`Referer` 照樣放行，但**卡上唔提、唔畫掣**。
     成員系統本身公開，又已內置四本 BOOK，成員永遠有路入；一旦寫成白名單卡上的按鈕，普通人就會學到
     「可以由成員系統入」，落架開關即失效。圖書館、區管理系統、GEMINI 一律**不**放行。
   - `allowStandalone: true`（SG11-a）：已加入主畫面的用家、以及直接開網址的現有用戶，紀錄照用得；
     閘只擋「新開、無入口、無通行證」的工作階段。
   - `autoRedirectSeconds: 0`：不自動跳轉，用家自己揀。
   - `supportNudge` **不開**：SG18 的常駐「讚好／收藏」掣已覆蓋同一目的，兩者並存只會令同一用家被騷擾兩次。
   - **本機開發例外**：`location.hostname` 為 `localhost`／`127.0.0.1`／`[::1]` 時用 `mode: 'open'`，
     否則 `entry-gate`。Vercel Production／Preview 主機名不是 localhost，一律照行 `entry-gate`。
4. **啟動保護**：`web/src/main.jsx` 只在 `document.documentElement` 沒有 `data-store-gated` 時才掛載
   React 及註冊 PWA，避免先閃一閃紀錄冊或裝出一個打不開的主畫面圖示。
5. **離線快取**：`web/public/sw.js` 把 `/store_gate_v1.0.js` 放入 `SHELL` 並以 cache-first 提供；
   `vercel.json` 的 SPA rewrite 明確排除該檔（連同 `/assets/`、`/icons/`、`/img/`、`/sw.js`、
   `/manifest.webmanifest`、`favicon*`），避免被吞成 `index.html`。
6. **讚好／收藏（SG18）**：`web/src/components/StoreSupport.jsx`，頂欄與歡迎頁各一次，網址由
   `ScoutStoreGate.getAppStoreUrl('roverbook')` 產生（slug 對照主站 migration
   `20261116-app-slug-seed.sql`：`roverbook.vercel.app → roverbook`），零寫死網址、零跨倉密鑰；
   讀不到閘腳本時整粒掣隱藏，列印時隱藏。
7. **分享連結（`/v/<id>`）一律先經閘。** 用戶定案（2026-11-26）：「連分享頁都要同其他支部紀錄冊一樣攔。」
   收件人（家長／領袖）若手上只有分享連結，會先見白名單提示卡，按「前往 APP STORE」再開一次本冊，
   才看得到已分享的章節；已加入主畫面的用家不受影響。分享功能本身、`deleteToken` 作廢機制不變。

## 落架開關：APP STORE 一落架，普通人就入唔到

保留入口白名單的真正目的，是日後「無人用就喺 APP STORE 落架」時，可以一次過令**普通人**用唔到，
而唔需要改程式：

| 動作 | 效果 |
| :--- | :--- |
| APP STORE 落架（Delist） | 卡上唯一按鈕帶去 APP STORE 亦搵唔到本 App → 普通人沒有入口，`entry-gate` 擋住直開 |
| 成員系統（例外，靜默） | 本身公開、又內置四本 BOOK，成員仍可由 `/books` 內嵌或開啟 BOOK 進入；**卡上永不顯示** |
| 已加入主畫面（`allowStandalone`） | 已裝用家照用 —— 佢哋手上有真實紀錄，唔可以因為落架而失去更新／匯出（SG11-a） |
| 要連例外都關 | 改用 `mode: 'closed'`（維護卡）或 Vercel Pause；**落架前先叫用家匯出 JSON 備份** |
| 不可用 | `iframe-only`（會踢走已裝主畫面用家，亦令儲存分家） |

## 與服務平台 iframe 白名單（`frame-ancestors`）的關係

兩者並存、互不取代：

| | `frame-ancestors`（README「白名單系統」） | 本 ADR（Store Gate） |
| :--- | :--- | :--- |
| 管什麼 | **被誰嵌入**（`Content-Security-Policy: frame-ancestors`） | **由哪裡開啟**（頂層導覽的入口來源） |
| 執行位置 | 部署回應標頭（`vercel.json` 由 `shared/embed.js` 推導） | 前端 `<head>` 腳本（React 之前） |
| 對儲存的影響 | 平台內與獨立版**分開儲存** | **零影響**（子站自己一等網域） |
| 本機開發 | Vite dev 由 `server/whitelist.js` 一併套用 | `localhost`／`127.0.0.1` 自動用 `open` |
| 可否當安全邊界 | 是（瀏覽器強制） | **否**（前端導流，可被繞過） |

## 設計目標：擋一般用家，唔係擋技術人員

用戶定案（2026-11-26，與其他支部紀錄冊一致）：「我係擋普通人唔係技術人員。」

- **要擋嘅人**：收到轉發連結、開舊書籤／搜尋結果、唔知要由 APP STORE 入嘅一般成員同家長。
- **唔打算擋嘅人**：識用 DevTools 嘅技術人員（改 `sessionStorage['roverbook.store_pass'] = '1'`、
  自行設定 `Referer` 或用自動化瀏覽器都入得到；**已知並接受**）。所以：
  - 唔加後端 `/api/enter` 驗票、唔加簽名 Cookie、唔加反調試（依 SG12：唔為「防抄」過度工程）；
  - 閘腳本載入失敗時 **fail-open**，寧願放行都唔好鎖死用家手上嘅紀錄；
  - 真正嘅資產（紀錄冊）本來就喺用戶自己部機；繞過閘只係「唔經入口用」，唔等於資料外洩。
- **仍然要守嘅部分**：`/api/leader`（`LEADER_CODE`）同 `/api/roverbadge` 純進度契約照舊運作，
  **唔靠**呢個閘。

## 誠實限制

- **不是身份驗證或安全邊界。** 技術人員可以偽造 `Referer`、改 `sessionStorage`（屬接受範圍）。
- **新工作階段／新分頁**：`sessionStorage` 通行證不跨分頁繼承，可能再次見到白名單卡；由任一入口進入即可。
- **`#v=`／`/v/<id>` 分享連結**：會被攔截，收件人須先經 APP STORE 進入；返回主站不會失去片段
  （片段在網址列，重新開啟即可），但要多一步。
- **成員系統入口**：成員系統現時連結帶 `noreferrer`（清空 `Referer`），由 `/books` 直接跳入有機會被擋；
  可在成員系統內以內嵌方式使用本冊，或先由 APP STORE 進入一次（治理倉 §4.4-11 有記錄）。
- **離線與舊版**：舊版已安裝的 Service Worker 要連網更新一次，才會快取到閘檔案；之後離線開 App
  一樣判斷得到入口。
- **不可用此閘保護未備份的資料**：下架前仍須保留可達入口、開 `allowStandalone`、並先叫用家匯出 JSON 備份（SG11-a）。
