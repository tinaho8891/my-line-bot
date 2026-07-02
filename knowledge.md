請幫我更新 GitHub 儲存庫 tinaho8891/my-line-bot(main 分支),這是部署在 Railway 的 LINE Bot。

任務:用下方提供的內容更新三個檔案,index.js 和 knowledge.md 覆蓋原有檔案,image_map.js 是新增檔案。不要動 package.json 和其他任何檔案。Commit 訊息:「更新知識庫 v3.0:嚴格照抄模式 + 圖片對應表」。直接 commit 到 main,不要開分支或 PR。

上傳前請先打開 repo 現有的 package.json 確認 @line/bot-sdk 版本:若是 ^9 以上,index.js 原樣上傳;若是 ^7 或 ^8,請依 index.js 內註解把 client 初始化與 replyMessage 改成舊版寫法後再上傳。

===== 檔案 1:index.js =====
```javascript
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
  if (event.type !== 'message' || event.message.type !== 'text') return;

  const isGroup = event.source.type === 'group' || event.source.type === 'room';
  if (isGroup && !isMentioned(event)) return; // 群組沒 @ 就不回

  const userText = isGroup ? stripMention(event.message.text) : event.message.text.trim();
  if (!userText) return;

  let answerText;
  try {
    answerText = await askClaude(userText);
  } catch (err) {
    console.error('Claude API 錯誤:', err);
    answerText = '系統忙碌中,請稍後再試,或聯繫主管。';
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
```

===== 檔案 2:image_map.js =====
```javascript
// ============================================================
// IMAGE_MAP v3.0 — 智取店小幫手 圖片對應表
// 圖片來源:Google Drive「AI工具機器人」資料夾(權限:知道連結的任何人)
// LINE 圖片訊息必須用直連網址,格式:https://lh3.googleusercontent.com/d/<FILE_ID>
// 注意:LINE 一次 reply 最多 5 則訊息(1 則文字 + 最多 4 張圖),程式已自動裁切
// ============================================================

const IMG = (id) => `https://lh3.googleusercontent.com/d/${id}`;

const IMAGE_MAP = [
  // ---------- 繳費機 ----------
  {
    keywords: /立保.*(卡紙)|卡紙.*(立保)/,
    images: [IMG('15X8UefD8Byno1fFoX8Icwc19-b9DQGWK')], // 立保繳費機卡紙
  },
  {
    keywords: /立保.*(打不開|門.*(開|鎖)|開不了)/,
    images: [IMG('1EpHHpm2we2VVbv1E-stYZJku-v5gCni3')], // 立保繳費機打不開
  },
  {
    keywords: /繳費機.*(無法(列印|印)|不出紙|印不出|收據.*(印不出|不出))/,
    images: [IMG('118Sz7SrZi6OeQhgIrt2g-mNB5-gzAxn2')], // 繳費機收據無法列印_電源線重插
  },

  // ---------- 標籤機 / 收據機(USB 有線) ----------
  {
    keywords: /(標籤機|收據機).*(無法(列印|印)|印不出|不能印|簡易排除)/,
    images: [
      IMG('1T7O4iOYcG42xzecfrMpwx15fdllnL_iy'), // 標籤機簡易排除1
      IMG('1TrQ8TstavX-JBkDCKWkIOM3HeBudoAag'), // 標籤機簡易排除2
      IMG('1BMexbvlgJtflJUj6WfDNmyjEuV35AmVF'), // 標籤機簡易排除3
      IMG('1j3tmiGHhTJ_40n_8XPkRvMvnOlYVz3_f'), // 標籤機簡易排除4
    ],
  },
  {
    keywords: /(面單|標籤).*(模糊|印.*一半|印不完整)/,
    images: [IMG('1QKsVDkv78naN41k2jjE7JcBkqxj-3u2P')], // 標籤機模糊 印一半
  },
  {
    keywords: /(認識|型號|哪台|長怎樣).*(印表機|標籤機|收據機)|(印表機|標籤機|收據機).*(型號|認識)/,
    images: [
      IMG('1VZBHkDhtJMEZKRcHzS0xrecL6Bau0P8V'), // 熱感印機圖片
      IMG('1yjFLUk_tjjfEScV4xllTB3TWMYtsGbeC'), // 標籤機圖片
    ],
  },

  // ---------- 藍芽標籤機 ----------
  {
    keywords: /藍[芽牙]標籤機.*(無法(列印|印)|TO單|排除|連線)/i,
    images: [
      IMG('1rJpPLwt88yxutlOdi9fsHkYE1QcjJaMT'), // 藍芽標籤機無法列印先重開機
      IMG('1eTemRWa1Kv77HNmFqFnQ1wqyTm5b82Zh'), // 故障排除1
      IMG('1W7ykVTSPvtK7Bi_s1PUSQgfy0YxbcTVc'), // 故障排除2
      IMG('1VZT_tTow-LFl2_O9rFtt1I8eKKLUNyxR'), // 故障排除3
      // 第5張(故障排除4)超過 LINE 單次上限,保留備用:
      // IMG('1Lk6gUfIU1bWs5-DrV99uqJxZ_89kCiwG'),
    ],
  },
  {
    keywords: /time\s*out|逾時/i,
    images: [IMG('1MT5JZB5mdgXPpccxw6h9IAIjtIDeuO0Y')], // 藍芽標籤機出現time out
  },
  {
    keywords: /參數錯誤/,
    images: [IMG('1eTemRWa1Kv77HNmFqFnQ1wqyTm5b82Zh')], // 重新設定畫面(故障排除1)
  },

  // ---------- 掃描槍 / 平板 / 主機 ----------
  {
    keywords: /MS852P|掃描槍|掃碼槍/i,
    images: [
      IMG('1zQr5giGEp9RAVT-9I8XWI5GSNFCBKFNS'), // MS852P
      IMG('1NDM4d9eD_KhSbshHb7d5qpUniFmooRCj'), // MS852P2
    ],
  },
  {
    keywords: /(Kiosk|寄件平板).*(開機|重啟|重開|按鍵)/i,
    images: [IMG('1dHSjOE8Ditd9yXHXs48TrjAwl-qgC5sA')], // 平板_Kiosk開機鍵1
  },
  {
    keywords: /(NDD|橘櫃).*(平板).*(開機|重啟|重開)|橘櫃平板/i,
    images: [IMG('132pLwiPuXhxo4z0IcrpIenzgpktio-58')], // 橘櫃平板開機鍵
  },
  {
    keywords: /mini\s*pc|寄件櫃.*(主機|電腦)/i,
    images: [IMG('1lGz7SgsOv4pjxtWNaJjdNyqDoiWTnESZ')], // mini pc開關鍵
  },

  // ---------- 上架 ----------
  {
    keywords: /上架.*(SOP|流程|怎麼|如何)|智能上架/,
    images: [IMG('1GuoesZtPOrNrsS0lWEZMPlrs8v6DuRmZ')], // 上架SOP
  },
  {
    keywords: /上架.*(秒數|效率)/,
    images: [IMG('1KNZqEhVsL1M2VRUTYsOQXrU1x995vjfy')], // 上架效率
  },
  {
    keywords: /上架完成.*(回報|拍照)/,
    images: [IMG('1-tOrVUGr6Irk_UQ0UFrMd0ouq9huyo3l')], // 上架完成回報
  },
  {
    keywords: /裸箱|上架排序\s*0|排序0/,
    images: [IMG('1KQKUwquvy7GhJSCXAz3laTzSQILle5PJ')], // 裸箱上架順序0
  },

  // ---------- 異常包裹 / SCS FBS ----------
  {
    keywords: /異常包裹.*(回報)|回報.*(異常包裹)/,
    images: [IMG('1OZ42fmIYABx7n_diPvocQ8qAbVWW2fkL')], // 異常包裹回報
  },
  {
    keywords: /查貨態|spx\.tw|重複件|取消件|遺失件/i,
    images: [IMG('1JTJubDgCiPdNetAVHSReFEkNAPP8ENtk')], // 異常包裹查貨態
  },
  {
    keywords: /SCS.*(異常|RTS)|FBS.*(異常)|RTS/i,
    images: [
      IMG('1VQGXVTCABByshNng5xFDcMxCxsZnTsfu'), // SCS異常1
      IMG('1UKq--UDarww2G6YdOkzbjHf-4l653d-p'), // SCS異常2
      IMG('1kKZCBGOQ4_oQI7QErWE_-qJRIh1PTSc5'), // SCS異常3
      IMG('1AzUw1KilHl7w6zTTTyrAHCgwWjxUsU3i'), // SCS異常4
      // 第5張超過 LINE 單次上限,保留備用:
      // IMG('1iYgj3Qs2xA8d_Fzzbqi-ZTY38nHaW5Kf'), // SCS異常5
    ],
  },

  // ---------- FBS 打包 ----------
  {
    keywords: /FBS.*(打包|流程|處理|回報)/i,
    images: [
      IMG('1FffvrcX3UitTcGKgFXtQRIzeSWXFo73Y'), // fbs
      IMG('1SZxScUgTDYT72IWoY8rSY47eyu_CivD-'), // FBS打包
      IMG('1VQ9NOXRm14nlCkGfGgVbV3DlxBo97Jse'), // FBS打包2
      IMG('1EiD_WO1Nzr4w4YNbn3Dz6WMKn_Me6mnG'), // FBS打包3
    ],
  },

  // ---------- HD 宅配 / SCS HD ----------
  {
    keywords: /HD.*(流程|時間|時段|打包|上架順序)|SCSHD/i,
    images: [
      IMG('16zG3_pmASdtIwGMhVMffNtq_zkHFanb3'), // HD門市流程時間表
      IMG('1pOfx6nxWEzBMst9PuaKl5P0nmC4iTSK7'), // SCS HD 上架1
      IMG('1oN6jX4nvNOFM19dtd3BDcIyOlmV3QNUf'), // SCS HD 打包2
      IMG('1kpZZndOZTaKIlUCm5CtyDyit2jYWVUcS'), // SCS HD 打包3
      // 備用:打包4 1YPY8Pg0hm1-i6314QkRlUSzQqNdkA5Ub、打包5 1oG3NTeCNDj1jyLpAW0ObwlgSRsNO6gZ6
    ],
  },
  {
    keywords: /HD.*(常見錯誤|注意)|一般宅配.*(錯誤|注意)/i,
    images: [IMG('12yabT9IamAeZTYpq9TzvT0XRylT_OrRf')], // HD一般宅配常見錯誤
  },
  {
    keywords: /特選宅配/,
    images: [IMG('18O7IzS44POYki8g5xOl1mHh7hlVg5Pce')], // 特選宅配常見錯誤
  },
  {
    keywords: /(宅配|HD).*(待上架|回報)/i,
    images: [IMG('1XLc1JRRFS3yRmzMMH2ib3pGQ9iLg2gxy')], // 宅配回報待上架回報
  },

  // ---------- 回報 ----------
  {
    keywords: /晚班.*(回報|管制品)|管制品/,
    images: [IMG('1mYFSww_dh7t6iqSSuecas4occO1rZ4Gi')], // 晚班回報管制品
  },
  {
    keywords: /AppSheet|收補空箱|空箱.*(回報)/i,
    images: [
      IMG('1Oye6KTvsxquIYmY8JcG-AlLCwuG_c6g-'), // APPSHEET回報收補空箱
      IMG('1gqJXWamfN69U0fImv1l0PsZz_gOB4yb_'), // APPSHEET回報收補空箱2
    ],
  },

  // ---------- 其他 ----------
  {
    keywords: /TMT|門.*(關不|打不開|鎖)/i,
    images: [IMG('1bQlIjHKDMNu9XSMOZ88YuI4VTVqqQu4j')], // TMT關門流程
  },
  {
    keywords: /包裹重新分配|重新分配/,
    images: [
      IMG('1veJ3dqNuY2YKdus27WM5U8qw4WYLhEXj'), // 包裹重新分配1
      IMG('1BwbCA_rnkvL5KVlO6i8qbPnsWyTvOL0i'), // 包裹重新分配2
      IMG('1Rp4LsK1ozutHzAve69Xo3uCZKSDne2q_'), // 包裹重新分配3
      IMG('11R9kMWkgPN2qjPokXkLRVkTMfB4T3joD'), // 包裹重新分配4
      // 備用:分配5 1_Wh5c8Qxt7cSK84RTeTtaoOX9HCOcJl_、分配6 1iBWz_kqsZepRKCRmPd70_mkINM8M74hd
    ],
    // 教學影片(LINE 無法直接播 Drive 影片,以連結附在文字後):
    videoLink: 'https://drive.google.com/file/d/1ALtufuScqKBveuWg6HwJP7AyQjp40vas/view',
  },
];

// ------------------------------------------------------------
// 依使用者問題比對圖片,回傳 LINE image message 陣列(最多 maxImages 張)
// ------------------------------------------------------------
function matchImages(userText, maxImages = 4) {
  for (const entry of IMAGE_MAP) {
    if (entry.keywords.test(userText)) {
      const msgs = entry.images.slice(0, maxImages).map((url) => ({
        type: 'image',
        originalContentUrl: url,
        previewImageUrl: url,
      }));
      return { messages: msgs, videoLink: entry.videoLink || null };
    }
  }
  return { messages: [], videoLink: null };
}

module.exports = { IMAGE_MAP, matchImages };
```

===== 檔案 3:knowledge.md =====
```markdown
# 智取店小幫手 知識庫 v3.0(依 Kimi區_教育訓練手冊3.0 整理)
# 使用規則:機器人只能「原文照抄」以下標準答案,不得自行改寫、補充或推測。
# 每個條目格式:【關鍵字】= 觸發詞 / 【標準答案】= 直接輸出的內容。

---

## 第1章 繳費機|檢查收據紙(每日)

【關鍵字】立保 檢查收據紙
【標準答案】
立保繳費機|檢查收據紙:
1. 開印表機門鎖:輕壓下方門片的右側
2. 掃 QR code
3. 確認收據紙水位(沒碰到線)

【關鍵字】立保 收據紙安裝 / 換紙
【標準答案】
立保繳費機|收據紙安裝:
1. 對準卡榫、紙捲朝上
2. 安裝後會自動送紙
3. 測試列印
4. 【拍照】回報群組

【關鍵字】博辰 檢查收據紙
【標準答案】
博辰繳費機|檢查收據紙:
1. 下方門片會自動開啟
2. 掃 QR code
3. 確認收據紙水位(沒碰到線)

【關鍵字】博辰 收據紙安裝 / 換紙
【標準答案】
博辰繳費機|收據紙安裝:
1. 黑色軸心放入紙捲,卡進凹槽處
2. 放入後會自行吸入紙捲
3. 測試列印
4. 【拍照】回報群組

【關鍵字】瑞興 檢查收據紙 / 換紙
【標準答案】
瑞興繳費機|檢查收據紙:
1. 將收據機開關往下壓,印表機門片會自動彈開
2. 掃 QR code
3. 檢查水位及測試列印
4. 依圖示裝入紙捲
5. 若「測試列印」鍵消失,重新掃描 QR code 即可
6. 【拍照】回報群組

---

## 第2章 繳費機|故障簡易排除

【關鍵字】繳費機 收據紙無法印出 / 不出紙
【標準答案】
繳費機收據紙無法印出,依序排除:
1. 確認電源(按鍵有無亮燈)
2. 檢查紙捲
3. 測試列印,或清除卡紙
若仍無法排除,請聯繫主管。

【關鍵字】立保 卡紙
【標準答案】
立保繳費機卡紙排除:
1. 拔除傳輸線
2. 藍色卡榫往上拉
3. 清除卡紙

【關鍵字】博辰 卡紙
【標準答案】
博辰繳費機卡紙排除:
1. 前面擋板往上拉
2. 清除卡紙

【關鍵字】繳費機異常 回報格式
【標準答案】
繳費機異常回報,請【拍照】回報群組,格式如下:
>異常回報
店名:(你的店名)-智取店
設備:繳費機
異常描述:(例:現金繳費模組維護,麻煩協助處理,謝謝)

---

## 第3章 自助寄件機|每日檢查

【關鍵字】自助寄件機 每日檢查
【標準答案】
自助寄件機每日檢查流程:
1. 標籤機、收據機檢查紙捲水位(不低於紅線)
2. 【收據紙】列印測試
3. 【寄件面單】列印測試
4. 【拍照】回報群組

---

## 第4章 上架前|櫃位包裹盤點

【關鍵字】包裹盤點 / 每日盤點
【標準答案】
每日包裹盤點:
1. 到各櫃區
2. 點選「開啟可使用櫃位」
3. 確認是否有包裹

---

## 第5章 逾期包裹|挑出與裝箱

【關鍵字】逾期包裹 挑出
【標準答案】
逾期包裹挑出流程:
1. 開啟逾期包裹櫃位(一次開一個櫃區)
2. 包裹離店-智取櫃
3. 包裹面單畫 XX

【關鍵字】逾期包裹 裝箱 / 逐顆裝箱
【標準答案】
逾期包裹逐顆裝箱:
1. 刷 RFID
2. 選擇「逐顆裝箱」
3. 一顆一顆刷入包裹

---

## 第6章 智能上架

【關鍵字】上架前準備
【標準答案】
上架前準備:
1. PDA 音量開到最大聲
2. 大、小層板先備著拿到角落放,可直接補層板
3. 物流箱塞滿各走道(避免倉庫、外場來回走動,增長秒數)

【關鍵字】智能上架 流程
【標準答案】
智能上架流程(前置作業、智能推薦):
1. 貨先拉出倉庫,疊在小烏龜上,不用分類/整理
2. 兩台平板車一起拉到櫃區
3. 從【小】到【大】拿取包裹
4. 刷包裹面單,聽 PDA 指示
5. 若包裹塞不進櫃裡,一定要點選【無法放入】
6. 上完最後一顆包裹,記得點選【完成上架】

【關鍵字】無材積
【標準答案】
無材積資訊包裹處理:
1. 先將包裹放置旁邊(物流箱)
2. 智能上架完成後,再手動上架;或使用智能推薦刷包裹
3. 需要時請補上層板
4. 無材積(裸箱)若上滿無法上架,整理成一落並貼上「上架排序 0」,讓下一班夥伴優先上架,並【拍照】回報群組

【關鍵字】上架 注意事項
【標準答案】
上架時注意事項:
1. 物流箱塞滿各走道:走到 C 區上架,就直接拿 C 走道物流箱的包裹繼續刷;從 C 走到 A,再拿 A 走道的,減少來回走動時間
2. 小包裹拿完再拿大包裹,較容易打開同一區櫃位
3. 無材積資訊,先丟旁邊物流箱,最後手動上架
4. 同取件人櫃位若塞不下,務必按【無法放入】
5. 最後一顆包裹上完,務必按【完成上架】,避免最後一顆沒綁定到櫃位
6. PDA 顯示剩餘 1% 櫃位、以及無小包裹無法放入層架時,請停止上架

【關鍵字】上架秒數
【標準答案】
上架秒數計算規則(每顆包裹上架間隔的平均秒數):
1. 上完最後一顆包裹,一定要按「完成上架」,系統才會停止計算
2. 二次上架前,務必間隔「20 分鐘」
3. 專心上架,中途不做任何事情(例如回倉庫、上廁所、包寄件)
4. 上架途中若客人有問題,請他們聯繫客服
5. 層板一定要先備好,避免倉庫來回走

---

## 第7章 手動上架

【關鍵字】手動上架
【標準答案】
手動上架(包裹進店驗收)口訣:開 → 刷 → 放 → 刷 → 關
1. 開:開啟櫃位
2. 刷:刷包裹面單
3. 放:放入包裹
4. 刷:刷儲位 QR Code
5. 關:關閉櫃門

---

## 第8章 寄件包裹|離店裝箱

【關鍵字】離店裝箱 規定
【標準答案】
寄件包裹離店裝箱規定:
1. 所有寄件包裹務必當天裝箱
2. ★上完架後,才能處理寄件裝箱(NDD 寄件時間除外)

【關鍵字】打包離店 SOP
【標準答案】
打包離店 SOP:
1. 備妥空箱
2. 將寄件一次裝完並疊放,由『大』至『小』裝滿
3. 點選『正物流』刷晶片(刷物流箱右邊的晶片)
4. 拿奇異筆摳除 TO 單
5. 擺放『離店』文宣、填上『日期』

【關鍵字】裸箱 離店
【標準答案】
打包離店|裸箱:
1. 疊
2. 刷
3. 貼:TO 單統一貼左上角

【關鍵字】PDA 離店模組 / 正物流 非正物流
【標準答案】
PDA 離店模組選擇:
1. 一般寄件離店裝箱:刷物流箱右邊的晶片,點選『正物流』
2. 異常包裹 TO 單:點選『非正物流』

---

## 第9章 門市環境

【關鍵字】環境整潔
【標準答案】
維持門市環境整潔(繳費機檯面、後場、門口):
1. 清空收據小垃圾桶
2. 工作檯桌面保持整潔

【關鍵字】層板 收好
【標準答案】
離開前,層板一定要收好,不可散落(參考手冊錯誤示範圖)。

---

## 第10章 智取櫃天靈蓋|開啟SOP

【關鍵字】天靈蓋 開啟
【標準答案】
智取櫃天靈蓋開啟方式:
1. 使用天靈蓋鑰匙【十字型粗鑰匙】插入轉開
2. 打開板子【左/右各一個拉柄】
3. 拉柄往【上】拉

【關鍵字】皇丞櫃 天靈蓋
【標準答案】
皇丞櫃天靈蓋開啟方式:
1. 用黑色鑰匙打開板子
2. 中間拉柄往【上】拉

---

## 第11章 遺落包裹|處理SOP

【關鍵字】遺落包裹
【標準答案】
盤點後遺落包裹處理:
1. 使用「遺落包裹重新上架」模組重新上架
2. 記得在智能上架前,先做遺落上架
3. 回報方式:【拍照】回報群組,只要貨態及包裹照即可,上架完成不必拍照(避免拖延上架秒數)

---

## 第12章 異常包裹|處理SOP

【關鍵字】錯店 / 送錯門市
【標準答案】
異常包裹|送錯門市:
1. 整箱都錯店:保留該店 TO 單,下方貼上 TO 單『整箱錯店』
2. 各箱單顆錯店:累積成一箱,並貼上 TO 單『單顆錯店』
3. 回報方式:錯店__件,【拍照】回報群組

【關鍵字】濕包裹 / 破損包裹
【標準答案】
異常包裹|濕/破損包裹:
1. 直接回報 AppSheet
2. 需拍:面單照、濕/破損位置照

【關鍵字】重複件 取消件 遺失件 / 無法驗收
【標準答案】
異常包裹|重複件、取消件、遺失件(無法驗收包裹):
1. 查貨態 spx.tw
2. 取消件、遺失件:裝箱退 SOC,貼「異常包裹」TO 單

---

## 第13章 AppSheet|回報收補空箱

【關鍵字】AppSheet 空箱 回報
【標準答案】
AppSheet 回報收補空箱:
1. 於 AppSheet 完成回報
2. 拍攝已回報畫面,右上角一定要更新!!
3. 【拍照】回報群組

---

## 第14章 寄件櫃|其他注意事項

【關鍵字】寄件櫃 倉庫 / 獨立櫃
【標準答案】
寄件櫃注意事項:
1. 寄件櫃在「倉庫」的智取店:早晚班夥伴離開時請協助放上物流箱,用隔檔區隔隔日包裹
2. 寄件櫃是「獨立櫃」的智取店:早晚班夥伴離開前,在寄件櫃旁放一落空箱(好心賣家會協助裝)

【關鍵字】TMT 門 / 門打不開
【標準答案】
TMT 門操作:
1. 把門打開 > 闔上
2. 拉緊門把
3. 按「開門」
4. 需要耐心等待一會兒(網路較慢)

---

## 第15章 每日到店|回報範本

【關鍵字】到店 回報 / 每日回報項目
【標準答案】
每日到店回報項目(皆需【拍照】回報群組):
1. TO 單打卡
2. 制服照、NDD 橘櫃平板
3. 繳費機、自助寄件機:收據紙水位、測試列印;標籤機、收據機紙捲水位(不低於紅線)、測試列印
4. 盤點後遺落包裹:貨態及包裹照(上架完成不必拍照)
5. 上架完成 PDA 畫面 + TO 單
6. 各異常包裹回報(無材積、錯店、同取件門市)
7. 繳費機異常回報(如有)
8. HD 上架:待上架擺放區、上架完成
9. 無材積(裸箱)貼上架排序「0」
10. 上架完成:先進先出提醒、「離店」先進先出提醒
11. AppSheet 收補空箱完成畫面(右上角要更新)

【關鍵字】晚班 上架前 回報
【標準答案】
晚班上架前,請先文字回報以下箱數,並拍照 WH 箱數:
NDD:
WH:
管制品:
標準:
(讓主管一邊核對,避免漏掉 WH 管制品箱數;有無管制品也要記得上小飛機填寫)

【關鍵字】離店 文字回報 / 離店前回報格式
【標準答案】
離店前文字回報範本:
前班未上箱:__ >填寫上一班的未上箱數
上班箱數:__ >上班前清點所有一般包裹
進貨箱數:__ >上班箱數-前班未上箱=進貨箱數
未上箱數:__ >下班前清點剩下的箱數
離店箱數:__ >上班打包的離店總箱數
NDD箱數:__ >上班前清點 NDD 進店箱數
NDD離店箱數:__ >上班打包的 NDD 箱數,請註明「未收」
FBS箱數:__ >賣家已貼好南北面單
WH箱數:__
WH管制品箱數:__ >有綁束帶的
WH空箱數:__
空箱數:__
宅配上架箱數:__ >晚班上架箱數

【關鍵字】離開前 注意事項
【標準答案】
離開前注意事項(【拍照】回報群組):
1. PDA 插上電源充電
2. 鑰匙回原位
3. TO 單打卡
4. NDD 畫面、擺放位置拍照
5. 關閉後場電燈並確實將門上鎖

---

## 第16章 設備簡易排除

【關鍵字】設備型號 / 印表機認識
【標準答案】
門市印表機型號與用途:
1. 寄件收據:RP-700 (U)
2. 寄件單:Sbarco T4ES 203 dpi (複件 1)
3. 報到單:THERMAL 203DPI #1
4. 工作臺:ZDesigner ZD230-203 dpi ZPL

【關鍵字】標籤機 收據機 無法列印
【標準答案】
標籤機、收據機無法列印|基本排除:
1. 檢查後方的線是否有插好
2. 檢查是否有開機(電源燈恆亮)
3. 檢查是否卡紙
4. 檢查紙捲擺放是否正確
5. 電腦、平板是否已重開機
6. 確認左下角 Windows 關機圖示是否有小橘點:有,重開機並更新,再重新測試列印

【關鍵字】無法列印 進階排除
【標準答案】
標籤機、收據機無法列印|進階排除:
1. 點選左下角 Windows > 設定 > 裝置 > 印表機與掃描器
2. 點開對應機型 > 管理 > 列印測試頁
3. 確認門市系統(point)右上角印表機設定,對應型號:寄件收據 RP-700(U)/寄件單 Sbarco T4ES 203dpi(複件1)/報到單 THERMAL 203DPI #1/工作臺 ZDesigner ZD230-203dpi ZPL
若仍無法排除,請聯繫主管。

【關鍵字】面單模糊 / 只印一半
【標準答案】
標籤機面單模糊、只印出一半:
解決方法:使用酒精擦拭滾輪、清潔殘膠。

【關鍵字】掃描槍 BL6350
【標準答案】
掃描槍 BL6350(底座有 3 顆燈)無法使用:
方法一:
1. 線拔掉重插
2. 掃描說明圖中的 QR code
3. 放回掃碼座,藍燈亮後即可使用
方法二(重新配對):
1. 插上掃描槍,長按 30 秒,聽見嗶嗶聲後放開
2. 再按一次掃描鍵
3. 等【藍】燈變慢閃時,再按一次掃描鍵
4. 直到藍燈恆亮,連線成功

【關鍵字】掃描槍 MS852P
【標準答案】
掃描槍 MS852P(最新型)使用方式:
1. 拿起使用前,務必長按等待連線
2. 亮藍燈代表已連線完成
若無法連線:
1. 拿迴紋針戳重置孔
2. 長按 2 秒亮綠燈、逼一聲後開機
3. 等它自動配對(閃綠光),或自行掃描接收器配對
4. 燈號變成藍色後,即可正常刷取

【關鍵字】Kiosk 電腦 / 寄件平板 開機
【標準答案】
設備開關位置:
1. 工作臺 Kiosk 電腦:重啟按鍵在機身上
2. 寄件平板:開機鍵在上方(鑰匙打開)

【關鍵字】NDD 平板 / 橘櫃平板
【標準答案】
NDD 平板(橘櫃)重啟:
1. 電源鍵、音量鍵同時按壓
2. 開機鍵「按到它強制關機後」再開機

【關鍵字】Mini PC / 寄件櫃主機
【標準答案】
寄件櫃 Mini PC 主機:
1. 主機在寄件櫃那邊,開關機在機器下面
2. 小鍵盤 Alt+F4 一起按 >> 縮小螢幕
3. 桌面網頁連結 point(已是測試列印頁面)
4. 測試列印完,按自助寄件區,切回全螢幕

---

## 第17章 藍芽標籤機|故障排除

【關鍵字】藍芽標籤機 無法列印 TO單
【標準答案】
藍芽標籤機無法列印 TO 單,依序排除:
1. PDA 設定,重新連線
2. 上架系統,重新連線:印表機選 DA210 / DA220,類型選 SPTO、寄件裝箱單
3. 標籤機重開機、線重插
4. 若亮「紅燈」,請按出紙鍵重新印出(黃色為正常亮燈)

【關鍵字】藍芽標籤機 參數錯誤
【標準答案】
藍芽標籤機出現【參數錯誤】:
重新設定:印表機選 DA210 / DA220,類型選 SPTO、寄件裝箱單。

【關鍵字】藍芽標籤機 Time Out
【標準答案】
藍芽標籤機出現【Time Out】:
1. 門市系統連線逾時 >> 上架系統滑掉重開即可
2. 並確認標籤機是否有正常裝紙

---

## 第18章 FBS 打包模組

【關鍵字】FBS 處理流程
【標準答案】
FBS 處理流程(FBS 皆使用專用紙箱,賣家會自己貼好裝箱南北單 TO 單,夥伴請勿往紙箱上貼貼紙):
Step1:PDA 進入 AppSheet,點【FBS每日寄件箱回報】,檢查門市所有區域,找出當下所有 FBS 環保無包裝包裹(AppSheet 欄位數量僅供參考,以當天實際門市數量為主)
Step2:將 FBS 環保無包裝包裹相疊,放在 WH 離店擺放區;FBS 需南、北分落,並擺上 FBS 南北標示文宣
Step3:AppSheet 上傳照片及南北數量,拍照回報群組,請於 21:00 前完成(以證明擺放位置正確,避免司機收錯)

---

## 第19章 包裹重新分配

【關鍵字】包裹重新分配 流程
【標準答案】
包裹重新分配流程:
步驟1:PDA 點選「包裹重新分配」(會顯示需完成的任務數)
步驟2、3:走到指定櫃(例:E5-15/16),按「開啟櫃位」
步驟4:拿出櫃內的包裹
步驟5:PDA 刷包裹條碼,出現綠✅代表刷成功,接著關閉舊櫃門
步驟6:移動到新的指定櫃位(例:C10-01),PDA 按「開啟櫃門」
步驟7:先刷包裹
步驟8:再刷新櫃位 QR Code,出現綠✅,包裹放入後務必按「完成」,關閉新櫃門
重複步驟 2-8,直到完成全部任務;歸 0 後,PDA 畫面拍照回報(畫面會顯示完成任務數)。
注意:新櫃位 QR Code 若同時開啟兩個以上(例 A1-01/A1-02),需刷完 A1-01、A1-02 綁定櫃位,才會出現綠✅。
口訣:開(任務開櫃門)→ 刷(包裹條碼)→ 開(開啟櫃門)→ 刷(包裹條碼)→ 刷(儲位條碼)→ 關(關閉櫃門)

【關鍵字】重新分配 無法放入
【標準答案】
包裹重新分配|包裹無法放入新櫃位:
1. 刷包裹後按【無法放入】
2. 重新上架新包裹:再刷包裹,開啟原櫃放回
口訣:開(任務開櫃門)→ 刷(包裹條碼)→ 開(按開啟櫃門)→ 刷(包裹條碼)→ 按(無法放入)→ 按(重新上架包裹)→ 刷(包裹條碼)→ 刷(儲位條碼)→ 關(關閉櫃門)

【關鍵字】重新分配 找不到包裹
【標準答案】
包裹重新分配|沒有找到包裹或無法上架:
異常回報並說明原因。
若異常後又找到包裹:直接刷包裹即可。

---

## 第20章 HD 宅配(來源:雲端 HD 資料夾)

【關鍵字】HD 流程 / HD 時段 / SCSHD
【標準答案】
HD 門市流程時段:
1. 20:00-21:00:打包 SCSHD 第一次,打包完「放後場」,晚上不用上架(21:00 前打包完畢)
2. 21:00 開始上架「Normal HD」,只上一般宅配;櫃內「所有」包裹先重新刷過
3. 08:00-10:00:打包 SCSHD 第二次,打包完「放後場」(10:00 前打包完畢)
4. 11:00-12:00:上架 SCSHD(1)+(2),從後場拿出前兩次打包完的 SCSHD 包裹,只上 SCSHD
注意:所有步驟皆有截止時間,達成率只計時間內完成的數量。

【關鍵字】HD 常見錯誤 / 一般宅配 注意事項
【標準答案】
HD 一般宅配常見錯誤(HD 櫃相關異常直接在群組反應即可,無需上 AMS 申請):
1. 上架前務必清空 HD 櫃:21:00 開啟全部櫃位後,第一步先刷櫃內剩餘包裹(HD+SCSHD),避免包裹被視為遺失
2. 就算櫃子已滿,場內所有包裹也必須全數過刷並按「無法放入」,包裹才有到店紀錄
3. 上架順序:先舊後新、先大後小(大的先進櫃,旁邊塞小的更省空間)
4. 錯店/破損包裹(能重包配送)請隨 NDD 離店;小破損門市簡單修復,大破損回 NDD 轉 SOC 重新包裝

【關鍵字】特選宅配
【標準答案】
特選宅配常見錯誤:
1. 大材積包裹(破壞袋裝不下時):分多袋裝,最後用膠帶捆成一包,「只須貼一張面單」
2. 重印面單時,務必同時核對「單號+姓名」(同名買家可能有多筆訂單)
3. 打包後發現漏刷:請勿把漏刷商品直接塞回袋中
4. 封口黏貼務必緊密貼合、不要有洞口,黏貼處不可裸露在外
5. 櫃子塞滿時:系統按「無法放入」,包裹放後場暫存區,勿擅自放到其他櫃位

---

## 第21章 SCS / FBS 異常件(退回 WH)

【關鍵字】SCS 異常 / FBS 異常 / RTS
【標準答案】
SCS、FBS 異常件處理(6/2 起,無需等待 RTS,可直接送回 WH;重點:有什麼貼什麼):
1. 若有 RTS 和異常件:合併一箱一起回去,不需使用異常 TO 袋,分別貼 RTS 與異常的 TO 單(上下各貼一張、不重疊)
2. 若當日只有 RTS 或只有異常件:不需等待,直接貼對應 TO 單送回 WH
3. 破損漏液:自己一箱回 WH(避免污染沒瑕疵的商品)
4. SCS 和 FBS 不能裝同一箱(SCS 異常跟 RTS 一箱、FBS 異常跟 RTS 一箱)

---

## 通用規則(機器人固定回覆)

【關鍵字】(知識庫中找不到答案時)
【標準答案】
這個問題不在教育訓練手冊範圍內,請聯繫主管確認,謝謝。
```

完成後請回報 commit 連結,並確認 repo 檔案清單中三個檔案都已更新、knowledge.md 第一行是「# 智取店小幫手 知識庫 v3.0」。
