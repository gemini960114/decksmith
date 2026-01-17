# DeckSmith - AI PDF 重建引擎操作手冊 (v0.5)

**DeckSmith** 是一個運用 Google Gemini 先進視覺模型技術的應用程式，旨在將 PDF 文件「智慧重建」為可編輯的 PowerPoint (.pptx) 簡報。

v0.5 版本強化了處理效能、專案管理與視覺精確度，並引入了多重驗證機制以確保最佳的背景修補品質。

---

## 示範網址

https://decksmith.biobank.org.tw/

## 1. 系統簡介 (Overview)

DeckSmith 不僅僅是格式轉換，它是透過「模擬人類視覺」來拆解並重組成高品質的簡報。

1.  **分離 (Extract)**：偵測文字內容、位置、樣式，並透過**閱讀順序排序演算法**優化 PPT 中的文字方塊順序。
2.  **淨化 (Clean)**：利用 AI 圖像修復技術 (Inpainting)，將文字從原始圖片中移除，還原出純淨的底圖。
3.  **重組 (Reconstruct)**：導出包含純淨背景圖與可編輯文字疊層的 PPTX 檔案。

---

## 2. 快速開始 (Getting Started)

### 2.1 驗證與登入
1.  **Invitation Code**：請輸入系統預設碼 **`ai4all`**。
2.  **Google API Key**：前往 [Google AI Studio](https://aistudio.google.com/app/apikey) 申請。
    *   **安全性**：API Key 僅加密儲存在本地瀏覽器 (LocalStorage) 中，直接與 Google 通訊。

### 2.2 介面結構
*   **配置面板 (Initial Configuration)**：上傳前預設全域 AI 參數。
*   **歷史導覽 (History Sidebar)**：點擊左上角「選單/時鐘」按鈕開啟，管理過往專案。
*   **上傳/作業區**：處理 PDF 與預覽卡片。

---

## 3. 參數設定詳解 (Configuration Guide)

在 v0.5 中，參數設定更加直觀且支援全域預設。

### 3.1 渲染與品質 (Rendering)

| 參數名稱 | 選項 | 功能說明 |
| :--- | :--- | :--- |
| **Render Resolution** | 1024px ~ 3072px | 控制 PDF 轉為圖片時的最高維度。數值越高，OCR 辨識率越高，但速度較慢。 |
| **Deep Clean** | 開啟 / 關閉 | **(新功能)** 雙重驗證模式。系統會在去字後進行二次掃描，若發現殘留文字則自動進行第二次修補。 |

### 3.2 AI 模型選擇 (AI Models)

| 模組 | 選項 | 建議情境 |
| :--- | :--- | :--- |
| **OCR Model** | **Flash** (快) / **Pro** (準) | 一般文件用 Flash，複雜公式或手寫字用 Pro。 |
| **Cleaning Model** | **Nano Banana** (快) / **Pro HQ** (優) | 簡單背景用快版，複雜圖案/材質請選 HQ 獲得更好的修補效果。 |

### 3.3 導出設定 (Export)

*   **Aspect Ratio (比例)**：支援 **16:9 (寬螢幕)** 或 **4:3 (標準)**。這決定了輸出的 PPTX 頁面尺寸。建議上傳前先觀察 PDF 比例。

---

## 4. 操作流程 (Workflow)

### 步驟 1：全域設定
在上傳區上方調整好 Resolution、Deep Clean 與模型偏好。

### 步驟 2：上傳 PDF
將檔案拖入。系統支援自動保存功能，即便重新整理頁面，進度也會存放在**歷史紀錄**中。

### 步驟 3：頁面處理
*   **Select All**：勾選欲轉換的頁面。
*   **Process Selected**：開始處理。
*   **狀態燈號**：
    *   `ANALYZING`：擷取文字。
    *   `CLEANING` / `VERIFYING`：(v0.5 新增) 執行背景修復與驗證。
    *   `DONE`：處理完成。

### 步驟 4：匯出
點擊 **DOWNLOAD**。v0.5 使用了並行處理技術，提升了多頁處理的總體效率。

---

## 5. 進階微調：Tune Mode (v0.5 更新)

點擊卡片 **Tune** 按鈕進入。v0.5 優化了微調邏輯，支援「僅更新元資料」而無需重新執行 AI。

### 5.1 互動遮罩 (Clean vs Skip)
*   **🟩 綠框 (Clean)**：提取為文字，並從背景中**擦除**。
*   **🟥 紅框 (Skip)**：**保留**在背景圖中，不轉為編輯文字。
*   **更新邏輯**：
    *   **Apply & Reprocess**：重新執行整個 AI 流程 (適用於改參數)。
    *   **Save Only (新)**：如果您只是在「紅/綠」框之間切換，點擊此項可直接應用結果而不消耗額外 API 額度。

---

## 6. 專案與歷史管理 (History Management)

v0.5 引入了完整的專案管理功能：
*   **自動儲存**：每一步處理都會自動保存至 IndexDB。
*   **專案切換**：透過左側側欄隨時回復之前的作業。
*   **資源管理**：側欄中可刪除舊專案，以釋放瀏覽器儲存空間。

---

## 7. 常見問題排除 (Troubleshooting)

| 問題 | 診斷 | 解決方案 |
| :--- | :--- | :--- |
| **轉出的 PPT 閱讀順序混亂** | 文字塊重疊過多 | v0.5 已啟用自動排序，若仍有問題請在 PPT 中使用「選擇窗格」調整。 |
| **背景出現模糊色塊** | 給 AI 的 Padding 不足 | 進入 Tune 模式手動檢查框選範圍，或開啟 Deep Clean。 |
| **瀏覽器記憶體不足** | 太多圖片快取 | 建議分批處理 (一次 20 頁)，完成後從歷史紀錄刪除已匯出的舊專案。 |
| **下載後發現比例不對** | 導出設定錯誤 | 調整頂部選單的 Aspect Ratio 並重新點擊下載。 |

---

*Document Version: 1.1 | Applicable Version: DeckSmith v0.5*

---

**Powered by [NCHC LLM Team](https://www.nchc.org.tw/)**
