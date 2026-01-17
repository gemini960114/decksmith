# DeckSmith 安裝與部署手冊 (v0.5)

**DeckSmith** 是一個運用 Google Gemini 先進視覺模型技術的 PDF 轉 PPT 重建引擎。v0.5 版本強化了本地儲存 (IndexedDB)、專案管理與高效能並行處理。本文件將引導您完成部署。

---

## 1. 前置作業 (Prerequisites)

在開始安裝之前，請確保您的系統已安裝以下工具：

- **Docker**: [安裝指南](https://docs.docker.com/get-docker/)
- **Docker Compose**: [安裝指南](https://docs.docker.com/compose/install/)
- **Google Gemini API Key**: 
  - 請至 [Google AI Studio](https://aistudio.google.com/) 申請 API 金鑰。
- **SSL 憑證** (必要，用於安全上下文以啟用 Web API)：
  - 需要 `fullchain.pem` 與 `privkey.pem`。
  - v0.5 仍強制要求 HTTPS 環境，以確保 Web Worker 與 Crypto API 正常運作。

---

## 2. 專案目錄結構

v0.5 的核心邏輯主要位於 `App.tsx`、`services/` 與 `utils/`，並透過 Docker 進行靜態部署。

```text
decksmith/
├── ssl/                   # 存放 SSL 憑證 (由您提供)
│   ├── fullchain.pem
│   └── privkey.pem
├── App.tsx                # 主應用程式邏輯 (v0.5 更新)
├── services/              # AI (Gemini), PDF, PPTX 服務層
├── utils/                 # Storage (IndexedDB) 與其他工具
├── nginx.conf             # v0.5 優化的 Nginx 反向代理設定
├── Dockerfile             # 多階段建構 (Build & Serve)
└── docker-compose.yml     # 定義服務與埠號掛載
```

---

## 3. 安裝與啟動步驟

### 🚀 方式一：自動化安裝 (推薦)

本專案提供 `setup.sh` 腳本，可一鍵處理自簽憑證並部署：

```bash
# 複製專案
git clone https://github.com/gemini960114/decksmith
cd decksmith

# 賦予權限並執行
chmod +x setup.sh
./setup.sh
```

**`setup.sh` 在 v0.5 的邏輯：**
1. 建立 `ssl/` 目錄並檢查憑證。
2. 自動產生 localhost 自簽憑證（若目錄為空）。
3. 執行 `docker-compose up -d --build` 並預設開放 **443** (HTTPS) 與 **4173** (Vite Preview) 等埠號設定。

---

### 📦 方式二：手動安裝 (進階)

#### 步驟 A：配置 SSL
將正式的證書（`fullchain.pem` 與 `privkey.pem`）手動放入 `ssl/` 資料夾。

#### 步驟 B：建構並啟動
在專案根目錄執行：
```bash
docker-compose up -d --build
```

**v0.5 建構說明：**
1. **Frontend Build**: 使用 Node.js 22 環境將 React (Vite) 編譯為高度優化的靜態資源。
2. **Web Server**: 啟動基於 Nginx 的容器，並掛載 `nginx.conf` 與 `ssl` 憑證。

#### 步驟 C：確認狀態
```bash
docker ps
```
確認服務為 `Up` 狀態。

---

## 4. 存取與使用

開啟瀏覽器並輸入：

- **URL**: `https://localhost` (或您的伺服器 IP)

> **核心說明**：v0.5 引入了 **IndexedDB**。處理過程中產生的圖片快取與專案 meta 資料會直接儲存在瀏覽器本地資料庫中。這意味著：
> 1. 您可以關閉視窗，下次開啟時透過「歷史紀錄」恢復專案。
> 2. 由於資料量較大，請確保磁碟剩餘空間充足（一次處理 20 頁 PDF 約需 50-100MB 剩餘空間）。

---

## 5. v0.5 重要配置調整

### 1. 服務埠號
v0.5 預設將 Nginx 對外埠號設定為 `443`。若需更改，請修改 `docker-compose.yml` 中的 `ports` 對應。

### 2. 環境變數 (.env)
您可以建立 `.env` 檔案預填相關參數：
- `VITE_APP_VERSION=0.5.0`
- `INVITATION_CODE=ai4all`

### 3. API Key 安全性
金鑰僅儲存於用戶瀏覽器的 LocalStorage，不經過伺服器轉發，系統安全性已在 v0.5 進一步強化，與 Google Gemini API 採直接端對端通訊。

---

## 6. 常見問題排除 (Troubleshooting)

- **IndexedDB 權限錯誤**：若瀏覽器開啟「無痕模式」，某些 API 可能受限導致處理中斷。請使用正常模式。
- **渲染解析度過高 (3072px)**：若您的伺服器或客戶端機器記憶體較低，調高解析度可能導致頁面當掉。建議從 1536px 開始嘗試。
- **HTTPS 憑證無效**：
  - 檢查 `nginx.conf` 中憑證路徑是否正確。
  - 若使用自簽憑證，請在瀏覽器彈出的危險警告中選擇「繼續存取」。

---

## 7. 數據更新與維修

若要更新至最新版本：
```bash
git pull
docker-compose down
docker-compose up -d --build
```

---

*Document Version: 1.1 | Applicable Version: DeckSmith v0.5*
