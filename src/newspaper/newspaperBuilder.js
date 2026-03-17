import templateHtml from '../assets/newspaperTemplate.html?raw';

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildDateInfoBlock() {
  const now = new Date();
  const year = now.getFullYear();
  const reiwa = year - 2018;
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const weekday = weekdays[now.getDay()];

  return `<span class="date-info__year">${year}年（令和${reiwa}年）</span><br>
                <span class="date-info__date"><span class="date-info__month">${month}</span>月<span class="date-info__day">${day}</span>日</span>
                <span class="date-info__week"><span class="date-info__weekday">${weekday}</span>曜日</span>`;
}

function buildNewsInfoBlock(articles) {
  const sources = new Set();
  const allTopics = [];
  for (const [key, article] of Object.entries(articles)) {
    if (key === 'footer' || key === 'column' || key === 'qa') continue;
    if (article?.headline) allTopics.push(article.headline);
  }
  return `<div class="meeting-info-title">本日の特集</div>
                <div class="meeting-details">
                    <span class="meeting-label">特集：</span>
                    <span class="meeting-value">本日のAI最新ニュース</span>
                    <span class="meeting-label">ソース：</span>
                    <span class="meeting-value">一般ニュース、Zenn、Qiita、YouTube、TechCrunch</span>
                    <span class="meeting-label">発行：</span>
                    <span class="meeting-value">${new Date().toLocaleDateString('ja-JP')} 自動生成</span>
                </div>`;
}

function buildMainStoryBlock(article) {
  if (!article) return '';
  const paragraphs = (article.paragraphs || []).map((p) => `<p>${escapeHtml(p)}</p>`).join('\n                ');

  const firstP = article.paragraphs?.[0] ? `<p>${escapeHtml(article.paragraphs[0])}</p>` : '';
  const restPs = (article.paragraphs || []).slice(1).map((p) => `<p>${escapeHtml(p)}</p>`).join('\n                ');

  const figureBlock = `<div class="flow-diagram-container">
                    <img src="https://placehold.jp/20/DDD/777/400x225.png?text=%E5%9B%B3%E7%89%88%E3%82%A4%E3%83%A1%E3%83%BC%E3%82%B8" alt="記事関連図版" class="flow-diagram">
                    <div class="flow-diagram-title">${escapeHtml(article.figureCaption || '記事関連図版')}</div>
                </div>`;

  const boxedBlock = article.boxedKeyword
    ? `
            <div class="boxed-article">
                <div class="sub-headline"><span id="text-bubble">きょうの言葉</span>「${escapeHtml(article.boxedKeyword)}」</div>
                <div class="article-content">
                    <p>${escapeHtml(article.boxedExplanation || '')}</p>
                </div>
            </div>`
    : '';

  return `<div class="sub-headline">${escapeHtml(article.subHeadline || '')}</div>
            <h1 class="kiji-title main-headline">${escapeHtml(article.headline || '')}</h1>
            <div class="article-content">
                ${firstP}
                ${figureBlock}
                ${restPs}
            </div>
            ${boxedBlock}`;
}

function buildSecondaryStoryBlock(article, withFigure = false) {
  if (!article) return '';
  const paragraphs = (article.paragraphs || []).map((p) => `<p>${escapeHtml(p)}</p>`).join('\n                ');

  const figureBlock = withFigure
    ? `<div class="flow-diagram-container">
                    <img src="https://placehold.jp/20/DDD/777/400x225.png?text=%E5%9B%B3%E7%89%88%E3%82%A4%E3%83%A1%E3%83%BC%E3%82%B8" alt="記事関連図版" class="flow-diagram">
                    <div class="flow-diagram-title">${escapeHtml(article.figureCaption || '記事関連図版')}</div>
                </div>`
    : '';

  return `<div class="sub-headline">${escapeHtml(article.subHeadline || '')}</div>
            <h2 class="kiji-title secondary-headline">${escapeHtml(article.headline || '')}</h2>
            <div class="article-content">
                ${paragraphs}
                ${figureBlock}
            </div>`;
}

function buildTertiaryStoryBlock(article) {
  if (!article) return '';
  const paragraphs = (article.paragraphs || []).map((p) => `<p>${escapeHtml(p)}</p>`).join('\n                ');

  return `<h3 class="kiji-title tertiary-headline">${escapeHtml(article.headline || '')}</h3>
            <div class="article-content">
                ${paragraphs}
            </div>`;
}

function buildColumnArticleBlock(article) {
  if (!article) return '';
  const paragraphs = (article.paragraphs || []).map((p) => `<p>${escapeHtml(p)}</p>`).join('\n                ');

  return `<div class="sub-headline">【特別コラム】</div>
            <h3 class="kiji-title tertiary-headline">${escapeHtml(article.headline || '')}</h3>
            <div class="article-content">
                ${paragraphs}
            </div>`;
}

function buildQaBlock(qaData) {
  if (!qaData) return '';

  const exchanges = (qaData.exchanges || [])
    .map(
      (ex) =>
        `<p><span class="speaker">${escapeHtml(ex.speaker)}</span>　${escapeHtml(ex.text)}</p>`
    )
    .join('\n                ');

  return `<h3 class="kiji-title tertiary-headline">${escapeHtml(qaData.headline || '')}</h3>
            <div class="article-content">
                ${exchanges}
            </div>`;
}

function buildColumnStoryBlock(columnData, author) {
  if (!columnData) return '';
  const paragraphs = (columnData.paragraphs || []).map((p) => `<p>${escapeHtml(p)}</p>`).join('\n                ');

  return `<div class="column-headline">天翔龍閃</div>
            <div class="article-content">
                ${paragraphs}
                <span>（${escapeHtml(author?.name || '')}）</span>
            </div>`;
}

function buildFooterAdsBlock(footerData) {
  if (!footerData) return '';

  const { summary, nextAction, issues } = footerData;

  const summaryBlock = summary
    ? `<div class="ad-item ad-item--large">
                    <h3 class="ad-catchphrase">${escapeHtml(summary.catchphrase || '')}</h3>
                    <h4 class="ad-title">
                        <div class="ad-title__main">${escapeHtml(summary.titleMain || '')}</div>
                        <div class="ad-title__sub">${escapeHtml(summary.titleSub || '')}</div>
                    </h4>
                    <p class="ad-body">${escapeHtml(summary.body1 || '')}</p>
                    <p class="ad-body">${escapeHtml(summary.body2 || '')}</p>
                    <div class="ad-contact">
                        <span class="ad-contact-label">Powered by</span>
                        <span class="ad-contact-info">Vibe News AI Newspaper Generator</span>
                    </div>
                </div>`
    : '';

  const nextActionBlock = nextAction
    ? `<div class="ad-item ad-item--medium">
                    <div class="ad-header">
                        <span class="ad-badge">THINK & ACT</span>
                        <h4 class="ad-title">
                            <div class="ad-title__main">${escapeHtml(nextAction.titleMain || 'Next Action!')}</div>
                            <div class="ad-title__sub">${escapeHtml(nextAction.titleSub || '')}</div>
                        </h4>
                    </div>
                    <ul class="ad-task-list">
                        ${(nextAction.tasks || []).map((t) => `<li><span>▶︎</span>${escapeHtml(t)}</li>`).join('\n                        ')}
                    </ul>
                    <p class="ad-memo">${escapeHtml(nextAction.memo || '')}</p>
                    <div class="ad-contact-simple">
                        Vibe News 編集部
                    </div>
                </div>`
    : '';

  const issuesBlock = issues
    ? `<div class="ad-item ad-item--small">
                    <h4 class="ad-title-vertical">${escapeHtml(issues.title || '課題と展望')}</h4>
                    <ul class="ad-tech-points">
                        ${(issues.points || []).map((p) => `<li>${escapeHtml(p)}</li>`).join('\n                        ')}
                    </ul>
                    <p class="ad-footer-text">${escapeHtml(issues.footer || '')}</p>
                </div>`
    : '';

  return `${summaryBlock}

                ${nextActionBlock}

                ${issuesBlock}`;
}

export function buildNewspaper(articles, columnAuthor) {
  let html = templateHtml;

  html = html.replace('{{DATE_INFO_BLOCK}}', buildDateInfoBlock());
  html = html.replace('{{NEWS_INFO_BLOCK}}', buildNewsInfoBlock(articles));
  html = html.replace('{{MAIN_STORY_BLOCK}}', buildMainStoryBlock(articles.main));
  html = html.replace('{{SECONDARY_STORY_1_BLOCK}}', buildSecondaryStoryBlock(articles.secondary1, true));
  html = html.replace('{{SECONDARY_STORY_2_BLOCK}}', buildSecondaryStoryBlock(articles.secondary2));
  html = html.replace('{{TERTIARY_STORY_1_BLOCK}}', buildTertiaryStoryBlock(articles.tertiary1));
  html = html.replace('{{TERTIARY_STORY_2_BLOCK}}', buildTertiaryStoryBlock(articles.tertiary2));
  html = html.replace('{{TERTIARY_STORY_3_BLOCK}}', buildTertiaryStoryBlock(articles.tertiary3));
  html = html.replace('{{TERTIARY_STORY_4_BLOCK}}', buildTertiaryStoryBlock(articles.tertiary4));
  html = html.replace('{{COLUMN_ARTICLE_BLOCK}}', buildColumnArticleBlock(articles.columnArticle));
  html = html.replace('{{QA_ARTICLE_BLOCK}}', buildQaBlock(articles.qa));
  html = html.replace('{{COLUMN_STORY_BLOCK}}', buildColumnStoryBlock(articles.column, columnAuthor));
  html = html.replace('{{FOOTER_ADS_BLOCK}}', buildFooterAdsBlock(articles.footer));

  return html;
}
