const HISTORY_KEY = 'vibe-news-report-history';

export function saveReportTopic(title) {
  const history = getReportHistory();
  const today = new Date().toISOString().slice(0, 10);
  history.push({ title, date: today });
  const trimmed = history.slice(-50);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

function getReportHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getRecentReportTopics() {
  const history = getReportHistory();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayStr = today.toISOString().slice(0, 10);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  return history
    .filter((h) => h.date === todayStr || h.date === yesterdayStr)
    .map((h) => h.title);
}
