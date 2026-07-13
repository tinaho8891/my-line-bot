// ============================================================
// 智取店小幫手 LINE Bot — index.js v3.0
// 架構:Express + @line/bot-sdk + @anthropic-ai/sdk
// 知識庫:knowledge.md(僅原文照抄標準答案,不自行生成)
// 圖片:image_map.js(關鍵字 → Google Drive 圖片)
// ============================================================

'use strict';

// ---------- 環境變數檢查 ----------
const REQUIRED_ENV = ['LINE_CHANNEL_ACCESS_TOKEN', 'LINE_CHANNEL_SECRET', 'ANTHROPIC_API_KEY'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`缺少環境變數:${missing.join(', ')},程式結束。`);
  process.exit(1);
}

const express = require('express');
const line = require('@line/bot-sdk');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const { matchImages } = require('./image_map');

// ---------- LINE / Anthropic 用戶端 ----------
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// @line/bot-sdk v9+ 寫法;若你的 package.json 是 v7/v8,
// 改用:const client = new line.Client(lineConfig);
// 並把下方 client.replyMessage({replyToken, messages}) 改成 client.replyMessage(replyToken, messages)
const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ---------- 載入知識庫 ----------
const KNOWLEDGE = fs.readFileSync(path.join(__dirname, 'knowledge.md'), 'utf8');

// ---------- System Prompt(嚴格照抄模式) ----------
const SYSTEM_PROMPT = `你是「智取店小幫手」,智取店門市教育訓練問答機器人。

【最高原則】
1. 你只能從知識庫中「原文照抄」對應的【標準答案】回覆,禁止改寫、濃縮、擴充、推測或補充任何知識庫沒有的內容。
2. 回答方式:比對使用者問題與各條目的【關鍵字】,找到最符合的一條,直接輸出該條【標準答案】全文,一字不改。
3. 若一個問題同時符合多個條目,最多輸出兩條最相關的【標準答案】,並以標題分隔。
4. 若知識庫中沒有符合的條目,只能回覆:「這個問題不在教育訓練手冊範圍內,請聯繫主管確認,謝謝。」不得嘗試用自己的知識回答。

【禁止事項】
- 禁止回答與門市作業無關的話題(閒聊、時事、翻譯、寫作等),一律回覆上述「請聯繫主管」句型。
- 禁止加入客套話、開場白、結尾語(例如「好的」「希望有幫助」)。
- 禁止自行發明步驟、數字、按鍵名稱或設備型號。
- 禁止根據常識推論。知識庫寫什麼,就答什麼。

【格式】
- 一律使用繁體中文。
- 保留【標準答案】原有的編號與換行,不重新排版。

===== 知識庫開始 =====
${KNOWLEDGE}
===== 知識庫結束 =====`;

const BOT_NAME = '智取店小幫手';

// ---------- 自我介紹(加好友/入群自動發送;答不出來時附上) ----------
const INTRO_TEXT = `我是智取店小幫手🤖
依教育訓練手冊回答門市作業問題,直接輸入關鍵字即可,例如「立保卡紙」「FBS離店裝箱」「掃碼槍報修」。

我能解答的主題:
🔸繳費機:檢查收據紙、換紙、卡紙(立保/博辰/瑞興)
🔸上架:智能上架、手動上架、上架秒數、無材積、裸箱
🔸包裹:每日盤點、逾期包裹、遺落包裹、包裹重新分配
🔸異常:錯店、濕破損、SCS/FBS異常件、異常離店裝箱
🔸寄件:打包離店、FBS打包、HD宅配、特選宅配
🔸回報:到店回報、晚班回報、離店回報格式、AppSheet收補空箱
🔸設備排除:標籤機、收據機、掃描槍、Kiosk、NDD平板、藍芽標籤機、Mini PC
🔸AMS:資產申請、耗材申請、維修報修

手冊沒有的問題,請聯繫主管確認。`;

const FALLBACK_TEXT = '這個問題不在教育訓練手冊範圍內,請聯繫主管確認,謝謝。';

// ---------- 呼叫 Claude ----------
async function askClaude(userText) {
  const resp = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    temperature: 0, // 固定輸出,降低自由發揮
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userText }],
  });
  const text = resp.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  return text || FALLBACK_TEXT;
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

  // 主動查詢使用說明(不經過 Claude,直接回覆,順便省 API 費用)
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

  let answerText;
  try {
    answerText = await askClaude(userText);
  } catch (err) {
    console.error('Claude API 錯誤:', err);
    answerText = '系統忙碌中,請稍後再試,或聯繫主管。';
  }

  // 答不出來(請聯繫主管)時,附上自我介紹讓夥伴知道能問什麼
  if (answerText.includes('不在教育訓練手冊範圍')) {
    answerText = `${answerText}

${INTRO_TEXT}`;
  }

  // 比對圖片(最多 4 張,文字 1 則 + 圖 4 張 = LINE 上限 5 則)
  const { messages: imageMsgs, videoLink } = matchImages(userText);
  const textMsg = {
    type: 'text',
    text: videoLink ? `${answerText}\n\n教學影片:${videoLink}` : answerText,
  };

  try {
    await client.replyMessage({
      replyToken: event.replyToken,
      messages: [textMsg, ...imageMsgs],
    });
  } catch (err) {
    console.error('LINE 回覆錯誤:', err?.originalError?.response?.data || err);
  }
}

// ---------- Express ----------
const app = express();

app.get('/', (_req, res) => res.status(200).send('智取店小幫手 OK'));

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
  console.log(`智取店小幫手已啟動,port ${PORT},知識庫長度 ${KNOWLEDGE.length} 字`);
});
