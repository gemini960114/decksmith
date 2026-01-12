# DeckSmith 安裝與部署手冊 (INSTALL.md)

DeckSmith 是一個基於 Google Gemini AI 的 PDF 轉 PPT 工具，能自動辨識 PDF 內容、移除背景文字並重新構建為可編輯的 PowerPoint 簡報。本文件將引導您完成本專案的安裝與部署。

---

## 1. 前置作業 (Prerequisites)

在開始安裝之前，請確保您的系統已安裝以下工具：

- **Docker**: [安裝指南](https://docs.docker.com/get-docker/)
- **Docker Compose**: [安裝指南](https://docs.docker.com/compose/install/)
- **Google Gemini API Key**: 
  - 請至 [Google AI Studio](https://aistudio.google.com/) 申請 API 金鑰。
- **SSL 憑證** (必要，用於安全上下文以啟用 Web API)：
  - 需要 `fullchain.pem` 與 `privkey.pem`。
  - 若為本機測試，可使用 `mkcert` 或 `openssl` 自簽憑證。

---

## 2. 檔案目錄結構準備

請確保您的專案目錄結構如下（若缺少 `ssl` 目錄請自行建立）：

```text
decksmith/
├── ssl/                   # 存放 SSL 憑證 (由您提供)
│   ├── fullchain.pem
│   └── privkey.pem
├── server/                # 後端伺服器程式碼
├── public/                # 靜態資源
├── App.tsx                # Frontend 主程式
├── docker-compose.yml     # Docker 編排檔案
├── Dockerfile             # 容器建構檔案
├── nginx.conf             # Nginx 設定
└── ... (其他原始碼檔案)
```

### 建立 SSL 目錄
在專案根目錄下執行：
```bash
mkdir ssl
```
將您的 `fullchain.pem` 與 `privkey.pem` 放入 `ssl/` 資料夾中。

---

## 3. 安裝與啟動步驟

本專案提供自動化腳本 `setup.sh`，可一鍵處理憑證與部署。

### 🚀 方式一：自動化安裝 (推薦)

執行以下指令，系統會自動複製專案、檢查/產生 SSL 憑證並啟動容器：

```bash
# 複製專案
git clone https://github.com/gemini960114/decksmith
cd decksmith

# 賦予權限並執行
chmod +x setup.sh
./setup.sh
```

**`setup.sh` 的運作邏輯：**
1. 建立 `ssl/` 目錄。
2. 檢查是否有現成憑證，若無則呼叫 `openssl` 產生 **自簽憑證** (由 `localhost` 簽發)。
3. 執行 `docker-compose up -d --build`。

---

### 📦 方式二：手動安裝 (進階)

如果您希望手動控制或使用正式憑證：

#### 步驟 A：配置 SSL
將您的 `fullchain.pem` 與 `privkey.pem` 放入 `ssl/` 資料夾。

#### 步驟 B：建構並啟動
在專案根目錄執行：
```bash
docker-compose up -d --build
```

這項指令會執行以下動作：
1.  **Stage 1**: 使用 Node.js 22 映像檔建構前端 React 程式碼。
2.  **Stage 2**: 建構 Express 後端伺服器並整合前端靜態檔案。
3.  **Nginx**: 啟動 Nginx 容器，並掛載您的 SSL 憑證。

### 步驟 C：確認服務狀態
執行以下指令確認容器是否正常運作：
```bash
docker ps
```
您應該會看到 `decksmith-app` 與 `decksmith-nginx` 兩個容器正在運行。

---

## 4. 存取應用程式

安裝完成後，開啟瀏覽器並輸入：

- **URL**: `https://localhost` (或您在 Nginx 設定中指定的域名)

> **注意**：由於應用程式使用 Web Crypto API 與 Web Workers，必須在 **HTTPS** 環境下運行（或 localhost），否則 PDF 上傳功能可能會失效。

---

## 5. 必要說明與功能配置

### 1. API Key 使用方式
DeckSmith 支援兩種 API Key 提供方式：
- **前端輸入**：進入首頁後，系統會提示您輸入 Gemini API Key，該金鑰會安全地儲存在瀏覽器的其餘 `localStorage` 中。
- **後端代理**：若您在啟動容器時設定了 `GEMINI_API_KEY` 環境變數，後端 proxy 會嘗試使用該金鑰。

### 2. PDF 處理設定
在開始處理前，您可以在介面上調整以下參數：
- **Render Scale**: 渲染縮放比例（建議 2.0，若需要更高解析度可調高）。
- **Removal Padding**: 文字移除時的擴張邊界。
- **AI Models**: 選擇不同的 Gemini 世代模型進行 OCR 與 Inpainting。

### 3. 本地開發 (不使用 Docker)
若要進行本地開發：
1. 進入根目錄：`npm install && npm run dev` (啟動前端 Vite)
2. 進入 `server` 目錄：`npm install && node server.js` (啟動後端)

---

## 6. 常見問題排除 (Troubleshooting)

- **SSL 錯誤**：若瀏覽器顯示憑證無效，請確認 `ssl/` 目錄下的檔名是否正確為 `fullchain.pem` 與 `privkey.pem`。
- **PDF 上傳沒反應**：
  - 請檢查瀏覽器開發者工具 (F12) 的 Console。
  - 確保您使用的是 HTTPS 協議。
- **容器啟動失敗**：
  - 檢查埠號 80 與 443 是否被其他程式佔用。
  - 使用 `docker-compose logs -f` 查看錯誤日誌。

---

## 7. 更新說明

若有程式碼更新，請執行以下指令重新建構：
```bash
docker-compose down
docker-compose up -d --build
```
