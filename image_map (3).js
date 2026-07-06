// ============================================================
// IMAGE_MAP v3.1 — 智取店小幫手 圖片對應表
// ============================================================

const IMG = (id) => `https://lh3.googleusercontent.com/d/$${id}`; // 修正了 ${id}

const IMAGE_MAP = [
  // ---------- 藍芽標籤機 (精準項目，優先排在有線標籤機之前) ----------
  {
    keywords: /藍[芽牙]標籤機.*(無法(列印|印)|TO單|排除|連線)/i,
    images: [
      IMG('1rJpPLwt88yxutlOdi9fsHkYE1QcjJaMT'), 
      IMG('1eTemRWa1Kv77HNmFqFnQ1wqyTm5b82Zh'), 
      IMG('1W7ykVTSPvtK7Bi_s1PUSQgfy0YxbcTVc'), 
      IMG('1VZT_tTow-LFl2_O9rFtt1I8eKKLUNyxR'), 
    ],
  },
  {
    keywords: /time\s*out|逾時/i,
    images: [IMG('1MT5JZB5mdgXPpccxw6h9IAIjtIDeuO0Y')], 
  },
  {
    keywords: /參數錯誤/,
    images: [IMG('1eTemRWa1Kv77HNmFqFnQ1wqyTm5b82Zh')], 
  },

  // ---------- 立保繳費機 ----------
  {
    keywords: /立保.*(卡紙)|卡紙.*(立保)/,
    images: [IMG('15X8UefD8Byno1fFoX8Icwc19-b9DQGWK')], 
  },
  {
    keywords: /立保.*(打不開|門.*(開|鎖)|開不了)/,
    images: [IMG('1EpHHpm2we2VVbv1E-stYZJku-v5gCni3')], 
  },
  {
    keywords: /繳費機.*(無法(列印|印)|不出紙|印不出|收據.*(印不出|不出))/,
    images: [IMG('118Sz7SrZi6OeQhgIrt2g-mNB5-gzAxn2')], 
  },

  // ---------- AMS 資產管理 / 報修 ----------
  {
    keywords: /AMS|報修|資產申請|維修申請|耗材.*(申請|叫貨)/i,
    images: [
      IMG('1s8XJ_tv47yG0jgjC3Yf370RT-6osGxUa'), 
      IMG('1VLpCnJNu14bN0a3KUnze5OWZ7K93E4vw'), 
      IMG('1ihXbrr7E4TpG2vNA3cg1lWx1Abjmx8Qo'), 
    ],
  },

  // ---------- 標籤機 / 收據機(USB 有線) ----------
  {
    keywords: /(標籤機|收據機).*(無法(列印|印)|印不出|不能印|簡易排除)/,
    images: [
      IMG('1T7O4iOYcG42xzecfrMpwx15fdllnL_iy'), 
      IMG('1TrQ8TstavX-JBkDCKWkIOM3HeBudoAag'), 
      IMG('1BMexbvlgJtflJUj6WfDNmyjEuV35AmVF'), 
      IMG('1j3tmiGHhTJ_40n_8XPkRvMvnOlYVz3_f'), 
    ],
  },
  {
    keywords: /(面單|標籤).*(模糊|印.*一半|印不完整)/,
    images: [IMG('1QKsVDkv78naN41k2jjE7JcBkqxj-3u2P')], 
  },
  {
    keywords: /(認識|型號|哪台|長怎樣).*(印表機|標籤機|收據機)|(印表機|標籤機|收據機).*(型號|認識)/,
    images: [
      IMG('1VZBHkDhtJMEZKRcHzS0xrecL6Bau0P8V'), 
      IMG('1yjFLUk_tjjfEScV4xllTB3TWMYtsGbeC'), 
    ],
  },

  // ---------- 掃描槍 / 平板 / 主機 ----------
  {
    keywords: /MS852P|掃描槍|掃碼槍/i,
    images: [
      IMG('1zQr5giGEp9RAVT-9I8XWI5GSNFCBKFNS'), 
      IMG('1NDM4d9eD_KhSbshHb7d5qpUniFmooRCj'), 
    ],
  },
  {
    keywords: /(Kiosk|寄件平板).*(開機|重啟|重開|按鍵)/i,
    images: [IMG('1dHSjOE8Ditd9yXHXs48TrjAwl-qgC5sA')], 
  },
  {
    keywords: /(NDD|橘櫃).*(平板).*(開機|重啟|重開)|橘櫃平板/i,
    images: [IMG('132pLwiPuXhxo4z0IcrpIenzgpktio-58')], 
  },
  {
    keywords: /mini\s*pc|寄件櫃.*(主機|電腦)/i,
    images: [IMG('1lGz7SgsOv4pjxtWNaJjdNyqDoiWTnESZ')], 
  },

  // ---------- 上架 ----------
  {
    keywords: /上架.*(SOP|流程|怎麼|如何)|智能上架/,
    images: [IMG('1GuoesZtPOrNrsS0lWEZMPlrs8v6DuRmZ')], 
  },
  {
    keywords: /上架.*(秒數|效率)/,
    images: [IMG('1KNZqEhVsL1M2VRUTYsOQXrU1x995vjfy')], 
  },
  {
    keywords: /上架完成.*(回報|拍照)/,
    images: [IMG('1-tOrVUGr6Irk_UQ0UFrMd0ouq9huyo3l')], 
  },
  {
    keywords: /裸箱|上架排序\s*0|排序0/,
    images: [IMG('1KQKUwquvy7GhJSCXAz3laTzSQILle5PJ')], 
  },

  // ---------- 異常包裹 / SCS FBS ----------
  {
    keywords: /異常包裹.*(回報)|回報.*(異常包裹)/,
    images: [IMG('1OZ42fmIYABx7n_diPvocQ8qAbVWW2fkL')], 
  },
  {
    keywords: /查貨態|spx\.tw|重複件|取消件|遺失件/i,
    images: [IMG('1JTJubDgCiPdNetAVHSReFEkNAPP8ENtk')], 
  },
  {
    keywords: /SCS.*(異常|RTS)|FBS.*(異常)|RTS|異常.*(離店|裝箱)/i,
    images: [
      IMG('1VQGXVTCABByshNng5xFDcMxCxsZnTsfu'), 
      IMG('1UKq--UDarww2G6YdOkzbjHf-4l653d-p'), 
      IMG('1kKZCBGOQ4_oQI7QErWE_-qJRIh1PTSc5'), 
      IMG('1AzUw1KilHl7w6zTTTyrAHCgwWjxUsU3i'), 
    ],
  },
  {
    keywords: /夾鏈袋|裸裝.*(太大|裝不)|裝不進.*(袋)/,
    images: [IMG('1iYgj3Qs2xA8d_Fzzbqi-ZTY38nHaW5Kf')], 
  },

  // ---------- FBS 打包 ----------
  {
    keywords: /FBS.*(離店|裝箱|逐顆)|環保無包裝.*(逐顆|裝箱)/i,
    images: [
      IMG('1dJ3vmHoG-d87eo-LEP3rIWzsPo6IxM2x'), 
      IMG('1rNhyxYpMMnSpWDIDz0nPO-lmtjACHH6w'), 
      IMG('1XRhtiw5FusYHimtqVPP-bpyXFHStLOUj'), 
      IMG('1RJYuLra73UjG3_OCYpL2JtBdzHsrNwoL'), 
    ],
  },
  {
    keywords: /FBS.*(打包|流程|處理|回報)/i,
    images: [
      IMG('1FffvrcX3UitTcGKgFXtQRIzeSWXFo73Y'), 
      IMG('1SZxScUgTDYT72IWoY8rSY47eyu_CivD-'), 
      IMG('1VQ9NOXRm14nlCkGfGgVbV3DlxBo97Jse'), 
      IMG('1EiD_WO1Nzr4w4YNbn3Dz6WMKn_Me6mnG'), 
    ],
  },

  // ---------- HD 宅配 / SCS HD ----------
  {
    keywords: /HD.*(流程|時間|時段|打包|上架順序)|SCSHD/i,
    images: [
      IMG('16zG3_pmASdtIwGMhVMffNtq_zkHFanb3'), 
      IMG('1pOfx6nxWEzBMst9PuaKl5P0nmC4iTSK7'), 
      IMG('1oN6jX4nvNOFM19dtd3BDcIyOlmV3QNUf'), 
      IMG('1kpZZndOZTaKIlUCm5CtyDyit2jYWVUcS'), 
    ],
  },
  {
    keywords: /HD.*(常見錯誤|注意)|一般宅配.*(錯誤|注意)/i,
    images: [IMG('12yabT9IamAeZTYpq9TzvT0XRylT_OrRf')], 
  },
  {
    keywords: /特選宅配/,
    images: [IMG('18O7IzS44POYki8g5xOl1mHh7hlVg5Pce')], 
  },
  {
    keywords: /(宅配|HD).*(待上架|回報)/i,
    images: [IMG('1XLc1JRRFS3yRmzMMH2ib3pGQ9iLg2gxy')], 
  },

  // ---------- 回報 ----------
  {
    keywords: /晚班.*(回報|管制品)|管制品/,
    images: [IMG('1mYFSww_dh7t6iqSSuecas4occO1rZ4Gi')], 
  },
  {
    keywords: /AppSheet|收補空箱|空箱.*(回報)/i,
    images: [
      IMG('1Oye6KTvsxquIYmY8JcG-AlLCwuG_c6g-'), 
      IMG('1gqJXWamfN69U0fImv1l0PsZz_gOB4yb_'), 
    ],
  },

  // ---------- 其他 ----------
  {
    keywords: /TMT|門.*(關不|打不開|鎖)/i,
    images: [IMG('1bQlIjHKDMNu9XSMOZ88YuI4VTVqqQu4j')], 
  },
  {
    keywords: /包裹重新分配|重新分配/,
    images: [
      IMG('1veJ3dqNuY2YKdus27WM5U8qw4WYLhEXj'), 
      IMG('1BwbCA_rnkvL5KVlO6i8qbPnsWyTvOL0i'), 
      IMG('1Rp4LsK1ozutHzAve69Xo3uCZKSDne2q_'), 
      IMG('11R9kMWkgPN2qjPokXkLRVkTMfB4T3joD'), 
    ],
    videoLink: 'https://drive.google.com/file/d/1ALtufuScqKBveuWg6HwJP7AyQjp40vas/view',
  },
];

function matchImages(userText, maxImages = 4) {
  for (const entry of IMAGE_MAP) { // 修正：加上了 const
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
