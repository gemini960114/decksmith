# TeamTaiwan 「聽台灣」API Proxy 機制調整修復紀錄 (Bugfix & Redesign)

## 1. 問題描述 (Issue)
原本系統部署在 Google Cloud Run 時，雖然前端介面提供使用者輸入其個人 API Key 的功能，但實際上系統後端存在強制的 **API Proxy (代理模式)** 攔截機制：
- **導致結果**：不論使用者在介面上輸入什麼金鑰，最終所有 API 請求（包括文本與語音串流）都會被導向伺服器代理，並強行替換為伺服器端環境變數中的金鑰。
- **後遺症**：
  1. 開發者需負擔所有使用者的 API 額度費用。
  2. 伺服器存在 Proxy 邏輯，增加了運行成本。
  3. 金鑰存在後端環境變數中，存在潛在安全性管理需求。

## 2. 解決方案 (Solution)
將架構調整為 **「純前端調用模式」**，移除所有中間攔截層，實現 **「使用者自帶金鑰、使用者自付配額」**。

## 3. 程式碼修改清單與說明

### A. 後端伺服器調整 (`server/server.js`)
- **修改**：移除根路由的腳本注入功能。
- **說明**：不再向傳送出的 `index.html` 注入 `websocket-interceptor.js` 與 Service Worker 註冊腳本。現在伺服器僅純粹傳送靜態檔案。

```javascript
// 修改後的 / 路由處理
app.get('/', (req, res) => {
    const indexPath = path.join(staticPath, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath); // 直接傳送，不攔截也不注入
    } else {
        res.sendFile(placeholderPath);
    }
});
```

### B. 瀏覽器端請求攔截調整 (`server/public/service-worker.js`)
- **修改**：將 `fetch` 事件改為完全放行（Pass-through）。
- **說明**：移除對 `https://generativelanguage.googleapis.com` 的網址比對與重導向邏輯。

```javascript
// 修改後的 Service Worker fetch 事件
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request)); // 直接讓請求連往 Google 官網
});
```

### C. 前端編譯配置調整 (`vite.config.ts`)
- **修改**：移除 `define` 區塊中對 API 金鑰的環境變數注入。
- **說明**：防止編譯時將開發環境的金鑰硬編碼至 JavaScript，確保在無內建金鑰的情況下由前端介面觸發登入。

```typescript
// 修改後的 vite.config.ts 核心調整
export default defineConfig(({ mode }) => {
    return {
      // plugins: [react()],
      // 移除原本的 define: { 'process.env.API_KEY': ... }
    };
});
```

### D. 部署配置調整 (`Dockerfile`)
- **修改**：移除產生編譯用的臨時金鑰指令。
- **說明**：確保 Docker 映像檔構建過程中完全不依賴任何外部或虛假的 API 金鑰變數。

## 4. 調整後的系統行為彙整

| 功能項目 | 修改前 (Proxy 模式) | 修改後 (Direct 模式) |
| :--- | :--- | :--- |
| **金鑰扣費** | 扣除伺服器 (開發者) 的配額 | **扣除使用者自行輸入金鑰的配額** |
| **連線路徑** | 瀏覽器 -> 伺服器 -> Google | **瀏覽器 -> 直接連向 Google** |
| **安全性** | 伺服器需管理敏感金鑰變數 | **伺服器無須存放金鑰，安全性更高** |
| **運行成本** | 您需支付大量的流量代理費 | **幾乎零成本 (僅剩網頁託管費用)** |

## 5. 後續執行建議
1. **移除 Cloud Run 環境變數**：請至 Google Cloud 控制台，刪除 Cloud Run 下的 `GEMINI_API_KEY` 與 `API_KEY`。
2. **重新部署**：執行 `npm run build` 並重新構建上傳 Docker Image。
3. **清除快取**：使用者端的瀏覽器可能存有舊版的 Service Worker，部署後建議請使用者按 `F5` 刷新或重新載入頁面以確保攔截機制失效。
