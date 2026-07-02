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

// ------------------------------------------------------------
// index.js 使用範例:
//
// const { matchImages } = require('./image_map');
// ...
// const answerText = await askClaude(userText);           // 知識庫文字答案
// const { messages: imageMsgs, videoLink } = matchImages(userText);
// const replyMessages = [
//   { type: 'text', text: videoLink ? `${answerText}\n\n教學影片:${videoLink}` : answerText },
//   ...imageMsgs,                                          // 文字1則+圖最多4張=5則,不超過 LINE 上限
// ];
// await client.replyMessage(event.replyToken, replyMessages);
// ------------------------------------------------------------
