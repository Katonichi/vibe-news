import { formatDateSlash } from '../utils';

function buildExclusionList(previousTopics = [], reportHistory = []) {
  const all = [...new Set([...previousTopics, ...reportHistory])];
  return all.length > 0 ? all.map((t) => `- ${t}`).join('\n') : 'なし';
}

function buildMultiTopicPrompt(sourceLabel, sourceUrl, searchHint, previousTopics, reportHistory) {
  const today = formatDateSlash();
  const exclusionList = buildExclusionList(previousTopics, reportHistory);

  return `あなたはAI・テクノロジー分野の最新ニュースキュレーターです。

## 重要な指示
今日は${today}です。${sourceLabel}${sourceUrl ? ` (${sourceUrl})` : ''} から、
**今日または直近に報じられた・公開された**${searchHint}を**2つ**見つけてください。

## 選定ルール
- 抽象的なテーマ（「AIの台頭」等）は禁止。必ず具体的なニュース・記事を選ぶ
- 情報源の記事・ページのタイトルとURLを含める
- 2件は互いに異なるトピックにする

## 除外トピック
${exclusionList}

## 出力形式
以下のJSON配列で**2つ**のトピックを回答してください:
[
  {
    "title": "具体的なニュースのタイトル",
    "summary": "3-4文で説明",
    "reason": "注目の理由（1-2文）",
    "sourceTitle": "元記事のタイトル",
    "sourceUrl": "元記事のURL"
  },
  {
    "title": "...",
    "summary": "...",
    "reason": "...",
    "sourceTitle": "...",
    "sourceUrl": "..."
  }
]

出力は必ず \`[\` から始めること。前置き・説明・確認文は一切出力しないこと。`;

}

export function buildMultiGeneralPrompt(prev, hist) {
  return buildMultiTopicPrompt('AI・テクノロジー分野の一般ニュースサイト', '', '具体的なAI関連ニュース', prev, hist);
}

export function buildMultiZennPrompt(prev, hist) {
  return buildMultiTopicPrompt('日本の技術情報共有サイト「Zenn」', 'https://zenn.dev/', 'AI・技術関連の記事', prev, hist);
}

export function buildMultiQiitaPrompt(prev, hist) {
  return buildMultiTopicPrompt('日本の技術情報共有サイト「Qiita」のAIタグ', 'https://qiita.com/tags/ai', 'AI関連の記事', prev, hist);
}

export function buildMultiYoutubePrompt(prev, hist) {
  return buildMultiTopicPrompt('YouTube', '', '生成AI・AIエージェント関連の動画', prev, hist);
}

export function buildMultiTechCrunchPrompt(prev, hist) {
  return buildMultiTopicPrompt('TechCrunch', 'https://techcrunch.com/category/artificial-intelligence/', 'AI関連の記事', prev, hist);
}

// ===== 文字数カウントルール =====
const HALF_WIDTH_COUNT_RULE = `## 文字数カウントルール（全項目共通・厳守）
- 全角文字（日本語・漢字・ひらがな・カタカナ・全角記号等）: 1文字 = 1文字
- 半角文字（英数字・半角記号・スペース等）: 1文字 = 0.6文字
- 例：「AI開発のtest環境」= 「AI」(2×0.6=1.2) + 「開発の」(3) + 「test」(4×0.6=2.4) + 「環境」(2) = **8.6文字**
- ほとんど日本語の文章なら、おおよそ 文字数 ≒ 全角文字数 と考えてよい`;

// 文字数目安テンプレート（LLMに長さの感覚を与える）
const LENGTH_REFERENCE = {
  130: '約130文字の目安：「AIが大量殺傷に関与か――AIチャットボットが個人の自殺に加え、大規模死傷事件の捜査で浮上していると弁護士が警告した。OpenAIやGoogleが安全対策より開発を急ぐ中、AIの安全性は理論から現実の緊急課題へと変化した。複数の州司法長官もAI企業に書簡を送り有害な行動の修正を求めている。」（128文字）',
  300: '約300文字の目安：「マイクロソフトが開発した1-bit LLM「BitNet」が、AI業界に革命をもたらそうとしている。この技術は大規模言語モデルの重みを3値で表現し、メモリ使用量を約8分の1に削減、推論速度を大幅に向上させる。これまで高性能GPUを必要としたAIがスマートフォンやPCで動作する「ローカルAI」の実現が現実味を帯びてきた。20億パラメータのモデルをわずか0.4GBのメモリでCPU上で動作させることが可能で、従来比最大32倍のメモリ削減と6倍の速度向上を実現する。高価なハードウェアへの依存を打破し、AIをより身近な存在に変える可能性を秘めている。」（290文字）',
  440: '約440文字の目安：「AI開発の最前線で今、驚異的なムーブメントが起きている。昨年10月に誕生したリポジトリ「agency-agents」が、わずか数ヶ月でGitHubのスターを4万以上獲得し、AIコミュニティに旋風を巻き起こしている。144個もの専門AIエージェントを無料で提供する画期的なプロジェクトであり、10種類以上のツールに対応している。この急成長は、AIエージェントの専門化が現代のAI開発の主流であることを示している。単一の汎用AIではなく、特定の役割に特化したAIエージェントが協調して動作する「マルチエージェントシステム」が、複雑なタスクを効率的に解決する鍵となる。フロントエンド開発からマーケティング、デザインまで多岐にわたる分野の専門家を網羅し、各エージェントは明確な個性とワークフローを持つ。オープンソースで提供されるこれらのエージェントは、AI開発の敷居を大きく下げ、誰もがAIの恩恵を受けられる時代を切り拓く。」（420文字）',
};

// ===== 記事本文の文字数制限 =====
const CHAR_LIMITS = {
  main: { min: 400, max: 440 },
  secondary1: { min: 280, max: 320 },
  secondary2: { min: 280, max: 320 },
  tertiary1: { min: 122, max: 138 },
  tertiary2: { min: 122, max: 138 },
  tertiary3: { min: 122, max: 138 },
  tertiary4: { min: 122, max: 138 },
  columnArticle: { min: 240, max: 280 },
};

// ===== 見出し・その他の文字数制限 =====
const HEADLINE_LIMITS = {
  main: { min: 24, max: 32 },
  secondary1: { min: 16, max: 23 },
  secondary2: { min: 16, max: 23 },
  tertiary1: { min: 9, max: 14 },
  tertiary2: { min: 9, max: 14 },
  tertiary3: { min: 9, max: 14 },
  tertiary4: { min: 9, max: 14 },
  columnArticle: { min: 18, max: 27 },
};

const SUBHEADLINE_LIMITS = {
  main: { min: 0, max: 23 },
  secondary1: { min: 10, max: 29 },
  secondary2: { min: 10, max: 29 },
};

const FIGURE_CAPTION_LIMITS = {
  main: { min: 10, max: 21 },
  secondary1: { min: 10, max: 21 },
};

export const QA_CHAR_LIMITS = { min: 280, max: 320 };
const QA_HEADLINE_LIMITS = { min: 8, max: 13 };

export { CHAR_LIMITS, HEADLINE_LIMITS, SUBHEADLINE_LIMITS };

export function buildArticlePrompt(slotKey, topic, retryInfo = null) {
  const limits = CHAR_LIMITS[slotKey];
  if (!limits) return null;

  const headlineLimits = HEADLINE_LIMITS[slotKey];
  const subLimits = SUBHEADLINE_LIMITS[slotKey];
  const figLimits = FIGURE_CAPTION_LIMITS[slotKey];

  const slotLabel = {
    main: 'トップ記事（最も重要なニュース）',
    secondary1: '主要記事',
    secondary2: '主要記事',
    tertiary1: '小記事（コンパクトにまとめる）',
    tertiary2: '小記事（コンパクトにまとめる）',
    tertiary3: '小記事（コンパクトにまとめる）',
    tertiary4: '小記事（コンパクトにまとめる）',
    columnArticle: '特別コラム記事',
  }[slotKey];

  const targetChars = Math.round((limits.min + limits.max) / 2);
  const tolerance = Math.round((limits.max - limits.min) / 2);

  const isTertiary = ['tertiary1', 'tertiary2', 'tertiary3', 'tertiary4'].includes(slotKey);

  // 目安となる文字数のレファレンスを選択
  const refKey = Object.keys(LENGTH_REFERENCE)
    .map(Number)
    .sort((a, b) => Math.abs(a - targetChars) - Math.abs(b - targetChars))[0];
  const lengthRef = LENGTH_REFERENCE[refKey] || '';

  // リトライ用の強化プロンプト構築
  let retryNote = '';
  if (retryInfo) {
    const parts = [];

    // 本文の文字数違反
    if (retryInfo.actual != null) {
      const diff = retryInfo.actual - targetChars;
      const absDiff = Math.abs(diff);
      const direction = diff > 0 ? '超過' : '不足';
      const action = diff > 0 ? '削減' : '追加';

      parts.push(`前回の本文は **${retryInfo.actual}文字** でした（目標: ${limits.min}〜${limits.max}文字）。
**${absDiff}文字の${direction}** です。約${Math.round(absDiff / retryInfo.actual * 100)}%${action}してください。`);

      if (retryInfo.previousText) {
        parts.push(`### 前回の本文（これを修正してください）
\`\`\`
${retryInfo.previousText}
\`\`\`

### 修正方法
${diff > 0 ? `- 上記テキストから約${absDiff}文字分を削ってください
- 冗長な副詞・形容詞（「非常に」「とても」「かなり」「まさに」等）を削除
- 重複表現・類似フレーズを統合
- 修飾節を簡潔にする
- 重要な事実と具体的数値は残す` : `- 上記テキストに約${absDiff}文字分の内容を追加してください
- 具体的な数値・事例・影響を追記
- 背景や展望を補足
- ただし元の文脈と整合する内容のみ`}`);
      }
    }

    // 見出し系フィールドの文字数違反
    if (retryInfo.headlineViolations?.length > 0) {
      const hlFixes = retryInfo.headlineViolations.map(v => {
        const over = v.count > v.max;
        return `- **${v.field}**「${v.value}」が${v.count}文字（制限: ${v.min}〜${v.max}文字）→ ${over ? `${v.count - v.max}文字削って` : `${v.min - v.count}文字追加して`}ください`;
      }).join('\n');
      parts.push(`### 見出しの文字数違反（必ず修正）
${hlFixes}`);
    }

    if (parts.length > 0) {
      retryNote = `\n\n## 【最重要・文字数修正指示】\n${parts.join('\n\n')}`;
    }
  }

  // ヘッドライン制限の文字列組み立て
  const headlineRule = headlineLimits
    ? `- headline（見出し）: **${headlineLimits.min}文字以上、${headlineLimits.max}文字以内**（厳守）`
    : '';

  // サブヘッドライン制限
  const subHeadlineRule = subLimits
    ? subLimits.min > 0
      ? `- subHeadline（サブ見出し）: **${subLimits.min}文字以上、${subLimits.max}文字以内**（厳守）`
      : `- subHeadline（サブ見出し）: **${subLimits.max}文字以内**（厳守）`
    : '';

  // 図版キャプション制限
  const figureCaptionRule = figLimits
    ? `- figureCaption（図版キャプション）: **${figLimits.min}文字以上、${figLimits.max}文字以内**（厳守）`
    : '';

  // boxedExplanation制限（mainのみ）
  const boxedRule = slotKey === 'main'
    ? `- boxedKeyword: 記事内の重要キーワード1つ（2～10文字）
- boxedExplanation: そのキーワードの解説（**100文字以上、150文字以内**、厳守）`
    : '';

  const characterRules = [headlineRule, subHeadlineRule, figureCaptionRule, boxedRule]
    .filter(Boolean)
    .join('\n');

  const paragraphCount = isTertiary ? 1 : (slotKey === 'main' ? 4 : (slotKey.startsWith('secondary') ? 2 : 2));
  const charsPerParagraph = Math.round(targetChars / paragraphCount);

  return `あなたはプロの新聞記者です。以下のAIニューストピックについて、${slotLabel}を作成してください。

トピック: ${topic.title}
概要: ${topic.summary}

${HALF_WIDTH_COUNT_RULE}

## 【最重要】本文の文字数制限
- 本文（paragraphs配列内のテキスト合計）: **${limits.min}文字以上、${limits.max}文字以内**
- 目標文字数: **ちょうど${targetChars}文字前後**（±${tolerance}文字以内に収める）
- ${paragraphCount}段落構成で、各段落が約${charsPerParagraph}文字ずつ
${lengthRef ? `\n### 文字数の目安（参考テキスト）\n${lengthRef}\n上記テキストの長さ感覚を参考に、${limits.min}〜${limits.max}文字に収まるよう調整すること。` : ''}
${retryNote}

## 執筆ルール
- 新聞記事の文体（である調）で書く
- スポーツ新聞のようなインパクトのある思わせぶりな見出しにする
- 事実に基づいた正確な内容にする${isTertiary ? '\n- paragraphsは**必ず1要素のみ**（段落を複数に分けず、1つの段落にまとめて書く）' : ''}

## 各フィールドの文字数制限（半角=0.6文字カウント・全て厳守）
${characterRules}

## 自己検証手順（出力前に必ず実行）
1. **headline** の文字数を数える（半角=0.6）→ ${headlineLimits ? `${headlineLimits.min}〜${headlineLimits.max}文字か？` : 'OK'}
${subLimits ? `2. **subHeadline** の文字数を数える → ${subLimits.max}文字以内か？` : ''}
${figLimits ? `3. **figureCaption** の文字数を数える → ${figLimits.min}〜${figLimits.max}文字か？` : ''}
4. **paragraphs** 全テキストの合計文字数を数える → ${limits.min}〜${limits.max}文字か？
5. いずれか範囲外なら修正してから出力する

## 出力形式（JSON）
{
  "headline": "${headlineLimits ? `見出し（${headlineLimits.min}〜${headlineLimits.max}文字）` : 'インパクトのある見出し'}",
  "subHeadline": "${subLimits ? `サブ見出し（${subLimits.max}文字以内）` : '補足的なサブ見出し（1文）'}",
  "paragraphs": ["段落1のテキスト"${isTertiary ? '' : ', "段落2のテキスト"'}],
  "figureCaption": "${figLimits ? `図版キャプション（${figLimits.min}〜${figLimits.max}文字）` : '記事に合った図版のキャプション'}",
  "boxedKeyword": "${slotKey === 'main' ? '記事内の重要キーワード1つ' : ''}",
  "boxedExplanation": "${slotKey === 'main' ? 'そのキーワードの解説（100-150文字）' : ''}"
}

出力は必ず \`{\` から始めること。前置き・説明・確認文は一切出力しないこと。`;
}

export function buildQaPrompt(topic, retryInfo = null) {
  const limits = QA_CHAR_LIMITS;
  const hlLimits = QA_HEADLINE_LIMITS;
  const targetChars = Math.round((limits.min + limits.max) / 2);
  const numExchanges = 3; // 3往復 = 6セリフ
  const charsPerLine = Math.round((targetChars - numExchanges * 2 * 3) / (numExchanges * 2)); // 話者名3文字×6を除外

  let retryNote = '';
  if (retryInfo) {
    const diff = retryInfo.actual - targetChars;
    const absDiff = Math.abs(diff);
    const direction = diff > 0 ? '超過' : '不足';

    const parts = [];

    if (retryInfo.actual != null) {
      parts.push(`前回のセリフ合計は **${retryInfo.actual}文字** でした（目標: ${limits.min}〜${limits.max}文字）。
**${absDiff}文字の${direction}** です。`);

      if (retryInfo.previousExchanges) {
        parts.push(`### 前回のセリフ（これを修正してください）
${retryInfo.previousExchanges.map(ex => `${ex.speaker}　${ex.text}`).join('\n')}

### 修正方法
${diff > 0 ? `- 各セリフから平均${Math.ceil(absDiff / (numExchanges * 2))}文字ずつ削る
- 冗長な表現を簡潔にする。重複する説明を削除する
- 往復数を3往復に抑える` : `- 各セリフに平均${Math.ceil(absDiff / (numExchanges * 2))}文字ずつ追加する
- 具体例や補足説明を足す`}`);
      }
    }

    if (retryInfo.headlineViolation) {
      const v = retryInfo.headlineViolation;
      const over = v.count > v.max;
      parts.push(`### 見出しの文字数違反（必ず修正）
- **headline**「${v.value}」が${v.count}文字（制限: ${v.min}〜${v.max}文字）→ ${over ? `${Math.ceil(v.count - v.max)}文字削って` : `${Math.ceil(v.min - v.count)}文字追加して`}ください`);
    }

    if (parts.length > 0) {
      retryNote = `\n\n## 【最重要・文字数修正指示】\n${parts.join('\n\n')}`;
    }
  }

  return `あなたはプロの新聞記者です。以下のAIニューストピックについて、「生徒」と「記者」の対話形式でQ&A記事を作成してください。

トピック: ${topic.title}
概要: ${topic.summary}

${HALF_WIDTH_COUNT_RULE}

## ルール
- 「生徒」は好奇心旺盛な初心者。「記者」は分かりやすく解説する専門家。
- **3往復（6セリフ）** の対話で、専門用語や概念を噛み砕いて解説する
- 見出しはインパクトのあるものにする
- **「記者」の言葉遣い**: ですます調の丁寧な敬語（例: 「〜です。」「〜します。」「〜ください。」）
- **「生徒」の言葉遣い**: 敬語なしのカジュアルな話し言葉（例: 「〜なの？」「〜なんで？」「〜ってどういうこと？」「〜してみたい！」）

## 【最重要】文字数制限（半角=0.6文字カウント・全て厳守）
- headline（見出し）: **${hlLimits.min}文字以上、${hlLimits.max}文字以内**
- 全セリフテキスト合計: **${limits.min}文字以上、${limits.max}文字以内**（目標: **${targetChars}文字前後**）
  ※各セリフは「生徒　〜」「記者　〜」の形式。「話者名(2文字)＋全角スペース(1文字)＋本文」すべてを合計に含める
- 1セリフあたり約${charsPerLine}文字（話者名除く）を目安にする
${retryNote}

## 自己検証手順（出力前に必ず実行）
1. **headline** の文字数を数える（半角=0.6）→ ${hlLimits.min}〜${hlLimits.max}文字か？
2. 各exchangeの「speaker + "　" + text」を結合して全体テキストを作る
3. 全角文字数を数え、半角文字数×0.6を加算する
4. 合計が${limits.min}〜${limits.max}の範囲内か確認する
5. いずれか範囲外ならば調整してから出力する

## 出力形式（JSON）
{
  "headline": "見出し（${hlLimits.min}〜${hlLimits.max}文字）",
  "exchanges": [
    { "speaker": "生徒", "text": "質問文" },
    { "speaker": "記者", "text": "回答文" }
  ]
}

出力は必ず \`{\` から始めること。前置き・説明・確認文は一切出力しないこと。`;
}

export function buildColumnPrompt(author, allTopics, retryInfo = null) {
  const topicList = allTopics.map((t, i) => `${i + 1}. ${t.title}: ${t.summary}`).join('\n');
  const targetChars = 390;

  let retryNote = '';
  if (retryInfo) {
    const diff = retryInfo.actual - targetChars;
    const absDiff = Math.abs(diff);
    const direction = diff > 0 ? '超過' : '不足';

    retryNote = `

## 【最重要・文字数修正指示】
前回のコラムは **${retryInfo.actual}文字** でした（目標: 350〜450文字、理想は390文字）。
**${absDiff}文字の${direction}** です。`;

    if (retryInfo.previousText) {
      retryNote += `

### 前回のコラム全文（これをベースに修正してください）
\`\`\`
${retryInfo.previousText}
\`\`\`

### 具体的な修正方法
${diff > 0 ? `- 上記テキストから合計${absDiff}文字を削減する（各段落から平均${Math.ceil(absDiff / 3)}文字ずつ）
- 「〜という」「〜において」「非常に」「まさに」等の冗長表現を削除
- 修飾句を短縮（「〜することができる」→「〜できる」）
- 1文が40文字を超えないよう分割・簡潔化` : `- 上記テキストに合計${absDiff}文字を追加する（各段落に平均${Math.ceil(absDiff / 3)}文字ずつ）
- 具体例や数値を補足`}
- 修正後のテキスト全体が **350〜450文字** になるよう最終確認すること`;
    }
  }

  return `あなたはコラム「天翔龍閃」の執筆者です。以下のプロフィールになりきって、本日のAIニュースから1つテーマを選び、3段落のコラムを執筆してください。

## 執筆者プロフィール
- 名前: ${author.name}（${author.nameReading}）
- 職業: ${author.profession}
- 人物像: ${author.personality}
- 文体の特徴: ${author.style}
- 論旨の癖: ${author.tendency}

## 本日のAIニューストピック一覧
${topicList}

${HALF_WIDTH_COUNT_RULE}

## ルール
- 上記トピックの中から最もコラム向きなテーマを1つ選ぶ
- 執筆者の専門性・視点・文体を反映させる
- **必ず3段落**構成にする
- AIニュースを題材にしつつ、執筆者ならではの視座で論じる

## 【最重要】文字数制限（厳守）
- **350文字以上、450文字以内**（半角=0.6文字カウント）
- 目標文字数: **ちょうど${targetChars}文字前後**
- 各段落: **115〜145文字** （3段落合計で350〜450文字になるよう配分）
- 1段落あたり2〜3文を目安とし、1文は20〜40文字程度

### 文字数の感覚（参考）
以下のテキストが約130文字です。各段落はこの程度の長さにしてください:
「${LENGTH_REFERENCE[130]}」
${retryNote}

## 自己検証手順（出力前に必ず実行）
1. 各段落の文字数を個別にカウントする（全角=1、半角=0.6）
2. 各段落が115〜145文字の範囲内か確認する
3. 3段落の合計が350〜450の範囲内か確認する
4. 範囲外ならば調整してから出力する

## 出力形式（JSON）
{
  "paragraphs": ["第1段落", "第2段落", "第3段落"]
}

出力は必ず \`{\` から始めること。前置き・説明・確認文は一切出力しないこと。`;
}

export function buildFooterPrompt(allTopics) {
  const topicList = allTopics.map((t) => `- ${t.title}: ${t.summary}`).join('\n');

  return `あなたはAI新聞の編集者です。本日のAIニュース全体を踏まえて、新聞のフッターに掲載する3つのまとめセクションを作成してください。

## 本日のトピック
${topicList}

${HALF_WIDTH_COUNT_RULE}

## 3つのセクションと文字数制限（半角=0.6文字カウント・全て厳守）

1. **今日のまとめ**（ad-item--large）
   - catchphrase: **12〜30文字**（目標: 20文字前後）
   - titleMain: **12〜20文字**（目標: 16文字前後）
   - titleSub: **10〜20文字**（目標: 15文字前後）
   - body1: **50〜85文字**（目標: 65文字前後）
   - body2: **15〜40文字**（目標: 25文字前後）

2. **Next Action**（ad-item--medium）
   - titleSub: **9〜15文字**（目標: 12文字前後）
   - 各tasks: **7〜16文字**（目標: 11文字前後、3〜4項目）
   - memo: **10〜21文字**（目標: 15文字前後）

3. **課題・懸念点・検討事項**（ad-item--small）
   - title: **5〜10文字**（目標: 7文字前後）
   - 各points: **6〜16文字**（目標: 10文字前後、3〜4項目）
   - footer: **5〜12文字**（目標: 6文字前後）

## 自己検証（出力前に必ず全フィールドの文字数を確認し、範囲内に収めること）

## 出力形式（JSON）
{
  "summary": {
    "catchphrase": "キャッチフレーズ",
    "titleMain": "メインタイトル",
    "titleSub": "サブタイトル",
    "body1": "本文1段落目",
    "body2": "本文2段落目（まとめ・強調調）"
  },
  "nextAction": {
    "titleMain": "Next Action!",
    "titleSub": "サブタイトル",
    "tasks": ["タスク1", "タスク2", "タスク3"],
    "memo": "補足メモ"
  },
  "issues": {
    "title": "縦書きタイトル",
    "points": ["課題1", "課題2", "課題3"],
    "footer": "担当部署名"
  }
}

出力は必ず \`{\` から始めること。前置き・説明・確認文は一切出力しないこと。`;
}

export function buildAutoAssignPrompt(topics) {
  const topicList = topics.map((t, i) => `${i}: [${t.source}] ${t.title} - ${t.summary}`).join('\n');

  return `以下のAIニューストピックを、新聞の各記事スロットに最適に割り当ててください。

## トピック一覧
${topicList}

## スロット（重要度順）
- main: トップ記事（最もインパクトのあるニュース）×1
- secondary1: 主要記事①×1
- secondary2: 主要記事②×1
- tertiary1〜4: 小記事×4（それぞれ異なるトピック）
- columnArticle: 特別コラム記事×1
- qa: QA解説記事×1（技術的に難しいトピックが向いている）
- tenshouryusen: 天翔龍閃コラム×1（哲学的・社会的に論じやすいトピック）

## ルール
- 各スロットには異なるトピックを割り当てる（ただしqa・tenshouryusenは他スロットと重複OK）
- トピックのインデックス番号で指定する

## 出力形式（JSON）
{
  "main": 0,
  "secondary1": 1,
  "secondary2": 2,
  "tertiary1": 3,
  "tertiary2": 4,
  "tertiary3": 5,
  "tertiary4": 6,
  "columnArticle": 7,
  "qa": 8,
  "tenshouryusen": 9
}

出力は必ず \`{\` から始めること。前置き・説明・確認文は一切出力しないこと。`;
}
