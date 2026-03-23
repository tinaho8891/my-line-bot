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
// 當 AI 回答包含特定關鍵字，自動附上對應圖片
// ============================
const IMAGE_MAP = {
  // 繳費機
  '立保.*卡紙|卡紙.*立保': 'https://drive.google.com/uc?id=15X8UefD8Byno1fFoX8Icwc19-b9DQGWK',
  '立保.*打不開|打不開.*立保': 'https://drive.google.com/uc?id=1EpHHpm2we2VVbv1E-stYZJku-v5gCni3',
  '收據.*無法列印|列印.*收據': 'https://drive.google.com/uc?id=118Sz7SrZi6OeQhgIrt2g-mNB5-gzAxn2',

  // 上架
  '上架完成|完成上架|PDA.*TO單': 'https://drive.google.com/uc?id=1-tOrVUGr6Irk_UQ0UFrMd0ouq9huyo3l',
  '上架秒數|秒數計算|上架效率': 'https://drive.google.com/uc?id=1KNZqEhVsL1M2VRUTYsOQXrU1x995vjfy',
  '上架.*注意|注意.*上架|物流箱.*走道': 'https://drive.google.com/uc?id=1GuoesZtPOrNrsS0lWEZMPlrs8v6DuRmZ',
  '裸箱.*排序|排序.*0|上架排序': 'https://drive.google.com/uc?id=1KQKUwquvy7GhJSCXAz3laTzSQILle5PJ',
  '宅配.*待上架|HD.*上架': 'https://drive.google.com/uc?id=1XLc1JRRFS3yRmzMMH2ib3pGQ9iLg2gxy',

  // 異常包裹
  '異常包裹.*回報|回報.*異常': 'https://drive.google.com/uc?id=1OZ42fmIYABx7n_diPvocQ8qAbVWW2fkL',
  '查貨態|spx.tw': 'https://drive.google.com/uc?id=1JTJubDgCiPdNetAVHSReFEkNAPP8ENtk',

  // 設備排除
  '標籤機.*識別|認識.*標籤機': 'https://drive.google.com/uc?id=1yjFLUk_tjjfEScV4xllTB3TWMYtsGbeC',
  '熱感.*印表機|THERMAL': 'https://drive.google.com/uc?id=1VZBHkDhtJMEZKRcHzS0xrecL6Bau0P8V',
  '面單模糊|只印一半|印一半': 'https://drive.google.com/uc?id=1QKsVDkv78naN41k2jjE7JcBkqxj-3u2P',
  '藍芽.*標籤.*排除.*1|標籤.*PDA.*重新連線': 'https://drive.google.com/uc?id=1eTemRWa1Kv77HNmFqFnQ1wqyTm5b82Zh',
  '藍芽.*標籤.*排除.*2|標籤.*上架系統.*重新連線': 'https://drive.google.com/uc?id=1W7ykVTSPvtK7Bi_s1PUSQgfy0YxbcTVc',
  '藍芽.*標籤.*排除.*3': 'https://drive.google.com/uc?id=1VZT_tTow-LFl2_O9rFtt1I8eKKLUNyxR',
  '參數錯誤': 'https://drive.google.com/uc?id=1Lk6gUfIU1bWs5-DrV99uqJxZ_89kCiwG',
  '標籤機.*重開機|重開.*標籤機': 'https://drive.google.com/uc?id=1rJpPLwt88yxutlOdi9fsHkYE1QcjJaMT',
  'Time Out|timeout|逾時': 'https://drive.google.com/uc?id=1MT5JZB5mdgXPpccxw6h9IAIjtIDeuO0Y',
  'MS852P|掃描槍.*重置|重置.*掃描': 'https://drive.google.com/uc?id=1zQr5giGEp9RAVT-9I8XWI5GSNFCBKFNS',
  '平板.*開機|Kiosk.*開機|開機.*平板': 'https://drive.google.com/uc?id=1dHSjOE8Ditd9yXHXs48TrjAwl-qgC5sA',
  'Mini PC|mini pc|主機.*開關': 'https://drive.google.com/uc?id=1lGz7SgsOv4pjxtWNaJjdNyqDoiWTnESZ',
  '橘櫃.*平板|NDD.*平板': 'https://drive.google.com/uc?id=132pLwiPuXhxo4z0IcrpIenzgpktio-58',
  'TMT|關門流程': 'https://drive.google.com/uc?id=1bQlIjHKDMNu9XSMOZ88YuI4VTVqqQu4j',

  // FBS
  'FBS.*流程|FBS.*處理': 'https://drive.google.com/uc?id=1FffvrcX3UitTcGKgFXtQRIzeSWXFo73Y',
  'FBS.*打包': 'https://drive.google.com/uc?id=1SZxScUgTDYT72IWoY8rSY47eyu_CivD-',

  // SCS HD
  'SCS.*HD.*上架': 'https://drive.google.com/uc?id=1pOfx6nxWEzBMst9PuaKl5P0nmC4iTSK7',
  'SCS.*HD.*打包|SCS.*破壞袋': 'https://drive.google.com/uc?id=1oN6jX4nvNOFM19dtd3BDcIyOlmV3QNUf',
  'SCS.*異常.*夾鏈袋|夾鏈袋': 'https://drive.google.com/uc?id=1VvuWwWHhA_laUyag-ZTQ2Yz5XMZ2K4q_',
  'SCS.*沒有逾期箱|逆物流.*黑箱': 'https://drive.google.com/uc?id=1C6e2y_vHzmsDVCzcjeu1x7jS7JbgPiFG',

  // 包裹重新分配
  '重新分配.*步驟|分配.*開櫃': 'https://drive.google.com/uc?id=1veJ3dqNuY2YKdus27WM5U8qw4WYLhEXj',
  '重新分配.*影片|分配.*教學': 'https://drive.google.com/file/d/1ALtufuScqKBveuWg6HwJP7AyQjp40vas/view',

  // AppSheet
  'AppSheet.*空箱|回報.*空箱': 'https://drive.google.com/uc?id=1Oye6KTvsxquIYmY8JcG-AlLCwuG_c6g-',

  // 晚班回報
  '管制品.*回報|回報.*管制品': 'https://drive.google.com/uc?id=1mYFSww_dh7t6iqSSuecas4occO1rZ4Gi',
};

// ============================
// 找出回答對應的圖片
// ============================
function findImages(text) {
  const images = [];
  for (const [pattern, url] of Object.entries(IMAGE_MAP)) {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(text)) {
      images.push(url);
      if (images.length >= 3) break; // 最多附 3 張圖
    }
  }
  return images;
}

// ============================
// 呼叫 Claude API
// ============================
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

// ============================
// 處理 LINE 訊息
// ============================
async function handleEvent(event) {
  // 只處理文字訊息
  if (event.type !== 'message' || event.message.type !== 'text') return;

  const userMessage = event.message.text.trim();
  console.log(`[收到訊息] ${userMessage}`);

  try {
    // 呼叫 Claude 取得回答
    const answer = await askClaude(userMessage);
    console.log(`[AI回答] ${answer.substring(0, 100)}...`);

    // 找出對應圖片
    const images = findImages(userMessage + ' ' + answer);

    // 組合回覆訊息
    const messages = [{ type: 'text', text: answer }];

    // 附上圖片（最多 3 張）
    for (const imageUrl of images) {
      // 判斷是圖片還是影片連結
      if (imageUrl.includes('.mp4') || imageUrl.includes('/file/d/')) {
        // 影片用文字連結附上
        messages.push({
          type: 'text',
          text: `📹 相關影片教學：${imageUrl}`,
        });
      } else {
        messages.push({
          type: 'image',
          originalContentUrl: imageUrl,
          previewImageUrl: imageUrl,
        });
      }
    }

    // 回傳給 LINE
    await lineClient.replyMessage(event.replyToken, messages);
  } catch (error) {
    console.error('[錯誤]', error);
    await lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '系統暫時無法回應，請稍後再試或聯繫主管 🙏',
    });
  }
}

// ============================
// LINE Webhook 路由
// ============================
app.post('/webhook', middleware(lineConfig), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(() => res.status(200).json({ status: 'ok' }))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ status: 'error' });
    });
});

// 健康檢查
app.get('/', (req, res) => res.send('LINE Bot 運行中 ✅'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server 啟動，port ${PORT}`));
