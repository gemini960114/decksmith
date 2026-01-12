# 🛠️ DeckSmith: PDF Vision Reconstructor

[![Version](https://img.shields.io/badge/version-0.4.2-blue.svg)](https://github.com/gemini960114/decksmith)
[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)](LICENSE)

**DeckSmith** 是一款強大的開源 PDF 轉 PPT (PowerPoint) 重構工具。它利用 Google Gemini AI 的視覺辨識能力，自動偵測 PDF 頁面中的文字區域，執行智慧型背景修補（Inpainting），並將文字重新轉化為可編輯的 PPT 物件，完整保留原始排版。

---

## ✨ 核心特色

- 🤖 **雙階段 AI 辨識**：先偵測幾何座標，再分析字體顏色與樣式。
- 🎨 **智慧型 Inpainting**：移除文字後自動修補背景，不損壞底下的插圖或圖表。
- 📑 **高精確度匯出**：生成 100% 可編輯的 `.pptx` 檔案，而非單純的圖片投影片。
- 🧪 **深層清理模式**：提供二次驗證機制，徹底消除文字殘影。
- 🔒 **隱私優先**：前端處理配合本地伺服器代理，資料安全可控。

---

## 🌟 示範網站 (:)
- Invitation Code: ai4all
- Url: http://decksmith.biobank.org.tw/

---

## 🚀 快速開始 (Quick Start)

### 1. 前置需求
- **Docker & Docker Compose**
- **SSL 憑證**：由於使用先進的 Web API，必須於 HTTPS 環境執行。
  - 將 `fullchain.pem` 與 `privkey.pem` 放入專案根目錄的 `ssl/` 資料夾中。
- **Gemini API Key**：請至 [Google AI Studio](https://aistudio.google.com/) 取得。

### 2. 一鍵啟動 (Automated Setup)
如果您是第一次安裝，建議直接執行自動化腳本。它會自動產生開發用 SSL 憑證並啟動服務：

```bash
# 複製專案並進入目錄
git clone https://github.com/gemini960114/decksmith
cd decksmith

# 賦予權限並執行
chmod +x setup.sh
./setup.sh
```

啟動後，請瀏覽 [https://localhost](https://localhost)。

---

## 📖 操作指南 (User Guide)

### 第一步：身份驗證
開啟網頁後，輸入您的 **Gemini API Key**。該金鑰僅儲存於您的瀏覽器 `localStorage` 中，不會上傳。

### 第二步：配置處理參數
在檔案上傳前，您可以針對需求進行設定：
- **Render Scale (2.0x)**：解析度設定，數值越高識別越準，但處理越慢。
- **Removal Padding**：文字移除區域的緩衝邊界。
- **AI Models**：建議選擇 `Gemini 3 Pro` 以獲得最佳重構效果。

### 第三步：上傳與選取
- 拖放 PDF 檔案至上傳區，系統會自動拆解頁面。
- 勾選您想要重構的頁面，點擊 **"Process Selected"**。

### 第四步：手動微調 (選用)
如果 AI 漏掉某些部分，點擊頁面卡片的「編輯」圖示：
- 您可以點擊方框來 **排除/包含** 特定文字塊。
- 變更特定頁面的處理參數並重新處理。

### 第五步：下載成果
處理完成後（狀態顯示為 DONE），點擊 **"Download"** 即可獲得重構後的 PowerPoint 檔案。

---

## 🛠️ 安裝說明 (Installation Details)

詳細的安裝流程、Nginx 配置與故障排除，請參閱：
👉 [**完整安裝手冊 (INSTALL.md)**](./INSTALL.md)

---

## 🔧 技術堆疊
- **Frontend**: React (TSX), Tailwind CSS, Vite
- **Backend**: Node.js, Express, WebSocket (Proxy for Gemini)
- **AI Engine**: Google Gemini API (@google/genai)
- **Infrastructure**: Docker, Nginx (SSL Termination)

---

## 🛡️ 數據與隱私說明

「DeckSmith」致力於保護您的隱私：
1. **API Key**：加密存儲於瀏覽器 LocalStorage。
2. **數據檔案**：儲存於您本地瀏覽器的 IndexedDB。
3. **通訊鏈路**：您的瀏覽器 ↔️ Google Gemini API (直接通訊，不經由本專案伺服器轉發)。

---

## 🤝 維護與支援
本專案由 **[NCHC GenAI Team](https://www.nchc.org.tw/)** 提供支援與開發。

---

*如果您喜歡這個專案，歡迎給我們一個 Star！🌟*