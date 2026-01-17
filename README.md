# 🛠️ DeckSmith: AI PDF Reconstruction Engine (v0.5)

[![Version](https://img.shields.io/badge/version-0.5.0-blue.svg)](https://github.com/gemini960114/decksmith)
[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)](LICENSE)

**DeckSmith** 是一款強大的開源 PDF 轉 PPT (PowerPoint) 重構工具。它利用 Google Gemini AI 的視覺辨識能力，自動偵測 PDF 頁面中的文字區域，執行智慧型背景修補（Inpainting），並將文字重新轉化為可編輯的 PPT 物件，完整保留原始排版。

v0.5 版本引入了全新的專案管理系統、更精確的渲染控制，以及強化版的背景修復驗證機制。

---

## ✨ 核心特色 (v0.5 新特性)

- 🤖 **雙階段 AI 辨識**：先偵測幾何座標，再分析字體顏色、樣式，並自動優化**閱讀語義順序**。
- 🎨 **智慧型 Inpainting**：移除文字後自動修補背景。v0.5 支援 **Nano Banana Pro (HQ)** 模型，處理複雜材質更精準。
- 📑 **高精確度匯出**：生成 100% 可編輯的 `.pptx` 檔案，支援 **16:9** 與 **4:3** 比例切換。
- 🧪 **Deep Clean (深層清理)**：新增雙重驗證機制，自動二次掃描並消除殘影。
- 📂 **專案紀錄管理**：整合 IndexedDB，支援多專案保存、歷史紀錄恢復與快取清理。
- 🔒 **隱私優先**：API Key 加密儲存於 LocalStorage，處理數據留存在本地瀏覽器資料庫。

---

## 🌟 示範網站
- **URL**: [https://decksmith.biobank.org.tw/](https://decksmith.biobank.org.tw/)
- **Invitation Code**: `ai4all`

---

## 🚀 快速開始 (Quick Start)

### 1. 前置需求
- **Docker & Docker Compose**
- **SSL 憑證**：由於使用先進的 Web API，必須於 HTTPS 環境執行。
  - 將 `fullchain.pem` 與 `privkey.pem` 放入專案根目錄的 `ssl/` 資料夾中。
- **Gemini API Key**：請至 [Google AI Studio](https://aistudio.google.com/) 取得。

### 2. 一鍵啟動 (Automated Setup)
```bash
# 複製專案並進入目錄
git clone https://github.com/gemini960114/decksmith
cd decksmith

# 賦予權限並執行啟動腳本
chmod +x setup.sh
./setup.sh
```

啟動後，請瀏覽 [https://localhost:4173](https://localhost:4173) (預設埠號已更新)。

---

## 📖 操作指南 (User Guide)

### 第一步：身份驗證
輸入 **Invitation Code** (`ai4all`) 與您的 **Gemini API Key**。

### 第二步：全域參數配置 (Initial Configuration)
- **Render Resolution**：設定 PDF 轉圖片的最高解析度 (建議 1536px 或 2048px)。
- **Deep Clean**：若背景複雜，建議開啟此項以進行雙重去字驗證。
- **AI Models**：可自定義 OCR 與 Cleaning 模型組合。

### 第三步：專案管理
- **上傳檔案**：拖放 PDF 後系統會自動建立新專案。
- **歷史紀錄**：點擊左上角圖示開啟側邊欄，切換先前處理過的專案。

### 第四步：單頁微調 (Tune Mode)
若 AI 預估有誤，進入微調模式：
- **紅/綠框切換**：快速決定哪些文字要提取，哪些要留在背景。
- **Save Only**：v0.5 新增功能，僅更新標籤而不重新消耗 API 額度執行 AI 模型。

### 第五步：匯出與下載
選擇輸出的 **Aspect Ratio** (16:9 或 4:3)，點擊 **Download** 生成 PPTX。

---

## 📚 相關手冊

- 👉 [**操作手冊 (Handbook.md)**](./Handbook.md) 
- 👉 [**安裝與部署手冊 (INSTALL.md)**](./INSTALL.md)

---

## 🔧 技術堆疊
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Storage**: Browser IndexedDB (via Dexie-like implementation)
- **AI Engine**: Google Gemini 1.5/2.0 API (Flash & Pro Models)
- **Infrastructure**: Docker, Nginx (SSL & Static Serving)

---

## 🤝 維護與支援
本專案由 **[NCHC GenAI Team](https://www.nchc.org.tw/)** 提供支援與開發。

---

*如果您喜歡這個專案，歡迎給我們一個 Star！🌟*
