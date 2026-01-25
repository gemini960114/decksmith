
# DeckSmith 安裝與部署手冊

本手冊將引導您如何在本地環境中安裝、設定並啟動 DeckSmith 應用程式。

---

## 📋 1. 前置作業 (Prerequisites)

在開始安裝之前，請確保您的開發環境已安裝以下工具：

### 1.1 系統環境
*   **Node.js**: 建議版本 **v18.0.0** 或更高版本。
    *   您可以在終端機輸入 `node -v` 檢查目前版本。
    *   若未安裝，請至 [Node.js 官網](https://nodejs.org/) 下載 LTS 版本。
*   **npm** (Node Package Manager): 通常隨 Node.js 一併安裝。

### 1.2 瀏覽器需求
DeckSmith 高度依賴現代瀏覽器 API (如 IndexedDB, Canvas API)，建議使用以下瀏覽器以獲得最佳體驗：
*   Google Chrome (最新版)
*   Microsoft Edge (最新版)
*   Firefox / Safari (部分功能可能受限)

### 1.3 取得 Google Gemini API Key
本應用程式需要存取 Google Gemini 模型 (Gemini 3 Flash / Gemini 2.5 Image)。
1.  前往 [Google AI Studio](https://aistudio.google.com/app/apikey)。
2.  點擊 **"Create API key"**。
3.  複製產生的 API Key (以 `AIza` 開頭)，稍後登入時會用到。

---

## 🛠️ 2. 安裝步驟 (Installation)

### 步驟 1：取得專案程式碼
將專案檔案下載至您的電腦，並解壓縮或使用 Git Clone (若有儲存庫)。開啟終端機 (Terminal) 或命令提示字元 (Command Prompt)，並切換至專案根目錄。

```bash
cd path/to/decksmith
```

### 步驟 2：安裝相依套件
在專案根目錄下執行以下指令，以安裝 React 及相關 AI SDK 套件：

```bash
npm install
```

> **注意**：安裝過程可能需要幾分鐘，請耐心等待直到出現 `found 0 vulnerabilities` 或類似完成訊息。

---

## 🚀 3. 啟動應用程式 (Startup)

完成安裝後，執行以下指令啟動開發伺服器：

```bash
npm run dev
```

成功啟動後，終端機通常會顯示如下訊息：

```
  VITE v5.x.x  ready in 300 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

請開啟瀏覽器並訪問 `http://localhost:5173`。

---

## 🔐 4. 首次登入與設定

當您第一次開啟應用程式時，會看到登入畫面。請依照以下資訊進行驗證：

1.  **Invitation Code (邀請碼)**
    *   這是系統內建的驗證碼，請輸入：
    *   `ai4all`
    *   *(此設定定義於 `constants.ts` 檔案中)*

2.  **Google API Key**
    *   貼上您在「前置作業」步驟中取得的 Gemini API Key。

3.  **Keep me logged in**
    *   建議勾選。系統會將您的 API Key 加密 (Base64) 並儲存在瀏覽器的 LocalStorage 中，方便下次直接使用。

4.  點擊 **"Continue"** 進入主畫面。

---

## 📝 5. 常見問題排除 (Troubleshooting)

### Q1: 執行 `npm install` 時發生錯誤？
*   請確認您的 Node.js 版本是否為 v18 以上。
*   嘗試刪除 `node_modules` 資料夾與 `package-lock.json` 檔案，然後重新執行 `npm install`。

### Q2: 啟動後畫面一片白或無法載入？
*   請開啟瀏覽器的開發者工具 (F12)，查看 "Console" 分頁是否有紅色錯誤訊息。
*   確認瀏覽器是否支援 ES Modules (現代瀏覽器皆支援)。

### Q3: 登入時顯示 "API Key Validation Failed"？
*   請確認您的 API Key 是否正確複製，且沒有多餘的空白鍵。
*   確認您的 Google Cloud 帳戶是否有權限存取 Gemini 模型。
*   檢查網路連線是否正常，部分公司網路可能阻擋 Google API。

### Q4: 如何更改預設的邀請碼？
*   若需更改邀請碼，請開啟專案中的 `constants.ts` 檔案，修改 `APP_CONFIG` 物件內的 `INVITATION_CODE` 值，儲存後重新整理網頁即可生效。

```typescript
// constants.ts
export const APP_CONFIG = {
  INVITATION_CODE: "your-new-code", // 修改這裡
  // ...
};
```
