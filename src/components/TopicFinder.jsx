import { Search, CheckCircle, RefreshCw, Globe, BookOpen, Code2, Play, Newspaper, ExternalLink } from 'lucide-react';
import { fetchAllTopics } from '../geminiApi';
import { getRecentReportTopics } from '../topicHistory';
import LoadingIndicator from './LoadingIndicator';
import ErrorMessage from './ErrorMessage';

const SOURCE_STYLES = {
  '一般ニュース': { icon: Globe, bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-indigo-500/30' },
  'Zenn': { icon: BookOpen, bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30' },
  'Qiita': { icon: Code2, bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  'YouTube': { icon: Play, bg: 'bg-red-500/15', text: 'text-red-300', border: 'border-red-500/30' },
  'TechCrunch': { icon: Newspaper, bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
};

function SourceBadge({ source }) {
  const style = SOURCE_STYLES[source] || SOURCE_STYLES['一般ニュース'];
  const Icon = style.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${style.bg} ${style.text} ${style.border}`}>
      <Icon className="w-2.5 h-2.5" />
      {source}
    </span>
  );
}

export default function TopicFinder({ state, dispatch, ActionTypes, onResetApiKey }) {
  const { apiKey, topics, currentTopic, previousTopics, isLoading, loadingMessage, error } = state;

  const handleSearch = async () => {
    dispatch({ type: ActionTypes.SET_ERROR, payload: null });
    dispatch({
      type: ActionTypes.SET_LOADING,
      payload: { isLoading: true, message: '5つのソースからトピックを検索中...' },
    });

    try {
      const reportHistory = getRecentReportTopics();
      const newTopics = await fetchAllTopics(apiKey, previousTopics, reportHistory);
      dispatch({ type: ActionTypes.SET_TOPICS, payload: newTopics });
    } catch (err) {
      dispatch({
        type: ActionTypes.SET_ERROR,
        payload: `トピック検索に失敗しました: ${err.message}`,
      });
    } finally {
      dispatch({
        type: ActionTypes.SET_LOADING,
        payload: { isLoading: false, message: '' },
      });
    }
  };

  const handleSelect = (topic) => {
    dispatch({ type: ActionTypes.SET_TOPIC, payload: topic });
  };

  const handleConfirm = () => {
    const titles = topics.map((t) => t.title);
    dispatch({ type: ActionTypes.ADD_PREVIOUS_TOPICS, payload: titles });
    dispatch({ type: ActionTypes.SET_PHASE, payload: 3 });
  };

  const handleResearch = async () => {
    if (topics.length > 0) {
      const titles = topics.map((t) => t.title);
      dispatch({ type: ActionTypes.ADD_PREVIOUS_TOPICS, payload: titles });
    }
    dispatch({ type: ActionTypes.SET_TOPICS, payload: [] });
    dispatch({ type: ActionTypes.SET_TOPIC, payload: null });
    await handleSearch();
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
          <Search className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">トピック選定</h2>
          <p className="text-sm text-slate-400">5つのソースからAI最新トピックを提案</p>
        </div>
      </div>

      {isLoading ? (
        <LoadingIndicator message={loadingMessage} />
      ) : topics.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            気になるトピックを選んでください（{topics.length}件取得）
          </p>

          <div className="space-y-3">
            {topics.map((topic, idx) => {
              const isSelected = currentTopic && currentTopic.title === topic.title;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(topic)}
                  className={`w-full text-left rounded-xl p-4 transition-all duration-200 border ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-500/20 to-violet-500/20 border-indigo-400/40 ring-2 ring-indigo-500/30'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-sm font-bold ${
                        isSelected
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <SourceBadge source={topic.source} />
                        <h3 className={`font-bold text-base ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                          {topic.title}
                        </h3>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed mb-2">
                        {topic.summary}
                      </p>
                      <p className="text-indigo-400/80 text-sm mb-2">
                        {topic.reason}
                      </p>
                      {topic.sourceUrl && (
                        <a
                          href={topic.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-400 transition-colors duration-150 truncate max-w-full"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{topic.sourceTitle || topic.sourceUrl}</span>
                        </a>
                      )}
                    </div>
                    {isSelected && (
                      <CheckCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {error && (
            <ErrorMessage
              message={error}
              onRetry={handleSearch}
              onResetApiKey={onResetApiKey}
            />
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleConfirm}
              disabled={!currentTopic}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-xl transition-all duration-200 shadow-lg ${
                currentTopic
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              このトピックに決定
            </button>
            <button
              onClick={handleResearch}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 text-slate-300 hover:text-white font-medium rounded-xl transition-all duration-200 hover:bg-white/10"
            >
              <RefreshCw className="w-4 h-4" />
              別の候補を探す
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <ErrorMessage
              message={error}
              onRetry={handleSearch}
              onResetApiKey={onResetApiKey}
            />
          )}
          <button
            onClick={handleSearch}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Search className="w-4 h-4" />
            今日のニュースからトピックを探す
          </button>
          <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] text-slate-500">
            <span>ソース:</span>
            {Object.keys(SOURCE_STYLES).map((name) => (
              <SourceBadge key={name} source={name} />
            ))}
          </div>
          {previousTopics.length > 0 && (
            <p className="text-center text-xs text-slate-500">
              {previousTopics.length}件のトピックを既に提案済み
            </p>
          )}
        </div>
      )}
    </div>
  );
}
