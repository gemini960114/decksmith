# DeckSmith - PDF to Editable PPTX

DeckSmith 是一個結合生成式 AI 技術的網頁應用程式，旨在將靜態的 PDF 文件或圖片轉換為**真正可編輯**的 PowerPoint (.pptx) 簡報。

不同於傳統轉檔工具僅是將 PDF 轉存為背景圖，DeckSmith 採用「解構與重建」的混合技術策略：
1.  **AI OCR (識別)**：利用 **Gemini 3 Flash** 模型精準識別並提取文字內容、字體大小、顏色與位置 (2D Geometry)。
2.  **Canvas Masking (演算法預處理)**：依據 OCR 識別出的 2Dxy 座標區塊，利用 Canvas 演算法移除文字，並計算周圍像素的顏色梯度進行初步補色與遮罩 (Gradient Filling)，為 AI 提供精確的修復底圖。
3.  **AI Inpainting (智慧修復)**：利用 **Gemini 2.5 Flash Image** 模型讀取預處理後的圖像，進行無縫背景修復 (Seamless Inpainting)，消除遮罩邊緣並還原複雜背景的紋理與細節。
4.  **Reconstruction (重建)**：將提取的文字以「可編輯文字方塊」的形式，精準地疊加回修復後的乾淨背景上。


---

## ✨ 核心功能

*   **多格式支援**：支援上傳 `.pdf` 文件及常見圖片格式 (`.jpg`, `.png`, `.webp` 等)。
*   **智慧去字 (Text Removal)**：自動遮蔽文字區域，並生成無文字的乾淨底圖，保留原始設計風格與圖表。
*   **高精準 OCR**：分析版面結構，區分標題、內文與嵌入式文字 (Embedded Art Text)。
*   **互動式排版調整 (Layout Editor)**：提供視覺化介面，允許使用者在 AI 處理前/後手動微調文字遮罩範圍。
*   **混合式儲存架構 (Hybrid Storage)**：
    *   使用 **IndexedDB** 儲存高解析度圖片，突破瀏覽器儲存限制。
    *   使用 **LocalStorage** 儲存專案進度，重新整理網頁資料不遺失。
*   **原生 PPTX 匯出**：一鍵生成 PowerPoint 檔案，文字皆可選取、編輯與搜尋。

---

## 🌟 示範網站
- **URL**: [https://decksmith.biobank.org.tw/](https://decksmith.biobank.org.tw/)
- **Invitation Code**: `ai4all`

---

## 🚀 快速開始 (Quick Start)

### 1. 前置需求
- **Docker & Docker Compose**
- **SSL 憑證** (若未提供, setup.sh流程會自動生成)：由於使用先進的 Web API，必須於 HTTPS 環境執行。
  - 將 `fullchain.pem` 與 `privkey.pem` 放入專案根目錄的 `ssl/` 資料夾中。

### 2. 一鍵啟動 (Automated Setup)
```bash
# 複製專案並進入目錄
git clone https://github.com/gemini960114/decksmith
cd decksmith

# 賦予權限並執行啟動腳本
chmod +x setup.sh
./setup.sh
```

啟動後，請瀏覽 [https://localhost](https://localhost)。



---

## 📖 操作手冊

### 1. 登入與設定
*   **Invitation Code (邀請碼)**：請輸入 `ai4all` (系統預設)。
*   **Google API Key**：輸入您的 Gemini API 金鑰。
    *   勾選 "Keep me logged in" 可將金鑰加密儲存於本地，下次無需重複輸入。

![image](https://hackmd.io/_uploads/Skcrc5yLbe.png)

> 圖一：登入與邀請碼驗證畫面
使用者於首次進入 DeckSmith 時，需輸入系統預設的邀請碼與有效的 Google Gemini API Key，以完成身分驗證與服務授權；可勾選「Keep me logged in」將金鑰安全儲存於本地。

### 2. 建立新專案
*   **上傳檔案**：將 PDF 或圖片拖曳至首頁中央的虛線框內，或點擊上傳。
*   **歷史紀錄**：首頁下方會列出您最近編輯過的專案，點擊即可繼續編輯。

![image](https://hackmd.io/_uploads/H1m81jkL-g.png)

> 圖二：上傳檔案與歷史專案列表
使用者可將 PDF 或圖片檔案拖曳至首頁中央的上傳區域，或點擊進行選擇；下方同步顯示最近編輯的專案清單，方便快速繼續先前的工作。

### 3. 工作區操作
進入專案後，您會看到所有頁面的預覽卡片。

*   **狀態燈號說明**：
    *   ⚪ **IDLE**：等待處理。
    *   🟡 **ANALYZING**：AI 正在分析文字位置 (OCR)。
    *   🟡 **CLEANING**：AI 正在修復背景 (Inpainting)。
    *   🟢 **DONE**：處理完成，準備匯出。
    *   🔴 **ERROR**：發生錯誤，可點擊 "Retry" 重試。

*   **批次處理**：
    1.  確認已勾選欲處理的頁面 (右上角勾選框)。
    2.  點擊頂部的 **"PROCESS [N] SELECTED"** 按鈕，系統將自動執行 OCR 與背景修復。

![image](https://hackmd.io/_uploads/BJVWn9JU-l.png)

> 圖三：頁面預覽卡片與批次處理介面
進入專案後，系統以卡片形式呈現所有頁面，並顯示各頁處理狀態；使用者可勾選多個頁面，透過「PROCESS SELECTED」按鈕一次執行 OCR 與背景修復流程。

![image](https://hackmd.io/_uploads/Bk7eA5kLZx.png)

> 圖四：AI 處理完成後的頁面結果
完成處理後，頁面中的原始文字已被移除，背景經 AI 修復保持原始設計風格，為後續重建可編輯文字內容做好準備。


### 4. 進階功能：排版微調 (Adjust Layout)
若自動處理的結果不完美 (例如：背景修復有殘影、文字框太小)，請點擊頁面縮圖上的 **"Adjust Layout"** 按鈕。

*   **左側視窗 (編輯遮罩)**：
    *   顯示原始圖片與偵測到的文字框。
    *   **綠色框**：代表「文字」，將被移除並轉為可編輯文字。
    *   **紅色框**：代表「保留」，不進行移除 (例如 Logo 或圖表內的文字)。
    *   **操作**：點擊方框可切換 綠/紅 狀態；拖曳方框邊緣可調整大小與位置。
*   **右側視窗 (預覽結果)**：
    *   顯示 AI 修復後的背景圖。
*   **下方工具列**：
    *   **Regenerate Bg**：當您修改了遮罩範圍後，點擊此按鈕請 AI 重新生成背景。
    *   **Save Layout**：儲存目前的設定。

![image](https://hackmd.io/_uploads/rJOe6qJIWg.png)
> 圖五：排版微調（Adjust Layout）操作介面
進階編輯畫面分為左右兩區，左側顯示原始圖片與文字遮罩框，右側即時預覽 AI 修復後的背景結果，協助使用者精準調整文字移除範圍。

![image](https://hackmd.io/_uploads/rJv2TcyUbx.png)
> 圖六：排版微調進行中（遮罩調整）
使用者可拖曳、縮放或切換遮罩框狀態（綠色為可轉換文字、紅色為保留內容），並即時修正 AI 偵測不準確的區域。

![image](https://hackmd.io/_uploads/B1ujacJ8bg.png)
> 圖七：排版微調完成後的結果預覽
完成遮罩調整並重新生成背景後，頁面呈現乾淨且無殘影的底圖，為文字重建與 PPT 匯出提供最佳品質的視覺基礎。

### 5. 匯出檔案
當所有選定頁面的狀態皆為 🟢 **DONE** 時，點擊頂部導覽列的 **"DOWNLOAD .PPTX"** 按鈕，即可下載最終成品。

![image](https://hackmd.io/_uploads/Hko0AckU-e.png)

> 圖八：PPTX 匯出下載按鈕
當所有選定頁面狀態皆顯示為完成（DONE）後，使用者可點擊「DOWNLOAD .PPTX」按鈕，一鍵匯出真正可編輯的 PowerPoint 簡報檔案。

---

## ⚠️ 常見問題 (FAQ)

**Q: 為什麼處理速度有時較慢？**
A: 背景修復 (Inpainting) 需要生成高解析度圖像，這是一個高算力需求的任務。依據 API 狀態，每頁約需 5~15 秒不等。

**Q: 匯出的文字字型不同？**
A: 瀏覽器無法直接提取 PDF 內的嵌入字型檔。DeckSmith 預設使用 `Noto Sans TC` 作為替代字型，您可以在 PowerPoint 中自行更換。

**Q: 我的資料會上傳到哪裡？**
A: 圖片數據僅會傳送至 Google Gemini API 進行處理。您的專案檔案與圖片皆儲存於您瀏覽器的 IndexedDB 中，不會上傳至我們的主機。

---
Powered by **NCHC LLM Team**

