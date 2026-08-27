// ============================================================
// 智取店小幫手 LINE Bot — index.js v4.0
// 架構:Express + @line/bot-sdk + 本地知識庫比對(search.js)
// 不呼叫任何 AI API:零成本、零延遲、答案 100% 原文照抄。
// 知識庫:knowledge.md
// 圖片:image_map.js(關鍵字 → Google Drive 圖片)
// ============================================================

'use strict';

// ---------- 環境變數檢查 ----------
// v4.0 起不再需要 ANTHROPIC_API_KEY
const REQUIRED_ENV = ['LINE_CHANNEL_ACCESS_TOKEN', 'LINE_CHANNEL_SECRET'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`缺少環境變數:${missing.join(', ')},程式結束。`);
  process.exit(1);
}

const express = require('express');
const line = require('@line/bot-sdk');
const path = require('path');
const { matchImages } = require('./image_map');
const { createSearcher } = require('./search');

// ---------- LINE 用戶端 ----------
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

// ---------- 載入知識庫 ----------
const searcher = createSearcher(path.join(__dirname, 'knowledge.md'));

const BOT_NAME = '智取店小幫手';

// ---------- 自我介紹(加好友/入群自動發送;答不出來時附上) ----------
const INTRO_TEXT = `我是智取店小幫手🤖
依教育訓練手冊回答門市作業問題,直接輸入關鍵字即可,例如「立保卡紙」「FBS離店裝箱」「掃碼槍報修」。

我能解答的主題:
🔸繳費機:檢查收據紙、換紙、卡紙(立保/博辰/瑞興)
🔸上架:智能上架、手動上架、上架秒數、無材積、裸箱
🔸包裹:每日盤點、逾期包裹、遺落包裹、包裹重新分配
🔸異常:錯店、SCS/FBS異常件、異常離店裝箱、打叉回SOC
🔸寄件:打包離店、FBS打包、HD宅配、特選宅配
🔸回報:到店回報、晚班回報、離店回報格式、AppSheet收補空箱
🔸設備排除:標籤機、收據機、掃描槍、Kiosk、NDD平板、藍芽標籤機、Mini PC、PDA登入
🔸AMS:資產申請、耗材申請、維修報修

手冊沒有的問題,請聯繫主管確認。`;

const FALLBACK_TEXT = '這個問題不在教育訓練手冊範圍內,請聯繫主管確認,謝謝。';

// ---------- 查詢知識庫(取代原本的 Claude 呼叫) ----------
function lookup(userText) {
  try {
    return searcher.answer(userText); // 命中回原文,未命中回 null
  } catch (err) {
    console.error('知識庫查詢錯誤:', err);
    return null;
  }
}

// ---------- 判斷群組訊息是否有 @ 機器人 ----------
function isMentioned(event) {
  const msg = event.message;
  // 官方 mention 欄位(手機端點選 @ 產生)
  if (msg.mention && Array.isArray(msg.mention.mentionees)) {
    if (msg.mention.mentionees.some((m) => m.isSelf === true)) return true;
  }
  // 備援:文字包含 @機器人名稱(電腦版或手動輸入)
  return typeof msg.text === 'string' && msg.text.includes(`@${BOT_NAME}`);
}

// 移除 @提及 字串,留下純問題
function stripMention(text) {
  return text.replace(new RegExp(`@${BOT_NAME}`, 'g'), '').trim();
}

// ---------- 處理事件 ----------
async function handleEvent(event) {
  // 加好友(follow)或被邀入群組(join)時,自動發送自我介紹
  if (event.type === 'follow' || event.type === 'join') {
    try {
      await client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: INTRO_TEXT }],
      });
    } catch (err) {
      console.error('自我介紹發送錯誤:', err?.originalError?.response?.data || err);
    }
    return;
  }

  if (event.type !== 'message' || event.message.type !== 'text') return;

  const isGroup = event.source.type === 'group' || event.source.type === 'room';
  if (isGroup && !isMentioned(event)) return; // 群組沒 @ 就不回

  const userText = isGroup ? stripMention(event.message.text) : event.message.text.trim();
  if (!userText) return;

  // 主動查詢使用說明
  if (/使用說明|自我介紹|你會什麼|會回答什麼|怎麼用/.test(userText)) {
    try {
      await client.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: INTRO_TEXT }],
      });
    } catch (err) {
      console.error('LINE 回覆錯誤:', err?.originalError?.response?.data || err);
    }
    return;
  }

  const hit = lookup(userText);
  let answerText = hit || FALLBACK_TEXT;

  // 答不出來時,附上自我介紹讓夥伴知道能問什麼,並記錄下來供你補充知識庫
  if (!hit) {
    console.log(`[未命中] ${userText}`);
    answerText = `${answerText}\n\n${INTRO_TEXT}`;
  }

  // 比對圖片(最多 4 張,文字 1 則 + 圖 4 張 = LINE 上限 5 則)
  const { messages: imageMsgs, videoLink } = matchImages(userText);
  const textMsg = {
    type: 'text',
    text: videoLink ? `${answerText}\n\n教學影片:${videoLink}` : answerText,
  };

  // 未命中時不附圖(避免給錯圖誤導)
  const messages = hit ? [textMsg, ...imageMsgs] : [textMsg];

  try {
    await client.replyMessage({ replyToken: event.replyToken, messages });
  } catch (err) {
    console.error('LINE 回覆錯誤:', err?.originalError?.response?.data || err);
  }
}

// ---------- Express ----------
const app = express();

app.get('/', (_req, res) => res.status(200).send('智取店小幫手 OK'));

// 健康檢查:確認知識庫載入狀況
app.get('/health', (_req, res) =>
  res.status(200).json({ ok: true, entries: searcher.entries.length, mode: 'local-knowledge-base' })
);

app.post('/webhook', line.middleware(lineConfig), (req, res) => {
  Promise.all((req.body.events || []).map(handleEvent))
    .then(() => res.status(200).end())
    .catch((err) => {
      console.error('Webhook 處理錯誤:', err);
      res.status(200).end(); // 回 200 避免 LINE 重送風暴
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`智取店小幫手 v4.0 已啟動,port ${PORT},知識庫 ${searcher.entries.length} 個條目(本地比對,不呼叫 AI API)`);
});
