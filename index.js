const express = require('express');
const line = require('@line/bot-sdk');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const app = express();

// 啟動前檢查環境變數，缺少就印出明確訊息
const REQUIRED_ENV = ['LINE_CHANNEL_ACCESS_TOKEN', 'LINE_CHANNEL_SECRET', 'ANTHROPIC_API_KEY'];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error('❌ 缺少環境變數：', missingEnv.join(', '));
  console.error('請到 Railway → Variables 分頁確認以上變數都已設定且有值。');
  process.exit(1);
}

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
  'SCS.*異常|FBS.*異常|異常.*裝箱|異常.*TO|異常.*包裹.*離店': 'https://drive.google.com/uc?id=1VvuWwWHhA_laUyag-ZTQ2Yz5XMZ2K4q_',
  '逆物流箱|RTS.*箱|沒有.*逾期箱|尚無.*逆物流': 'https://drive.google.com/uc?id=1C6e2y_vHzmsDVCzcjeu1x7jS7JbgPiFG',
  '藍色.*垃圾袋|裝不進.*夾鏈袋|夾鏈袋.*裝不': 'https://drive.google.com/uc?id=1VvuWwWHhA_laUyag-ZTQ2Yz5XMZ2K4q_',
  '重新分配.*步驟': 'https://drive.google.com/uc?id=1veJ3dqNuY2YKdus27WM5U8qw4WYLhEXj',
  'HD.*流程|HD.*時間表|SCSHD.*打包|HD.*上架': 'https://drive.google.com/file/d/16zG3_pmASdtIwGMhVMffNtq_zkHFanb3/view?usp=drive_link',
  'HD.*錯誤|HD.*一般宅配|HD.*清空|HD.*櫃.*異常': 'https://drive.google.com/file/d/18O7IzS44POYki8g5xOl1mHh7hlVg5Pce/view?usp=drive_link',
  '特選宅配|大材積.*打包|破壞袋|封口黏貼': 'https://drive.google.com/file/d/12yabT9IamAeZTYpq9TzvT0XRylT_OrRf/view?usp=drive_link',
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
    system: `你是「智取店小幫手」，Kimi區智取店的門市 SOP 助理機器人。

【知識庫】
${SOP_KNOWLEDGE}

【回答規則】
1. 只能根據上方知識庫內容回答，不可自行捏造或推測
2. 使用繁體中文回答
3. 回答要簡潔直接，步驟用數字條列
4. 知識庫沒有的問題，一律回答：「這個問題我還沒有資料，請聯繫區經理確認 🙏」
5. 不要說「還有其他問題嗎」、「希望這個回答對你有幫助」等多餘的話
6. 不要回答與門市SOP無關的話題（例如天氣、聊天、笑話等）
7. 若問題模糊，根據最接近的知識庫內容回答，並說明是哪個章節的資訊
8. 回答長度適中，不要過長，重點清楚即可

【你的角色】
- 你只負責回答蝦皮智取店的作業流程問題
- 包含：上架、裝箱、離店、設備排除、SCS/FBS異常、HD宅配等門市SOP
- 遇到與門市無關的問題，請婉拒並說明你只能回答門市SOP相關問題`,
    messages: [{ role: 'user', content: userMessage }],
  });
  return response.content[0].text;
}

async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') return null;

  const sourceType = event.source.type;
  const rawText = event.message.text || '';

  console.log('[事件]', sourceType, rawText.substring(0, 50));

  if (sourceType === 'group' || sourceType === 'room') {
    const mentionees = event.message.mention?.mentionees || [];
    const botMentioned = mentionees.some(m => m.isSelf === true);
    if (!botMentioned) {
      console.log('[略過] 群組訊息未標記機器人');
      return null;
    }
  }

  const userMessage = rawText.replace(/@\S*/g, '').trim();
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
app.listen(PORT, () => console.log(`啟動連接埠${PORT}`));
