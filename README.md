# Kimi區智取店 LINE 門市助理機器人

## 功能
- 自動回答門市夥伴的工作問題
- 根據問題自動附上對應的 SOP 圖片
- 支援帳號密碼查詢
- 支援設備故障排除

---

## 部署步驟（約 20 分鐘）

### 第一步：建立 LINE Bot 帳號

1. 前往 [LINE Developers](https://developers.line.biz/)
2. 登入 → 點「Create a new provider」
3. 點「Create a new channel」→ 選「Messaging API」
4. 填寫：
   - Channel name：`智取店助理`
   - Channel description：`門市SOP助理機器人`
   - Category：選 `Retail`
5. 建立完成後，進入 channel 設定頁面
6. 在「Basic settings」找到 **Channel secret** → 複製記下
7. 在「Messaging API」分頁 → 點「Issue」發行 **Channel access token** → 複製記下
8. **關閉 Auto-reply messages**（Messaging API 分頁 → 右邊 LINE Official Account Manager → 回應設定 → 關閉自動回覆）

### 第二步：取得 Claude API Key

1. 前往 [Anthropic Console](https://console.anthropic.com/)
2. 登入 → 點「API Keys」→「Create Key」
3. 複製 API Key 記下

### 第三步：上傳程式碼到 GitHub

1. 前往 [github.com](https://github.com) 建立新 repository（名稱：`linebot`）
2. 在電腦終端機執行：

```bash
cd linebot資料夾路徑
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/你的帳號/linebot.git
git push -u origin main
```

### 第四步：部署到 Railway（免費）

1. 前往 [railway.app](https://railway.app) → 用 GitHub 登入
2. 點「New Project」→「Deploy from GitHub repo」→ 選剛才的 repo
3. 部署成功後，點「Variables」→ 新增以下三個環境變數：

| 變數名稱 | 填入內容 |
|---------|---------|
| `LINE_CHANNEL_ACCESS_TOKEN` | 第一步取得的 token |
| `LINE_CHANNEL_SECRET` | 第一步取得的 secret |
| `ANTHROPIC_API_KEY` | 第二步取得的 API key |

4. 點「Settings」→「Networking」→「Generate Domain」→ 複製網址（格式：`https://xxx.railway.app`）

### 第五步：設定 LINE Webhook

1. 回到 [LINE Developers](https://developers.line.biz/)
2. 進入你的 channel → 「Messaging API」分頁
3. 找到「Webhook URL」→ 填入：`https://你的railway網址/webhook`
4. 點「Verify」→ 應顯示 Success ✅
5. 開啟「Use webhook」開關

### 第六步：把 Bot 加入群組

1. 在 LINE Developers → Messaging API → 掃描 QR Code 加 Bot 為好友
2. 在群組聊天室 → 點右上角 → 邀請成員 → 找到 Bot → 邀請
3. 在群組發訊息測試！

---

## 測試範例

發送以下訊息測試機器人：
- `標籤機無法列印怎麼辦`
- `立保繳費機卡紙`
- `新莊中安的PDA帳號`
- `包裹重新分配步驟`
- `FBS怎麼處理`
- `上架完成後要按什麼`

---

## 更新 SOP 知識庫

直接修改 `knowledge.md` 檔案，然後 push 到 GitHub：

```bash
git add knowledge.md
git commit -m "更新SOP"
git push
```

Railway 會自動重新部署。

---

## 常見問題

**Q: Bot 沒有回應**
→ 確認 Webhook URL 設定正確，且「Use webhook」已開啟

**Q: 圖片無法顯示**
→ 確認 Google Drive 資料夾已設為「知道連結的人皆可檢視」

**Q: Railway 免費額度用完**
→ 每月有 500 小時免費額度，通常夠用；或改用 Render.com（同樣免費）
