# DeckSmith - AI PDF 重建引擎操作手冊

- User Manual: [English](https://hackmd.io/@whYPD8MBSHWRZV6y-ymFwQ/SJrhK4TE-l) | [Chinese (ZH-TW)](https://hackmd.io/@whYPD8MBSHWRZV6y-ymFwQ/Sy8V2a1SWx)
- Install Guide: [English](https://hackmd.io/@whYPD8MBSHWRZV6y-ymFwQ/BkRON0yrWl) | [Chinese (ZH-TW)](https://hackmd.io/@whYPD8MBSHWRZV6y-ymFwQ/rynoMC1HWg)
- GitHub Project: [DeckSmith](https://github.com/gemini960114/decksmith)


**DeckSmith** 是一個運用 Google Gemini 先進視覺模型技術的應用程式，旨在將 PDF 文件「智慧重建」為可編輯的 PowerPoint (.pptx) 簡報。

本手冊將引導您了解系統的所有功能、參數設定及其對結果的影響。

---

## 示範網址

https://decksmith.biobank.org.tw/

## 1. 系統簡介 (Overview)

傳統的 PDF 轉 PPT 工具通常只能將頁面轉為一張無法編輯的圖片，或是版面跑位的文字。DeckSmith 模擬人類視覺處理流程，透過 AI 達成以下目標：

1.  **分離 (Extract)**：精準識別文字內容、位置、字體大小、顏色與粗體屬性 (OCR)。
2.  **淨化 (Clean)**：利用 AI 圖像修復技術 (Inpainting)，將原始圖片中的文字「擦除」並自動填補背景，還原出乾淨的底圖。
3.  **重組 (Reconstruct)**：將乾淨的背景圖設為 PPT 投影片背景，並將提取出的文字疊加為可編輯的文字方塊。

---

## 2. 快速開始 (Getting Started)

### 2.1 登入驗證
為了使用本系統，您需要通過兩道驗證機制：

1.  **Invitation Code (邀請碼)**：請輸入系統預設碼 **`ai4all`**。
2.  **Google API Key**：本系統核心依賴 Google Gemini API。
    *   請前往 [Google AI Studio](https://aistudio.google.com/app/apikey) 申請一組 API Key。
    *   Key 必須以 `AIza` 開頭。
    *   **隱私說明**：您的 API Key 僅會加密儲存於您瀏覽器的 LocalStorage 中，直接與 Google 伺服器溝通，不會傳送至任何第三方後端。

![image](https://hackmd.io/_uploads/ryciA61H-e.png)
> 圖一：登入與驗證畫面
DeckSmith 的登入與驗證介面。使用者需輸入系統邀請碼以及有效的 Google API Key，完成驗證後即可進入主系統操作介面。

### 2.2 介面概覽
登入後，您會看到主畫面，主要分為三個區域：
*   **頂部導覽列**：顯示系統狀態、歷史紀錄按鈕與登出選項。
*   **設定面板 (Initial Configuration)**：在處理前調整 AI 行為的全域參數。
*   **上傳區 (Upload Zone)**：拖放 PDF 檔案的區域。

![image](https://hackmd.io/_uploads/S1SxkRyB-g.png)
> 圖二：系統主畫面與功能區域
DeckSmith 的主操作畫面，包含頂部導覽列、參數設定面板以及 PDF 檔案上傳區。使用者可在此調整 AI 處理參數並上傳欲轉換的 PDF 文件。

---

## 3. 參數設定詳解 (Configuration Guide)

在開始上傳 PDF 之前，建議您根據文件類型調整以下參數。這些設定決定了輸出的品質與處理速度。

### 3.1 渲染設定 (Rendering)

| 參數名稱 | 預設值 | 功能說明 | 調整建議 |
| :--- | :--- | :--- | :--- |
| **Render Scale**<br>(渲染比例) | **2.0x** | 控制 PDF 轉為圖片時的解析度。數值越高，圖片越大、細節越清晰，但處理速度變慢。 | • **2.0x (標準)**：適合一般投影簡報。<br>• **3.0x - 4.0x (高品質)**：若文件有**極小的註解文字**或**複雜圖表**，且 AI 經常漏字，請調高此值。<br>• **1.5x (快速)**：僅適合文字巨大的簡單投影片。 |
| **Removal Padding**<br>(移除邊距) | **20px** | 在識別出的文字框周圍，額外擴大多少像素來進行擦除 (橡皮擦大小)。 | • **20px (標準)**：適合一般行距。<br>• **調大 (>30px)**：如果發現文字擦除後，背景仍有殘留的文字邊緣或「鬼影」。<br>• **調小 (<15px)**：如果文字緊貼著圖案（如圖表數據），導致 AI 把圖案誤刪時，請調小。 |

### 3.2 AI 模型設定 (AI Models)

| 參數名稱 | 選項說明 | 適用情境 |
| :--- | :--- | :--- |
| **OCR Model**<br>(文字提取) | • **Gemini 3 Flash (Fast)**：速度快，成本低。<br>• **Gemini 3 Pro (Precise)**：高精確度。 | 一般文件使用 Flash 即可。若遇到手寫字、模糊掃描檔或複雜排版，請切換為 Pro。 |
| **Cleaning Model**<br>(圖像修復) | • **Nano Banana (Fast)**：速度極快。<br>• **Nano Banana Pro (High Quality)**：填補能力強。 | 若背景是單純的顏色，使用 Fast 即可。若背景包含漸層、材質或複雜風景圖，請使用 Pro 以獲得更好的修復效果。 |
| **Deep Clean**<br>(雙重驗證) | 開啟/關閉 (預設關閉) | 開啟後，系統會在第一輪去字後，再次檢查圖片是否殘留文字。若發現殘留，會自動進行第二輪修復。**注意：會增加一倍的處理時間與成本。** |

---

## 4. 操作流程 (Workflow)

### 步驟 1：上傳檔案
*   將 PDF 拖入上傳區。
*   **注意**：單次處理建議在 **20 頁以內**，以確保瀏覽器記憶體與效能穩定。

### 步驟 2：選擇頁面
*   檔案解析後，會以卡片形式列出所有頁面。
*   點擊卡片或使用上方的 **Select All** 來選擇您想要轉換的頁面。

### 步驟 3：執行處理 (Process)
*   點擊上方的黑色按鈕 **PROCESS SELECTED**。
*   觀察卡片上的狀態標籤變化：
    *   `ANALYZING`：正在讀取文字位置。
    *   `CLEANING`：正在移除文字並修補背景。
    *   `DONE`：處理完成，可預覽結果。

### 步驟 4：匯出 (Download)
*   所有選定頁面狀態皆為 `DONE` 後，點擊綠色按鈕 **DOWNLOAD**。
*   系統將生成 `.pptx` 檔案。打開後，您可以自由編輯文字、移動位置或更改字體。

![image](https://hackmd.io/_uploads/BJCcJC1SZl.png)
> 圖三：頁面處理流程與狀態顯示
PDF 頁面在處理過程中的狀態變化。每一頁以卡片形式呈現，並依序顯示 ANALYZING、CLEANING 與 DONE 等狀態，讓使用者即時掌握處理進度。

## 5. 進階功能：單頁微調 (Tune Mode)

AI 並非完美，有時會誤刪圖表上的文字，或是去字不乾淨。DeckSmith 提供了強大的「人機協作」模式來修正這些問題。

點擊任一頁面卡片上的 **Tune** 按鈕進入編輯模式。

### 5.1 互動式遮罩 (Clean vs Skip)
編輯視窗左側顯示原始圖片，上方疊加了識別到的文字框：
*   **🟩 綠色實線框 (Clean)**：
    *   代表該區域文字將被**擦除** (轉為背景圖)，並提取為可編輯文字。
    *   **預設狀態**：AI 偵測到的所有文字預設為綠色。
*   **🟥 紅色虛線框 (Skip)**：
    *   代表該區域將被**保護/保留**在背景圖上，**不會**被擦除，也**不會**變成可編輯文字。
    *   **操作**：**直接點擊方框**即可在「綠色」與「紅色」之間切換。

**✨ 使用情境**：如果 AI 打算把複雜圖表上的數字擦掉，導致圖表破損。請點擊該數字框使其變為**紅色**，AI 就會跳過該區域，保留原圖完整性。

### 5.2 參數覆寫 (Override Settings)
編輯視窗右側欄位允許您針對「當前頁面」設定獨立參數：
*   覺得這一頁特別模糊？將 **Scale** 調高至 3.0x。
*   覺得這一頁去字不乾淨？開啟 **Deep Clean** 或調大 **Padding**。

調整完畢後，點擊右下角的 **Apply & Reprocess**，系統將僅針對此頁面重新執行 AI 流程。

![image](https://hackmd.io/_uploads/SyEygR1Bbg.png)
> 圖四：Tune Mode 單頁微調介面
Tune Mode 編輯畫面，使用者可檢視 AI 偵測到的文字區塊，並透過 Clean / Skip 標記進行人工調整，同時針對單一頁面覆寫參數以重新處理。

![image](https://hackmd.io/_uploads/ByhNkKgSbe.png)
> 圖 5 展示將最終 PDF 轉換為可編輯文字後所產生的 PPTX 簡報檔案，圖中以框選方式標示其中文字內容已可直接進行編輯。

---

## 6. 歷史紀錄 (History)

點擊左上角的「時鐘」圖示開啟側邊欄。
*   **自動儲存**：系統會自動儲存您的專案進度。
*   **資料持久化**：即使關閉瀏覽器，下次打開時仍可從歷史紀錄中找回之前的專案。
*   **管理**：點擊垃圾桶圖示可刪除不再需要的專案與快取圖片。

---

## 7. 常見問題排除 (Troubleshooting)

| 問題現象 | 可能原因 | 解決方案 |
| :--- | :--- | :--- |
| **匯出的 PPTX 字體位置稍微跑掉** | PPT 與 Web 渲染引擎的差異 | AI 估算的是相對位置，請在 PPT 中手動微調。系統預設使用 Microsoft YaHei 字體以確保中文相容性。 |
| **文字擦除後有殘影** | Padding 太小 | 請進入 **Tune** 模式，將 Padding 調大至 30px 重跑。 |
| **圖案被誤刪** | Padding 太大或 AI 誤判 | 進入 **Tune** 模式，將該區域標記為 **紅色 (Skip)**，或減小 Padding。 |
| **處理速度很慢** | 使用了 Pro 模型或開啟了 Deep Clean | 若非必要，請使用 Flash/Nano Banana 模型。 |
| **無法處理，卡在 Loading** | PDF 頁數過多或 API 限制 | 建議將大檔案拆分成多個小檔案 (建議 20 頁以內) 分批處理。 |

---

*Document Version: 1.0 | Applicable Version: DeckSmith v0.1*

---

**Powered by [NCHC LLM Team](https://www.nchc.org.tw/)**
