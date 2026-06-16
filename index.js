const express = require('express');
const { Client, middleware } = require('@line/bot-sdk');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const app = express();

// ============================
// 設定 LINE & Claude
// ============================
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const lineClient = new Client(lineConfig);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ============================
// 載入 SOP 知識庫
// ============================
const SOP_KNOWLEDGE = fs.readFileSync(
  path.join(__dirname, 'knowledge.md'),
  'utf-8'
);

// ============================
// 圖片關鍵字對應表
// ============================
const IMAGE_MAP = {
  '立保.*卡紙|卡紙.*立保': 'https://drive.google.com/uc?id=15X8UefD8Byno1fFoX8Icwc19-b9DQGWK',
  '立保.*打不開|打不開.*立保': 'https://drive.google.com/uc?id=1EpHHpm2we2VVbv1E-stYZJku-v5gCni3',
  '收據.*無法列印|列印.*收據': 'https://drive.google.com/uc?id=118Sz7SrZi6OeQhgIrt2g-mNB5-gzAxn2',
  '上架完成|完成上架|PDA.*TO單': 'https://drive.google.com/uc?id=1-tOrVUGr6Irk_UQ0UFrMd0ouq9huyo3l',
  '上架秒數|秒數計算|上架效率': 'https://drive.google.com/uc?id=1KNZqEhVsL1M2VRUTYsOQXrU1x995vjfy',
  '上架.*注意|注意.*上架|物流箱.*走道': 'https://drive.google.com/uc?id=1GuoesZtPOrNrsS0lWEZMPlrs8v6DuRmZ',
  '裸箱.*排序|排序.*0|上架排序': 'https://drive.google.com/uc?id=1KQKUwquvy7GhJSCXAz3laTzSQILle5PJ',
  '異常包裹.*回報|回報.*異常': 'https://drive.google.com/uc?id=1OZ42fmIYABx7n_diPvocQ8qAbVWW2fkL',
  '查貨態|spx.tw': 'https://drive.google.com/uc?id=1JTJubDgCiPdNetAVHSReFEkNAPP8ENtk',
  '面單模糊|只印一半|印一半': 'https://drive.google.com/uc?id=1QKsVDkv78naN41k2jjE7JcBkqxj-3u2P',
  '藍芽.*標籤.*排除|標籤.*PDA.*重新連線': 'https://drive.google.com/uc?id=1eTemRWa1Kv77HNmFqFnQ1wqyTm5b82Zh',
  '參數錯誤': 'https://drive.google.com/uc?id=1Lk6gUfIU1bWs5-DrV99uqJxZ_89kCiwG',
  'Time Out|timeout|逾時': 'https://drive.google.com/uc?id=1MT5JZB5mdgXPpccxw6h9IAIjtIDeuO0Y',
  'MS852P|掃描槍.*重置': 'https://drive.google.com/uc?id=1zQr5giGEp9RAVT-9I8XWI5GSNFCBKFNS',
  '橘櫃.*平板|NDD.*平板': 'https://drive.google.com/uc?id=132pLwiPuXhxo4z0IcrpIenzgpktio-58',
  'FBS.*流程|FBS.*處理': 'https://drive.google.com/uc?id=1FffvrcX3UitTcGKgFXtQRIzeSWXFo73Y',
  'SCS.*HD.*打包|SCS.*破壞袋': 'https://drive.google.com/uc?id=1oN6jX4nvNOFM19dtd3BDcIyOlmV3QNUf',
  'SCS.*異常.*夾鏈袋|夾鏈袋': 'https://drive.google.com/uc?id=1VvuWwWHhA_laUyag-ZTQ2Yz5XMZ2K4q_',
  '重新分配.*步驟|分配.*開櫃': 'https://drive.google.com/uc?id=1veJ3dqNuY2YKdus27WM5U8qw4WYLhEXj',
  '重新分配.*影片|分配.*教學': 'https://drive.google.com/file/d/1ALtufuScqKBveuWg6HwJP7AyQjp40vas/view',
  'AppSheet.*空箱|回報.*空箱': 'https://drive.google.com/uc?id=1Oye6KTvsxquIYmY8JcG-AlLCwuG_c6g-',
};

function findImages(text) {
  const images = [];
  for (const [pattern, url] of Object.entries(IMAGE_MAP)) {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(text)) {
      images.push(url);
      if (images.length >= 3) break;
    }
  }
  return images;
}

async function askClaude(userMessage) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: `你是 Kimi區智取店的門市助理機器人，專門協助門市夥伴解答工作上的問題。

以下是你的知識庫，包含所有門市 SOP 和帳號資訊：

${SOP_KNOWLEDGE}

回答規則：
1. 只根據知識庫內容回答，不要編造資訊
2. 回答要簡潔清楚，使用繁體中文
3. 步驟類問題請用數字條列
4. 如果知識庫沒有相關資訊，請回答：「這個問題我不確定，請聯繫主管確認 🙏」
5. 帳號密碼查詢：確認是哪間門市後才提供，並提醒僅供內部使用
6. 回答結尾不需要問「還有其他問題嗎」`,
    messages: [{ role: 'user', content: userMessage }],
  });
  return response.content[0].text;
}

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return;
  const userMessage = event.message.text.trim();
  console.log(`[收到訊息] ${userMessage}`);
  try {
    const answer = await askClaude(userMessage);
    console.log(`[AI回答] ${answer.substring(0, 100)}...`);
    const images = findImages(userMessage + ' ' + answer);
    const messages = [{ type: 'text', text: answer }];
    for (const imageUrl of images) {
      if (imageUrl.includes('.mp4') || imageUrl.includes('/file/d/')) {
        messages.push({ type: 'text', text: `📹 相關影片教學：${imageUrl}` });
      } else {
        messages.push({ type: 'image', originalContentUrl: imageUrl, previewImageUrl: imageUrl });
      }
    }
    await lineClient.replyMessage(event.replyToken, messages);
  } catch (error) {
    console.error('[錯誤]', error);
    await lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '系統暫時無法回應，請稍後再試或聯繫主管 🙏',
    });
  }
}

app.post('/webhook', middleware(lineConfig), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(() => res.status(200).json({ status: 'ok' }))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ status: 'error' });
    });
});

app.get('/', (req, res) => res.send('LINE Bot 運行中 ✅'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server 啟動，port ${PORT}`));
