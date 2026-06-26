const express = require('express');
const line = require('@line/bot-sdk');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const app = express();

const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const lineClient = new line.Client(lineConfig);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SOP_KNOWLEDGE = fs.readFileSync(path.join(__dirname, 'knowledge.md'), 'utf-8');

const IMAGE_MAP = {
  '立保.*卡紙|卡紙.*立保': 'https://drive.google.com/uc?id=15X8UefD8Byno1fFoX8Icwc19-b9DQGWK',
  '收據.*無法列印|列印.*收據': 'https://drive.google.com/uc?id=118Sz7SrZi6OeQhgIrt2g-mNB5-gzAxn2',
  '上架完成|完成上架': 'https://drive.google.com/uc?id=1-tOrVUGr6Irk_UQ0UFrMd0ouq9huyo3l',
  '上架秒數|秒數計算': 'https://drive.google.com/uc?id=1KNZqEhVsL1M2VRUTYsOQXrU1x995vjfy',
  '上架.*注意|物流箱.*走道': 'https://drive.google.com/uc?id=1GuoesZtPOrNrsS0lWEZMPlrs8v6DuRmZ',
  '面單模糊|只印一半': 'https://drive.google.com/uc?id=1QKsVDkv78naN41k2jjE7JcBkqxj-3u2P',
  '參數錯誤': 'https://drive.google.com/uc?id=1Lk6gUfIU1bWs5-DrV99uqJxZ_89kCiwG',
  'Time Out|timeout': 'https://drive.google.com/uc?id=1MT5JZB5mdgXPpccxw6h9IAIjtIDeuO0Y',
  'MS852P|掃描槍.*重置': 'https://drive.google.com/uc?id=1zQr5giGEp9RAVT-9I8XWI5GSNFCBKFNS',
  'FBS.*流程|FBS.*處理': 'https://drive.google.com/uc?id=1FffvrcX3UitTcGKgFXtQRIzeSWXFo73Y',
  '重新分配.*步驟': 'https://drive.google.com/uc?id=1veJ3dqNuY2YKdus27WM5U8qw4WYLhEXj',
};

function findImages(text) {
  const images = [];
  for (const [pattern, url] of Object.entries(IMAGE_MAP)) {
    if (new RegExp(pattern, 'i').test(text)) {
      images.push(url);
      if (images.length >= 2) break;
    }
  }
  return images;
}

async function askClaude(userMessage) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: `你是 Kimi區智取店的門市助理機器人。
知識庫：
${SOP_KNOWLEDGE}
規則：
1. 只根據知識庫回答，使用繁體中文
2. 步驟用數字條列
3. 不確定就說「請聯繫主管確認 🙏」
4. 不要說「還有其他問題嗎」`,
    messages: [{ role: 'user', content: userMessage }],
  });
  return response.content[0].text;
}

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return null;

  const isGroup = event.source.type === 'group' || event.source.type === 'room';
  const rawText = event.message.text;

  // 群組中：只有被 @ 才回應
  if (isGroup) {
    const mentioned = event.message.mention?.mentionees?.some(m => m.type === 'user' && m.isSelf);
    if (!mentioned) return null;
  }

  // 移除 @機器人 的部分，只保留問題內容
  const userMessage = rawText.replace(/@[^s]*/g, '').trim();
  if (!userMessage) return null;

  console.log('[收到]', userMessage);
  try {
    const answer = await askClaude(userMessage);
    const images = findImages(userMessage + ' ' + answer);
    const messages = [{ type: 'text', text: answer }];
    for (const url of images) {
      messages.push({ type: 'image', originalContentUrl: url, previewImageUrl: url });
    }
    return lineClient.replyMessage(event.replyToken, messages);
  } catch (err) {
    console.error('[錯誤]', err.message);
    return lineClient.replyMessage(event.replyToken, {
      type: 'text', text: '系統暫時無法回應，請稍後再試 🙏'
    });
  }
}

app.post('/webhook', express.json(), async (req, res) => {
  console.log('[Webhook 收到]', JSON.stringify(req.body).substring(0, 200));
  res.status(200).json({ status: 'ok' });
  const events = req.body?.events || [];
  await Promise.all(events.map(handleEvent));
});

app.get('/', (req, res) => res.send('LINE Bot 運行中 ✅'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`啟動 port ${PORT}`));
