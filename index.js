// ============================================================
// Kimi區 智取店 門市助理機器人
// 支援：LINE Bot + SeaTalk Bot（System Account Webhook）
// ============================================================

const express = require("express");
const line = require("@line/bot-sdk");
const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();

// ──────────────────────────────────────────
// 環境變數設定
// ──────────────────────────────────────────
const LINE_CONFIG = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// SeaTalk System Account Webhook URL
const SEATALK_WEBHOOK_URL = process.env.SEATALK_WEBHOOK_URL;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ──────────────────────────────────────────
// 讀取 SOP 知識庫
// ──────────────────────────────────────────
function loadKnowledge() {
  try {
    return fs.readFileSync(path.join(__dirname, "knowledge.md"), "utf-8");
  } catch (e) {
    console.error("無法讀取 knowledge.md:", e.message);
    return "";
  }
}

// ──────────────────────────────────────────
// 呼叫 Claude AI（共用邏輯）
// ──────────────────────────────────────────
async function askClaude(userMessage) {
  const knowledge = loadKnowledge();

  const systemPrompt = `你是「Kimi區智取店」的門市助理機器人，專門協助門市夥伴解答工作上的問題。

以下是完整的 SOP 知識庫，請根據這些內容回答問題：

${knowledge}

回答規則：
1. 用繁體中文回答
2. 回答要簡潔清楚，條列式說明步驟
3. 如果問題涉及帳號密碼，請直接提供對應門市的資訊
4. 如果有對應的圖片連結，請在回答最後附上「📷 參考圖片：[連結]」
5. 如果問題超出知識庫範圍，請回答「這個問題我不確定，建議聯繫主管確認」
6. 回答長度適中，不要過於冗長`;

  const response = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  return response.content[0].text;
}

// ══════════════════════════════════════════
// LINE Bot 設定
// ══════════════════════════════════════════
const lineClient = new line.Client(LINE_CONFIG);

// 機器人被 @ 的名稱
const BOT_NAME = "Kimi區 智取店";

// 判斷訊息是否有 @ 機器人，取出問題內容
function extractMentionedQuestion(text, mentionees) {
  if (mentionees && mentionees.length > 0) {
    let question = text;
    question = question.replace(new RegExp(`@${BOT_NAME}\\s*`, "g"), "").trim();
    question = question.replace(new RegExp(`＠${BOT_NAME}\\s*`, "g"), "").trim();
    return question || null;
  }

  const patterns = [
    new RegExp(`^@${BOT_NAME}\\s+`, "i"),
    new RegExp(`^＠${BOT_NAME}\\s+`, "i"),
    new RegExp(`^@${BOT_NAME}$`, "i"),
  ];
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return text.replace(pattern, "").trim() || "你好";
    }
  }

  return null;
}

app.post(
  "/webhook",
  line.middleware(LINE_CONFIG),
  async (req, res) => {
    res.status(200).send("OK");

    const events = req.body.events;
    for (const event of events) {
      if (event.type !== "message" || event.message.type !== "text") continue;

      const rawText = event.message.text.trim();
      const mentionees = event.message.mentionees || [];
      const source = event.source.type;

      let userMessage;
      if (source === "user") {
        userMessage = rawText;
      } else {
        userMessage = extractMentionedQuestion(rawText, mentionees);
        if (!userMessage) {
          console.log(`[LINE] 群組訊息未 @ 機器人，略過：${rawText}`);
          continue;
        }
      }

      console.log(`[LINE] 收到訊息（${source}）：${userMessage}`);

      try {
        const reply = await askClaude(userMessage);
        await lineClient.replyMessage(event.replyToken, {
          type: "text",
          text: reply,
        });
        console.log(`[LINE] 已回覆`);
      } catch (err) {
        console.error("[LINE] 處理訊息失敗：", err.message);
        await lineClient.replyMessage(event.replyToken, {
          type: "text",
          text: "抱歉，系統暫時無法回應，請稍後再試。",
        });
      }
    }
  }
);

// ══════════════════════════════════════════
// SeaTalk Bot 設定
// ══════════════════════════════════════════

async function sendSeaTalkMessage(text) {
  if (!SEATALK_WEBHOOK_URL) {
    console.warn("[SeaTalk] 未設定 SEATALK_WEBHOOK_URL，跳過發送");
    return;
  }

  const payload = {
    tag: "text",
    text: { content: text },
  };

  const response = await fetch(SEATALK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`SeaTalk API 錯誤 ${response.status}: ${body}`);
  }

  console.log("[SeaTalk] 訊息已發送");
}

app.post("/seatalk-callback", express.json(), async (req, res) => {
  res.status(200).json({ status: "ok" });

  try {
    const body = req.body;
    const eventType = body.event_type;

    if (eventType !== "receive_message") {
      console.log(`[SeaTalk] 略過事件類型：${eventType}`);
      return;
    }

    const messageContent = body?.event?.message?.content;
    if (!messageContent) {
      console.log("[SeaTalk] 沒有訊息內容，略過");
      return;
    }

    const userMessage = messageContent.trim();
    console.log(`[SeaTalk] 收到訊息：${userMessage}`);

    const reply = await askClaude(userMessage);
    await sendSeaTalkMessage(reply);
  } catch (err) {
    console.error("[SeaTalk] 處理 callback 失敗：", err.message);
    try {
      await sendSeaTalkMessage("抱歉，系統暫時無法回應，請稍後再試。");
    } catch (e) {
      console.error("[SeaTalk] 發送錯誤提示也失敗：", e.message);
    }
  }
});

app.get("/seatalk-callback", (req, res) => {
  const challenge = req.query.challenge;
  if (challenge) {
    return res.status(200).json({ challenge });
  }
  res.status(200).send("SeaTalk callback endpoint is alive");
});

app.post("/notify-seatalk", express.json(), async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "缺少 message 參數" });
  }
  try {
    await sendSeaTalkMessage(message);
    res.status(200).json({ status: "sent" });
  } catch (err) {
    console.error("[notify-seatalk] 發送失敗：", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("✅ 智取店助理機器人運作中（LINE + SeaTalk）");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 伺服器已啟動，監聽 Port ${PORT}`);
  console.log(`LINE Webhook:     /webhook`);
  console.log(`SeaTalk Callback: /seatalk-callback`);
  console.log(`SeaTalk 主動推送: POST /notify-seatalk`);
});
