# 🗺️ English Adventure 英文冒險島

給國小小朋友的英文學習網站，遊戲闖關式設計。

## ✨ 功能總覽

- 🗺️ **70 關闖關** — 7 主題、346 個單字、有寵物收集
- 🎬 **18 部精選影片** — 兒歌、動畫故事、教學影片，含小測驗 + 速度調整
- 📇 **單字卡** — 翻牌學單字、自動發音、可洗牌
- 👂 **聽力測驗** — 系統念英文，選中文意思
- 🔤 **拼字遊戲** — 看中文跟圖示，按字母拼出英文單字
- 📔 **單字本** — 收藏不熟的單字，隨時複習
- 📰 **每日複習** — AI 用收藏的單字幫你寫一篇短故事
- 💬 **AI 對話** — 跟可愛的卡通角色用英文聊天（4 個角色）
- 📊 **學習統計** — 完成關卡、星星、朗讀次數等
- ⚙️ **資料匯出/匯入** — 換瀏覽器或裝置時可備份還原

## 🤖 AI 服務（三個任選）

| 服務 | 免費額度 | 需信用卡 | 速度 | 對話品質 |
|------|---------|---------|------|---------|
| **Claude** (Anthropic) | 無，付費制 | ✅ 要 | 中 | 最好 |
| **Gemini** (Google) | 每天 1,500 次 | ❌ 不用 | 快 | 好 |
| **Groq** (Llama 3.3 70B) | 每天 14,400 次 | ❌ 不用 | **超快** | 好 |

**推薦設定 2-3 個當備援**：在設定頁三組金鑰各自獨立儲存，切換不會清掉其他的，某個服務當機時可以立刻切到另一個。

三個都不設也能用前面 8 個功能（不影響 AI 對話以外的部分）。

---

## 🚀 部署到 GitHub Pages（10 分鐘）

### 第一次設定

1. **註冊 GitHub 帳號**（如果還沒有）：[github.com](https://github.com) 點 Sign up

2. **建立新的 Repository**
   - 登入後右上角點 ➕ → New repository
   - Repository name 填 `english-adventure`
   - 選 **Public**
   - 勾選 **Add a README file**
   - 點 **Create repository**

3. **上傳檔案**
   - 進到剛建立的 repo 頁面
   - 點 **Add file** → **Upload files**
   - 把這五個檔案**一起拖進去**：
     - `index.html`
     - `style.css`
     - `app.js`
     - `levels.json`
     - `videos.json`
   - commit message 隨便寫
   - 點 **Commit changes**

4. **開啟 GitHub Pages**
   - repo 頁面點上方 **Settings**
   - 左側選單找到 **Pages**
   - **Source** 選 `Deploy from a branch`
   - **Branch** 選 `main`，資料夾選 `/ (root)`
   - 點 **Save**
   - 等 1-3 分鐘，頁面上方會顯示網址：
     ```
     https://你的帳號.github.io/english-adventure/
     ```

5. **打開網址**就可以給小孩玩了！加到手機桌面更方便。

### 之後想更新內容

直接到 repo 點任何檔案 → 右上角鉛筆 ✏️ 編輯 → Commit changes，1-2 分鐘後自動更新。

---

## 💬 AI 對話設定

### 選項 A：Claude（穩定，需付費）

1. 到 [console.anthropic.com](https://console.anthropic.com) 註冊
2. 進入後找到 **API Keys** → Create Key
3. 複製金鑰（`sk-ant-...` 開頭）
4. 在網站 **⚙️ 設定** 頁面，AI 服務選 Claude，貼上金鑰按儲存
5. **強烈建議**：在 console 設定每月用量上限（例如 5 USD）

### 選項 B：Gemini（免費，推薦）

1. 到 [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. 用 Google 帳號登入
3. 點 **Create API key**，複製金鑰
4. 在網站 **⚙️ 設定** 頁面，AI 服務選 Gemini，貼上金鑰按儲存
5. 免費額度：每分鐘 15 次、每天 1500 次

### 選項 C：Groq（免費，最快，超推薦當備援）

1. 到 [console.groq.com/keys](https://console.groq.com/keys)
2. 用 Google 帳號登入
3. 點 **Create API Key**，輸入名稱
4. 複製金鑰（`gsk_...` 開頭）
5. 在網站 **⚙️ 設定** 頁面，AI 服務選 Groq，貼上金鑰按儲存
6. 免費額度：每分鐘 30 次、每天 14,400 次（給小孩用一年都用不完）

**最佳實踐**：把 Gemini 跟 Groq 兩個免費的都設好，萬一一個有問題，到設定頁切換就好，不會中斷使用。

---

## 📺 YouTube API 設定（選用，用來自動抓新影片）

設定後，影片頁可以從**安全頻道白名單**（Super Simple Songs, Peppa Pig, Bluey, Alphablocks 等）抓最新影片，補充內建的 18 部精選影片。

### 申請步驟

1. 到 [console.cloud.google.com](https://console.cloud.google.com) 用 Google 帳號登入
2. 點上方專案選單 → **新增專案** → 命名（例如 `english-app`）→ 建立
3. 等 30 秒專案建好，左側選單 → **API 和服務** → **程式庫**
4. 搜尋 **YouTube Data API v3**，點進去按 **啟用**
5. 左側 → **憑證** → 上方 **建立憑證** → **API 金鑰**
6. 複製金鑰
7. 到網站 ⚙️ 設定，貼上 YouTube API Key，按儲存

### 怎麼使用

1. 影片頁底部會出現「📡 從 YouTube 抓最新影片」區塊
2. 點「🔄 抓最新影片」，從該分類的安全頻道抓最新 18 部
3. 抓到的影片標示「🆕 新」標籤，跟精選影片混在一起顯示
4. 不喜歡的影片，點右上角 ✕ 隱藏（之後不會再出現）
5. 想復原隱藏的影片，到 ⚙️ 設定底部點「↩️ 復原所有隱藏的影片」

### 額度說明

免費版每天 10,000 quota，每次抓取一個分類用約 100 quota（每個頻道搜尋一次扣 100，4 個頻道 = 400），所以**一天可以抓 25 次**。給家裡用絕對夠。

### 修改安全頻道清單

編輯 `channels.json`，加入或刪除頻道。**頻道 ID 取得方式**：到該 YouTube 頻道頁面，在網址或頁面原始碼找 `UC` 開頭的那串字（例如 `UCLsooMJoIpl_7ux2jvdPB-Q`）。

---

## 📚 擴充內容（不用寫程式）

### 加新關卡

編輯 `levels.json`，找要加的主題，在 levels 陣列加：

```json
{
  "icon": "🐝",
  "title": "Busy Bee",
  "titleCn": "忙碌的蜜蜂",
  "story": ["Bees fly from flower to flower.", "..."],
  "vocab": [["bee","蜜蜂"], ["flower","花"]],
  "quiz": {
    "q": "What do bees make?",
    "qCn": "蜜蜂做什麼？",
    "options": ["Milk", "Honey", "Bread", "Sugar"],
    "answer": 1
  }
}
```

### 加新影片

編輯 `videos.json`，在 videos 陣列加：

```json
{
  "id": "song7",
  "category": "songs",
  "youtubeId": "影片ID（YouTube 網址 v= 後面那串）",
  "title": "Head Shoulders Knees and Toes",
  "titleCn": "頭、肩膀、膝、腳趾",
  "level": "Easy",
  "duration": "2:30",
  "description": "認識身體部位的經典兒歌",
  "vocab": [["head","頭"], ["knee","膝蓋"]],
  "quiz": [
    {
      "q": "What body part is the highest?",
      "qCn": "哪個身體部位最高？",
      "options": ["Toes", "Knees", "Head", "Hands"],
      "answer": 2
    }
  ]
}
```

**找 youtubeId 的方法**：YouTube 網址 `https://www.youtube.com/watch?v=ABC123` 中的 `ABC123` 就是 ID。

**讓 AI 幫你推薦影片**：到網站「🎬 影片」頁面最下方，點「✨ 請 AI 推薦影片」，AI 會根據你目前看的分類推薦 5 部新影片，附上 YouTube 搜尋連結。確認過內容適合後，照上面格式加進 `videos.json` 即可。

### 🎯 適合 7-10 歲的優質 YouTube 頻道（家長精選清單）

**兒歌類**
- [Super Simple Songs](https://www.youtube.com/@SuperSimpleSongs) — 最推薦，發音清楚、節奏簡單
- [Pinkfong Baby Shark Official](https://www.youtube.com/@Pinkfong) — 經典兒歌
- [The Singing Walrus](https://www.youtube.com/@TheSingingWalrus) — 語言教學歌曲

**動畫故事類**
- [Peppa Pig - Official Channel](https://www.youtube.com/@PeppaPigOfficial) — 英國發音、5-10 分鐘短篇
- [Bluey - Official Channel](https://www.youtube.com/@Bluey_Official) — 澳洲發音、家庭主題
- [Maisy Mouse Official](https://www.youtube.com/@MaisyMouseOfficial) — 慢速清楚、適合初學
- [Charlie and Lola](https://www.youtube.com/results?search_query=Charlie+and+Lola+full+episodes) — 兄妹日常故事

**教學類**
- [Alphablocks](https://www.youtube.com/@Alphablocks) — BBC 製作，自然發音法
- [Numberblocks](https://www.youtube.com/@Numberblocks) — 數字 + 英文
- [Gracie's Corner](https://www.youtube.com/@GraciesCorner) — 字母、顏色、形狀

**避免的頻道類型**
- ⚠️ 標題有 "kids reaction" "shocking" 的頻道
- ⚠️ Elsa、Spiderman 真人 cosplay 影片（有不當內容假冒兒童影片）
- ⚠️ 自動播放推薦的「toy unboxing」開箱頻道（很多有隱藏廣告）

### 偷懶法：用 AI 幫你出題

把 `levels.json` 或 `videos.json` 貼給 ChatGPT 或 Claude 說「幫我加 5 部關於恐龍的影片」，AI 會生成 JSON，貼回去就好。

---

## 🛠️ 本機測試

不能直接點開 `index.html`（會被擋掉麥克風跟 fetch）。要在資料夾跑：

```bash
python3 -m http.server 8000
```

瀏覽器開 `http://localhost:8000`

---

## 📋 檔案說明

| 檔案 | 內容 |
|------|------|
| `index.html` | 網頁框架（很短） |
| `style.css` | 所有樣式、動畫 |
| `app.js` | 全部程式邏輯 |
| `levels.json` | **70 關內容** + 寵物 + AI 角色 |
| `videos.json` | **18 部影片** + 分類 + 測驗題 |
| `README.md` | 這份說明 |

---

## 🔧 疑難排解

**Q：上傳完打不開，顯示 404**
- A：檢查 GitHub Pages 設定有開啟，等 3 分鐘
- A：確認 5 個檔案都在 repo 根目錄

**Q：點關卡進去，按鈕沒反應**
- A：你直接從電腦點開 `index.html` 嗎？要從 GitHub Pages 網址開啟才行
- A：第一次會問麥克風權限，按允許

**Q：影片不能播放**
- A：那部影片可能在你的地區被 YouTube 擋掉，換另一部試試
- A：自己加新影片時，有些影片作者禁止嵌入會無法播放

**Q：影片速度按鈕沒反應**
- A：先讓影片開始播放，然後按速度按鈕（YouTube iframe 需要播放後才接受指令）

**Q：AI 對話沒聲音**
- A：iOS Safari 第一次要先點頁面任何地方才會啟動聲音

**Q：想清掉所有進度**
- A：到「📊 統計」頁面最下方按「重置所有進度」

**Q：換手機怎麼保留進度？**
- A：到「⚙️ 設定」按「📥 匯出我的資料」存下 JSON 檔，到新裝置匯入

---

## 📄 授權

自由使用、修改。給家長、老師參考用。

