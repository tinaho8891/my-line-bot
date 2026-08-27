// ============================================================
// search.js — 知識庫本地比對引擎(不呼叫任何 AI API,零成本)
// 取代原本的 Claude 呼叫:直接從 knowledge.md 找出最符合的
// 【標準答案】並原文輸出,行為與原 system prompt 的要求一致。
// ============================================================

'use strict';

const fs = require('fs');
const path = require('path');

// ---------- 正規化:讓「立保卡紙」「立保 卡紙」「立保卡紙?」都一樣 ----------
function normalize(s) {
  return String(s || '')
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)) // 全形→半形
    .toLowerCase()
    .replace(/[\s　]+/g, '')
    .replace(/[,、，。.?？!！:：;；~～\-_()（）\[\]【】"'`]/g, '');
}

// ---------- 去除問句填充詞 ----------
// 「管制品要怎麼回報」和「管制品回報」應該是同一題。
// 只作用在使用者的問題上,知識庫內容不動。
const FILLERS = [
  '請問', '想請問', '我想知道', '幫我', '可以幫我', '麻煩',
  '怎麼辦', '怎麼樣', '怎樣', '怎麼', '如何', '要如何',
  '是什麼', '什麼', '為什麼', '哪裡', '哪一個', '哪個',
  '該', '要', '的', '了', '嗎', '呢', '呀', '喔', '啊', '吧',
];
function stripFillers(s) {
  let out = s;
  for (const f of FILLERS) out = out.split(f).join('');
  return out || s; // 全被刪光就退回原字串
}

// ---------- 解析 knowledge.md ----------
// 條目格式:【關鍵字】... 換行 【標準答案】...(到下一個【關鍵字】或 ## 或 --- 為止)
function parseKnowledge(raw) {
  const lines = raw.split(/\r?\n/);
  const entries = [];
  let chapter = '';
  let cur = null;

  const flush = () => {
    if (cur) {
      cur.answer = cur.answerLines.join('\n').replace(/^\s*\n+/, '').replace(/\s+$/, '');
      if (cur.answer) entries.push(cur);
      cur = null;
    }
  };

  for (const line of lines) {
    const chapterMatch = line.match(/^##\s*(.+?)\s*$/);
    if (chapterMatch) {
      flush();
      chapter = chapterMatch[1];
      continue;
    }

    const kwMatch = line.match(/^【關鍵字】\s*(.*)$/);
    if (kwMatch) {
      flush();
      const terms = kwMatch[1]
        .split(/[\/／、,，]|\s+/)
        .map((t) => t.trim())
        .filter(Boolean);
      cur = { chapter, rawKeywords: kwMatch[1].trim(), terms, answerLines: [], collecting: false };
      continue;
    }

    if (!cur) continue;

    if (/^【標準答案】/.test(line)) {
      cur.collecting = true;
      const inline = line.replace(/^【標準答案】\s*/, '');
      if (inline) cur.answerLines.push(inline);
      continue;
    }

    if (cur.collecting) {
      if (/^---\s*$/.test(line)) continue; // 分隔線不納入答案
      cur.answerLines.push(line);
    }
  }
  flush();

  // 預先算好比對用的正規化字串
  for (const e of entries) {
    e.normTerms = e.terms.map(normalize).filter(Boolean);
    e.normChapter = normalize(e.chapter);
    e.normAnswer = normalize(e.answer);
  }
  return entries;
}

// ---------- 相似度:字元 bigram 交集(對中文有效,不需斷詞) ----------
function bigrams(s) {
  const out = new Set();
  if (s.length === 1) out.add(s);
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  return out;
}

function overlapRatio(queryGrams, term) {
  const tg = bigrams(term);
  if (tg.size === 0) return 0;
  let hit = 0;
  for (const g of tg) if (queryGrams.has(g)) hit++;
  return hit / tg.size;
}

// ---------- 計分 ----------
// 完整包含 > 高比例 bigram 重疊 > 答案內文命中 > 章節標題命中
function scoreEntry(entry, nq, queryGrams, vocab) {
  let score = 0;
  let hitTerms = 0;

  for (const term of entry.normTerms) {
    if (!term) continue;
    if (nq.includes(term)) {
      // 完全命中:詞越長越有鑑別度(「立保」2字 < 「收據紙安裝」5字)
      score += 10 + term.length * 4;
      hitTerms++;
      continue;
    }
    const ratio = overlapRatio(queryGrams, term);
    if (ratio >= 0.6) {
      score += 6 * ratio * Math.min(term.length, 6);
      hitTerms++;
    } else if (ratio >= 0.34) {
      score += 2 * ratio * Math.min(term.length, 6);
    }
  }

  // 多個關鍵字同時命中 → 加權(例如「立保」+「卡紙」都中,比只中「立保」可信得多)
  if (hitTerms >= 2) score *= 1.35;
  if (hitTerms >= 3) score *= 1.15;

  // 章節標題命中(較弱的輔助訊號)
  if (entry.normChapter) {
    const cr = overlapRatio(queryGrams, entry.normChapter);
    if (cr >= 0.5) score += 4 * cr;
  }

  // 答案內文命中(弱訊號)——救回「耗材申請」「管制品」這類
  // 內容確實存在、只是沒被寫進【關鍵字】的問題。
  // 用「問題的 bigram 有多少比例出現在答案內文」衡量,門檻抓高,
  // 避免答案剛好出現「回報」兩個字就被誤判。
  if (score < 30 && entry.normAnswer) {
    let covered = 0;
    for (const g of queryGrams) if (entry.normAnswer.includes(g)) covered++;
    const coverage = queryGrams.size ? covered / queryGrams.size : 0;
    if (coverage >= 0.6) score += 26 * coverage;
  }

  // 實體不符懲罰 ——「立保門打不開」不該回「TMT 門」。
  // 若問題帶有高鑑別度的詞(立保/博辰/瑞興/HD/FBS…),
  // 而這個條目的關鍵字與內文都沒有它,代表講的根本不是同一件事。
  // 用乘法而非減法:不管原本分數多高,實體對不上就整體失效。
  for (const t of vocab.distinctiveInQuery) {
    const inTerms = entry.normTerms.some((x) => x.includes(t) || t.includes(x));
    if (!inTerms && !entry.normAnswer.includes(t)) score *= 0.22;
  }

  return score;
}

const MIN_SCORE = 14; // 低於此分視為「知識庫沒有這題」
const SECOND_RATIO = 0.75; // 第二名達第一名的 75% 才一起輸出

function createSearcher(knowledgePath) {
  const raw = fs.readFileSync(knowledgePath || path.join(__dirname, 'knowledge.md'), 'utf8');
  // 「通用規則」章節是機器人的固定回覆範本,不參與比對
  const entries = parseKnowledge(raw).filter(
    (e) => !/通用規則/.test(e.chapter) && !/找不到答案/.test(e.rawKeywords)
  );

  // 建立詞彙表與「文件頻率」:出現在越少條目的詞,鑑別度越高。
  // 例如「立保」只出現在少數條目 → 高鑑別度;「回報」到處都是 → 低。
  const docFreq = new Map();
  for (const e of entries) {
    for (const t of new Set(e.normTerms)) {
      if (t.length >= 2) docFreq.set(t, (docFreq.get(t) || 0) + 1);
    }
  }
  const vocabTerms = [...docFreq.keys()].sort((a, b) => b.length - a.length);
  const DISTINCTIVE_MAX_DF = 3; // 出現在 3 個(含)以下條目 → 視為高鑑別度實體

  function buildVocab(nq) {
    const queryTerms = [];
    const distinctiveInQuery = [];
    for (const t of vocabTerms) {
      if (!nq.includes(t)) continue;
      queryTerms.push(t);
      if (docFreq.get(t) <= DISTINCTIVE_MAX_DF) distinctiveInQuery.push(t);
    }
    return { queryTerms, distinctiveInQuery };
  }

  function search(userText) {
    const nq = stripFillers(normalize(userText));
    if (!nq) return { matches: [], scored: [] };
    const queryGrams = bigrams(nq);
    const vocab = buildVocab(nq);

    const scored = entries
      .map((e) => ({ entry: e, score: scoreEntry(e, nq, queryGrams, vocab) }))
      .filter((r) => r.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) return { matches: [], scored: [] };

    const matches = [scored[0]];
    if (scored[1] && scored[1].score >= scored[0].score * SECOND_RATIO) {
      matches.push(scored[1]);
    }
    return { matches, scored };
  }

  // 產生要回覆的文字:原文照抄,多筆時以章節標題分隔
  function answer(userText) {
    const { matches } = search(userText);
    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0].entry.answer;
    return matches
      .map((m) => `【${m.entry.chapter.replace(/^第\d+章\s*/, '')}】\n${m.entry.answer}`)
      .join('\n\n──────────\n\n');
  }

  return { entries, search, answer, normalize };
}

module.exports = { createSearcher, parseKnowledge, normalize };
