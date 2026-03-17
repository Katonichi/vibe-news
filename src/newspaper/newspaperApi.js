import { GoogleGenAI } from '@google/genai';
import {
  buildMultiGeneralPrompt,
  buildMultiZennPrompt,
  buildMultiQiitaPrompt,
  buildMultiYoutubePrompt,
  buildMultiTechCrunchPrompt,
  buildArticlePrompt,
  buildQaPrompt,
  buildColumnPrompt,
  buildFooterPrompt,
  buildAutoAssignPrompt,
  CHAR_LIMITS,
  HEADLINE_LIMITS,
  SUBHEADLINE_LIMITS,
  QA_CHAR_LIMITS,
} from './newspaperPrompts';
import { logger } from './logger';

const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

function getAi(apiKey) {
  return new GoogleGenAI({ apiKey });
}

/**
 * APIレスポンステキストからJSONを解析する。
 * 失敗した場合は応答テキストを含む詳細なエラーを投げる。
 */
function parseJsonResponse(text, context = '') {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  logger.info(`[parseJsonResponse] 解析開始${context ? ` [${context}]` : ''}`, {
    rawLength: text.length,
    cleanedLength: cleaned.length,
    preview: cleaned.slice(0, 200),
  });

  try {
    const result = JSON.parse(cleaned);
    logger.info(`[parseJsonResponse] 解析成功${context ? ` [${context}]` : ''}`, {
      type: Array.isArray(result) ? `array(${result.length})` : typeof result,
    });
    return result;
  } catch (e) {
    // エラー箇所の前後を切り出す
    const errorPos = extractErrorPosition(e.message);
    const snippet = errorPos !== null
      ? cleaned.slice(Math.max(0, errorPos - 80), errorPos + 120)
      : cleaned.slice(0, 500);

    logger.error(`[parseJsonResponse] JSON解析失敗${context ? ` [${context}]` : ''}`, {
      parseError: e.message,
      errorPosition: errorPos,
      errorSnippet: snippet,
      fullResponseRaw: text,
      fullResponseCleaned: cleaned,
    });

    const snippetMsg = errorPos !== null
      ? `エラー位置 ${errorPos} 付近: 「${snippet}」`
      : `応答先頭500文字: 「${snippet}」`;

    throw new Error(
      `JSON解析エラー${context ? ` [${context}]` : ''}: ${e.message}\n` +
      `${snippetMsg}\n` +
      `※詳細は data/logs/newspaper_${logger.sessionId}.log を確認してください`
    );
  }
}

/** エラーメッセージから文字位置を抽出 */
function extractErrorPosition(message) {
  const m = message.match(/position (\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Gemini API を呼び出す共通関数。
 * プロンプトと応答の全文をログに記録する。
 *
 * @param {object} options
 * @param {boolean} options.useSearch - Google Search grounding を使用するか。
 * @param {number|null} options.thinkingBudget - thinking トークン上限。
 *   null=デフォルト（モデル任せ）、0=thinking無効。
 *   Search有効+JSON出力の場合は 0 にして思考テキスト漏れを防ぐ。
 *   Search無効+JSON出力の場合は null にしてthinking推論で文字数制御の精度を上げる。
 */
async function callGemini(apiKey, prompt, useSearch = false, context = '', expectJson = false, thinkingBudget = undefined) {
  const ai = getAi(apiKey);

  // thinkingBudget が明示指定されなかった場合のデフォルト:
  // Search + JSON → 0 (思考テキスト漏れ防止)
  // Search無し + JSON → null (thinking有効で文字数推論)
  // その他 → undefined (設定しない)
  let effectiveThinkingBudget = thinkingBudget;
  if (effectiveThinkingBudget === undefined) {
    if (expectJson && useSearch) {
      effectiveThinkingBudget = 0;
    } else if (expectJson && !useSearch) {
      effectiveThinkingBudget = null; // モデルに任せる（thinking有効）
    }
  }

  const config = {
    ...(useSearch ? { tools: [{ googleSearch: {} }] } : {}),
    ...(effectiveThinkingBudget === 0 ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
  };

  const thinkingEnabled = effectiveThinkingBudget !== 0;

  logger.info(`[callGemini] API呼び出し開始${context ? ` [${context}]` : ''}`, {
    model: GEMINI_MODEL,
    useSearch,
    expectJson,
    thinkingEnabled,
    thinkingBudget: effectiveThinkingBudget,
    promptLength: prompt.length,
    promptPreview: prompt.length > 300 ? prompt.slice(0, 300) + `（※全${prompt.length}文字中、先頭300文字のみ表示）` : prompt,
  });

  let response;
  try {
    response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config,
    });
  } catch (e) {
    logger.error(`[callGemini] API呼び出し失敗${context ? ` [${context}]` : ''}`, {
      errorMessage: e.message,
      errorStatus: e.status,
      errorStack: e.stack,
    });
    throw e;
  }

  const candidate = response.candidates?.[0];
  // thinking有効時は parts に thought part と text part が混在する。
  // thought=true ではないpartからテキストを取得する。
  const parts = candidate?.content?.parts || [];
  const textPart = parts.find(p => !p.thought && p.text) || parts[0];
  const text = textPart?.text;

  logger.info(`[callGemini] API応答受信${context ? ` [${context}]` : ''}`, {
    finishReason: candidate?.finishReason,
    partsCount: parts.length,
    hasThoughtParts: parts.some(p => p.thought),
    responseLength: text?.length ?? 0,
    responsePreview: text?.slice(0, 300) ?? '(empty)',
    hasGroundingMetadata: !!candidate?.groundingMetadata,
    fullResponse: text,
  });

  // JSON形式が期待される呼び出しで、応答にJSONらしい文字が含まれない場合を警告
  if (text && !text.includes('{') && !text.includes('[')) {
    logger.warn(`[callGemini] 応答にJSONが含まれていません${context ? ` [${context}]` : ''}`, {
      responsePreview: text.slice(0, 300),
    });
  }

  if (!text) {
    const detail = {
      candidatesCount: response.candidates?.length ?? 0,
      finishReason: candidate?.finishReason,
      safetyRatings: candidate?.safetyRatings,
    };
    logger.error(`[callGemini] レスポンスが空${context ? ` [${context}]` : ''}`, detail);
    throw new Error(
      `レスポンスが空です${context ? ` [${context}]` : ''}。` +
      `finishReason: ${candidate?.finishReason ?? 'unknown'}。` +
      `※詳細は data/logs/newspaper_${logger.sessionId}.log を確認してください`
    );
  }

  return text;
}

const MULTI_TOPIC_SOURCES = [
  { key: 'general', promptFn: buildMultiGeneralPrompt },
  { key: 'zenn', promptFn: buildMultiZennPrompt },
  { key: 'qiita', promptFn: buildMultiQiitaPrompt },
  { key: 'youtube', promptFn: buildMultiYoutubePrompt },
  { key: 'techcrunch', promptFn: buildMultiTechCrunchPrompt },
];

// HTMLをdata/YYYYMMDD/ai_newspaper_YYYYMMDD.htmlに保存するAPI呼び出し
export async function saveNewspaperHtml(html) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const dateStr = `${y}${m}${d}`;
  const filename = `ai_newspaper_${dateStr}.html`;

  try {
    const res = await fetch('/api/save-html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, dateStr, filename }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    logger.info('[saveNewspaperHtml] HTML保存成功', { path: data.path });
    return data.path;
  } catch (e) {
    logger.warn('[saveNewspaperHtml] HTML保存失敗', { error: e.message });
    return null;
  }
}

export async function fetchAllTopicsMultiple(apiKey, previousTopics = [], reportHistory = []) {
  logger.info('[fetchAllTopicsMultiple] トピック並列取得開始', {
    sourcesCount: MULTI_TOPIC_SOURCES.length,
    previousTopicsCount: previousTopics.length,
    reportHistoryCount: reportHistory.length,
  });

  const results = await Promise.allSettled(
    MULTI_TOPIC_SOURCES.map(async (source) => {
      const prompt = source.promptFn(previousTopics, reportHistory);
      const text = await callGemini(apiKey, prompt, true, `topics:${source.key}`, true);
      const parsed = parseJsonResponse(text, `topics:${source.key}`);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      return items.map((item) => ({ ...item, source: source.key }));
    })
  );

  const topics = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      topics.push(...result.value);
    } else {
      logger.warn('[fetchAllTopicsMultiple] ソース取得失敗', { reason: result.reason?.message });
    }
  }

  logger.info('[fetchAllTopicsMultiple] 取得完了', { topicsCount: topics.length });

  if (topics.length === 0) {
    throw new Error('すべてのソースからトピック取得に失敗しました。');
  }

  return topics;
}

export async function autoAssignSlots(apiKey, topics) {
  logger.info('[autoAssignSlots] スロット自動割り当て開始', { topicsCount: topics.length });

  const prompt = buildAutoAssignPrompt(topics);
  const text = await callGemini(apiKey, prompt, false, 'autoAssign', true);
  const indices = parseJsonResponse(text, 'autoAssign');

  const assignment = {};
  for (const [slotKey, index] of Object.entries(indices)) {
    assignment[slotKey] = topics[index] || null;
  }

  logger.info('[autoAssignSlots] 割り当て完了', {
    slots: Object.keys(assignment),
    assignment: Object.fromEntries(
      Object.entries(assignment).map(([k, v]) => [k, v?.title ?? null])
    ),
  });

  return assignment;
}

// 半角文字を0.6文字としてカウント
function countHalfWidthAdjusted(text) {
  let count = 0;
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (
      (code >= 0x0020 && code <= 0x007e) ||
      (code >= 0xff61 && code <= 0xff9f)
    ) {
      count += 0.6;
    } else {
      count += 1;
    }
  }
  return count;
}

function countChars(paragraphs) {
  return countHalfWidthAdjusted(paragraphs.join(''));
}

const COLUMN_CHAR_LIMITS = { min: 350, max: 450 };

async function generateColumnWithRetry(apiKey, columnAuthor, allTopics, maxRetries = 3) {
  let retryInfo = null;
  const limits = COLUMN_CHAR_LIMITS;
  let bestResult = null;
  let bestDiff = Infinity;

  logger.info('[generateColumnWithRetry] コラム生成開始');

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      logger.info(`[generateColumnWithRetry] リトライ ${attempt}/${maxRetries}`, {
        retryActual: retryInfo?.actual,
      });
    }

    const prompt = buildColumnPrompt(columnAuthor, allTopics, retryInfo);
    const text = await callGemini(apiKey, prompt, false, `column:attempt${attempt}`, true);

    let column;
    try {
      column = parseJsonResponse(text, `column:attempt${attempt}`);
    } catch (parseError) {
      if (attempt < maxRetries) {
        logger.warn(`[generateColumnWithRetry] JSON解析失敗、リトライ`, { attempt, error: parseError.message });
        retryInfo = null;
        continue;
      }
      throw parseError;
    }

    const charCount = countChars(column.paragraphs || []);
    const targetMid = (limits.min + limits.max) / 2;
    const diff = Math.abs(charCount - targetMid);

    logger.info(`[generateColumnWithRetry] 文字数チェック`, {
      attempt,
      charCount,
      min: limits.min,
      max: limits.max,
      diff,
      ok: charCount >= limits.min && charCount <= limits.max,
    });

    if (diff < bestDiff) {
      bestResult = column;
      bestDiff = diff;
    }

    if (isBodyInRange(charCount, limits)) {
      return column;
    }

    retryInfo = {
      actual: charCount,
      previousText: (column.paragraphs || []).join(''),
    };

    if (attempt === maxRetries) {
      logger.warn(`[generateColumnWithRetry] 文字数調整失敗（最も近い結果を使用）`, {
        charCount,
        bestDiff,
        limits,
      });
      return bestResult;
    }
  }
}

async function generateQaWithRetry(apiKey, topic, maxRetries = 3) {
  let retryInfo = null;
  const limits = QA_CHAR_LIMITS;
  const hlLimits = { min: 8, max: 13 }; // QA_HEADLINE_LIMITS
  const candidates = []; // 全候補を保持

  logger.info('[generateQaWithRetry] QA記事生成開始', { topic: topic.title });

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      logger.info(`[generateQaWithRetry] リトライ ${attempt}/${maxRetries}`, {
        retryInfo: { actual: retryInfo?.actual },
        headlineViolation: retryInfo?.headlineViolation ?? null,
      });
    }

    const prompt = buildQaPrompt(topic, retryInfo);
    const text = await callGemini(apiKey, prompt, false, `qa:attempt${attempt}`, true);

    let qa;
    try {
      qa = parseJsonResponse(text, `qa:attempt${attempt}`);
    } catch (parseError) {
      if (attempt < maxRetries) {
        logger.warn(`[generateQaWithRetry] JSON解析失敗、リトライ`, { attempt, error: parseError.message });
        retryInfo = null;
        continue;
      }
      throw parseError;
    }

    const totalChars = (qa.exchanges || []).reduce(
      (sum, ex) => sum + countHalfWidthAdjusted((ex.speaker || '') + '　' + (ex.text || '')),
      0
    );

    const targetMid = (limits.min + limits.max) / 2;
    const diff = Math.abs(totalChars - targetMid);
    const bodyOk = isBodyInRange(totalChars, limits);

    // QA見出しの文字数検証
    const hlCount = qa.headline ? countHalfWidthAdjusted(qa.headline) : 0;
    const headlineOk = qa.headline && hlCount >= hlLimits.min && hlCount <= hlLimits.max;
    const headlineViolation = headlineOk ? null : { value: qa.headline, count: hlCount, ...hlLimits };

    logger.info(`[generateQaWithRetry] 文字数チェック attempt=${attempt}`, {
      totalChars,
      min: limits.min,
      max: limits.max,
      diff,
      bodyOk,
      headline: qa.headline,
      headlineCount: hlCount,
      headlineOk,
    });

    candidates.push({ qa, totalChars, diff, bodyOk, headlineOk });

    if (bodyOk && headlineOk) {
      return qa;
    }

    retryInfo = {
      ...(bodyOk ? {} : {
        actual: Math.round(totalChars * 10) / 10,
        previousExchanges: qa.exchanges,
      }),
      headlineViolation: headlineViolation || undefined,
    };

    if (attempt === maxRetries) {
      // 全候補から見出しOKと本文OKをそれぞれ独立に探して合成
      const result = pickBestQaComposite(candidates, limits);
      logger.warn(`[generateQaWithRetry] 文字数調整失敗（合成結果を使用）`, {
        compositeSource: result._compositeSource || 'single',
        bodyTotalChars: (result.exchanges || []).reduce(
          (sum, ex) => sum + countHalfWidthAdjusted((ex.speaker || '') + '　' + (ex.text || '')), 0
        ),
        headline: result.headline,
        headlineCount: result.headline ? countHalfWidthAdjusted(result.headline) : null,
        limits,
      });
      return result;
    }
  }
}

// QA: 全候補から見出しと本文をそれぞれ最良のものを選んで合成する
function pickBestQaComposite(candidates, limits) {
  if (candidates.length === 0) return null;

  // 本文が範囲内の候補のうち、diffが最小のもの
  const bodyOkCandidates = candidates.filter(c => c.bodyOk);
  const bestBody = bodyOkCandidates.length > 0
    ? bodyOkCandidates.reduce((a, b) => a.diff < b.diff ? a : b)
    : candidates.reduce((a, b) => a.diff < b.diff ? a : b);

  // 見出しが範囲内の候補
  const hlOkCandidates = candidates.filter(c => c.headlineOk);
  const bestHl = hlOkCandidates.length > 0
    ? hlOkCandidates.reduce((a, b) => a.diff < b.diff ? a : b)
    : null;

  if (!bestHl || bestBody === bestHl) {
    return bestBody.qa;
  }

  // 見出しをbestHlから、本文(exchanges)をbestBodyから合成
  const composite = { ...bestBody.qa, headline: bestHl.qa.headline };
  composite._compositeSource = `body:attempt${candidates.indexOf(bestBody)},hl:attempt${candidates.indexOf(bestHl)}`;

  logger.info(`[pickBestQaComposite] 見出しと本文を別候補から合成`, {
    bodyFrom: `attempt${candidates.indexOf(bestBody)}`,
    hlFrom: `attempt${candidates.indexOf(bestHl)}`,
  });

  return composite;
}

// 本文の文字数判定（±1文字のソフトマージン付き）
function isBodyInRange(charCount, limits) {
  return charCount >= limits.min - 1 && charCount <= limits.max + 1;
}

// 見出し系フィールドの文字数違反をまとめて検出
function validateHeadlines(article, slotKey) {
  const violations = [];

  const hlLimits = HEADLINE_LIMITS[slotKey];
  if (hlLimits && article.headline) {
    const hlCount = countHalfWidthAdjusted(article.headline);
    if (hlCount < hlLimits.min || hlCount > hlLimits.max) {
      violations.push({ field: 'headline', value: article.headline, count: hlCount, ...hlLimits });
    }
  }

  const subLimits = SUBHEADLINE_LIMITS[slotKey];
  if (subLimits && article.subHeadline) {
    const subCount = countHalfWidthAdjusted(article.subHeadline);
    if (subCount > subLimits.max || (subLimits.min > 0 && subCount < subLimits.min)) {
      violations.push({ field: 'subHeadline', value: article.subHeadline, count: subCount, ...subLimits });
    }
  }

  return violations;
}

async function generateArticleWithRetry(apiKey, slotKey, topic, maxRetries = 3) {
  let retryInfo = null;
  const candidates = []; // 全候補を保持

  logger.info(`[generateArticleWithRetry] 記事生成開始`, {
    slotKey,
    topic: topic.title,
  });

  const limits = CHAR_LIMITS[slotKey];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      logger.info(`[generateArticleWithRetry] リトライ ${attempt}/${maxRetries}`, {
        slotKey,
        retryActual: retryInfo?.actual,
        headlineViolations: retryInfo?.headlineViolations?.length ?? 0,
      });
    }

    const prompt = buildArticlePrompt(slotKey, topic, retryInfo);
    const text = await callGemini(apiKey, prompt, false, `${slotKey}:attempt${attempt}`, true);

    let article;
    try {
      article = parseJsonResponse(text, `${slotKey}:attempt${attempt}`);
    } catch (parseError) {
      if (attempt < maxRetries) {
        logger.warn(`[generateArticleWithRetry] JSON解析失敗、リトライ`, {
          slotKey,
          attempt,
          error: parseError.message,
        });
        retryInfo = null;
        continue;
      }
      throw parseError;
    }

    if (!limits) {
      logger.info(`[generateArticleWithRetry] 文字数制限なし、完了`, { slotKey });
      return article;
    }

    const charCount = countChars(article.paragraphs || []);
    const targetMid = (limits.min + limits.max) / 2;
    const diff = Math.abs(charCount - targetMid);
    const bodyOk = isBodyInRange(charCount, limits);
    const headlineViolations = validateHeadlines(article, slotKey);

    logger.info(`[generateArticleWithRetry] 文字数チェック`, {
      slotKey,
      attempt,
      charCount,
      min: limits.min,
      max: limits.max,
      diff,
      bodyOk,
      headlineViolations: headlineViolations.map(v => `${v.field}:${v.count}(${v.min}-${v.max})`),
    });

    candidates.push({ article, charCount, diff, bodyOk, headlineViolations });

    if (bodyOk && headlineViolations.length === 0) {
      return article;
    }

    // リトライ情報を構築: 本文 + 見出し違反の両方を含める
    retryInfo = {
      ...(bodyOk ? {} : {
        actual: charCount,
        previousText: (article.paragraphs || []).join(''),
      }),
      headlineViolations: headlineViolations.length > 0 ? headlineViolations : undefined,
    };

    if (attempt === maxRetries) {
      // 全候補から見出しOKと本文OKをそれぞれ独立に探して合成
      const result = pickBestComposite(candidates, slotKey, limits);
      logger.warn(`[generateArticleWithRetry] 文字数調整失敗（合成結果を使用）`, {
        slotKey,
        compositeSource: result._compositeSource || 'single',
        bodyCharCount: countChars(result.paragraphs || []),
        headlineViolations: validateHeadlines(result, slotKey).map(v => `${v.field}:${v.count}`),
        limits,
      });
      return result;
    }
  }
}

// 全候補から見出しと本文をそれぞれ最良のものを選んで合成する
function pickBestComposite(candidates, slotKey, limits) {
  if (candidates.length === 0) return null;

  // 本文が範囲内の候補のうち、diffが最小のもの
  const bodyOkCandidates = candidates.filter(c => c.bodyOk);
  const bestBody = bodyOkCandidates.length > 0
    ? bodyOkCandidates.reduce((a, b) => a.diff < b.diff ? a : b)
    : candidates.reduce((a, b) => a.diff < b.diff ? a : b);

  // 見出しが範囲内の候補のうち、bodyのdiffが最小のもの
  const hlOkCandidates = candidates.filter(c => c.headlineViolations.length === 0);
  const bestHl = hlOkCandidates.length > 0
    ? hlOkCandidates.reduce((a, b) => a.diff < b.diff ? a : b)
    : null;

  // 同じ候補なら合成不要
  if (!bestHl || bestBody === bestHl) {
    return bestBody.article;
  }

  // 見出し系フィールドをbestHlから、本文系フィールドをbestBodyから合成
  const composite = { ...bestBody.article };
  composite.headline = bestHl.article.headline;
  if (bestHl.article.subHeadline !== undefined) {
    composite.subHeadline = bestHl.article.subHeadline;
  }
  composite._compositeSource = `body:attempt${candidates.indexOf(bestBody)},hl:attempt${candidates.indexOf(bestHl)}`;

  logger.info(`[pickBestComposite] 見出しと本文を別候補から合成`, {
    slotKey,
    bodyFrom: `attempt${candidates.indexOf(bestBody)}`,
    hlFrom: `attempt${candidates.indexOf(bestHl)}`,
  });

  return composite;
}

export async function generateAllArticles(apiKey, slotAssignment, columnAuthor, onProgress) {
  logger.info('[generateAllArticles] 全記事生成開始', {
    slots: Object.keys(slotAssignment),
    columnAuthor,
    logFile: logger.getLogFileName(),
  });

  const articles = {};
  const articleSlots = ['main', 'secondary1', 'secondary2', 'tertiary1', 'tertiary2', 'tertiary3', 'tertiary4', 'columnArticle'];
  const totalSteps = articleSlots.length + 3;
  let step = 0;

  const SLOT_LABELS = {
    main: 'トップ記事',
    secondary1: '主要記事①',
    secondary2: '主要記事②',
    tertiary1: '小記事①',
    tertiary2: '小記事②',
    tertiary3: '小記事③',
    tertiary4: '小記事④',
    columnArticle: '特別コラム',
  };

  const batchSize = 3;
  for (let i = 0; i < articleSlots.length; i += batchSize) {
    const batch = articleSlots.slice(i, i + batchSize);
    logger.info(`[generateAllArticles] バッチ開始 [${batch.join(', ')}]`);

    const batchResults = await Promise.allSettled(
      batch.map(async (slotKey) => {
        const topic = slotAssignment[slotKey];
        if (!topic) {
          const msg = `${slotKey}にトピックが割り当てられていません`;
          logger.error(`[generateAllArticles] ${msg}`);
          throw new Error(msg);
        }
        return { slotKey, article: await generateArticleWithRetry(apiKey, slotKey, topic) };
      })
    );

    for (const result of batchResults) {
      step++;
      if (result.status === 'fulfilled') {
        articles[result.value.slotKey] = result.value.article;
        logger.info(`[generateAllArticles] 記事完了 (${step}/${totalSteps})`, {
          slotKey: result.value.slotKey,
          label: SLOT_LABELS[result.value.slotKey],
        });
        onProgress?.(`記事を執筆中... (${step}/${totalSteps}) ${SLOT_LABELS[result.value.slotKey]}完了`);
      } else {
        logger.error(`[generateAllArticles] 記事生成失敗`, {
          error: result.reason?.message,
          stack: result.reason?.stack,
        });
        await logger.flushNow();
        throw result.reason;
      }
    }
  }

  onProgress?.(`QA記事を執筆中... (${step + 1}/${totalSteps})`);
  const qaTopic = slotAssignment.qa;
  if (qaTopic) {
    logger.info('[generateAllArticles] QA記事生成');
    articles.qa = await generateQaWithRetry(apiKey, qaTopic);
  }
  step++;

  onProgress?.(`コラム「天翔龍閃」を執筆中... (${step + 1}/${totalSteps})`);
  logger.info('[generateAllArticles] コラム生成');
  const allTopics = Object.values(slotAssignment).filter(Boolean);
  articles.column = await generateColumnWithRetry(apiKey, columnAuthor, allTopics);
  step++;

  onProgress?.(`フッターを作成中... (${step + 1}/${totalSteps})`);
  logger.info('[generateAllArticles] フッター生成');
  const footerText = await callGemini(apiKey, buildFooterPrompt(allTopics), false, 'footer', true);
  articles.footer = parseJsonResponse(footerText, 'footer');

  logger.info('[generateAllArticles] 全記事生成完了', {
    articlesCount: Object.keys(articles).length,
    logFile: logger.getLogFileName(),
  });
  await logger.flushNow();

  return articles;
}
