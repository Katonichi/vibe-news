import { useState, useCallback } from 'react';
import { Search, RefreshCw, ChevronRight, Globe, BookOpen, Code2, Play, Newspaper as NewspaperIcon } from 'lucide-react';
import { fetchAllTopicsMultiple } from './newspaperApi';
import { getRecentReportTopics } from '../topicHistory';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';

const SOURCE_STYLES = {
  general: { label: '一般ニュース', icon: Globe, color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  zenn: { label: 'Zenn', icon: BookOpen, color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  qiita: { label: 'Qiita', icon: Code2, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  youtube: { label: 'YouTube', icon: Play, color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  techcrunch: { label: 'TechCrunch', icon: NewspaperIcon, color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
};

export default function NewspaperTopicCollector({ state, dispatch, ActionTypes, onResetApiKey }) {
  const [selectedTopics, setSelectedTopics] = useState([]);
  const { newspaper, isLoading, error, apiKey } = state;
  const { allTopics, previousTopics } = newspaper;

  const handleSearch = useCallback(async () => {
    dispatch({ type: ActionTypes.SET_ERROR, payload: null });
    dispatch({ type: ActionTypes.SET_LOADING, payload: { isLoading: true, message: '複数ソースからAIニュースを収集中...' } });

    try {
      const reportHistory = getRecentReportTopics();
      const topics = await fetchAllTopicsMultiple(apiKey, previousTopics, reportHistory);
      dispatch({ type: ActionTypes.SET_NP_TOPICS, payload: topics });
      setSelectedTopics([]);
    } catch (err) {
      dispatch({ type: ActionTypes.SET_ERROR, payload: `トピック取得に失敗しました: ${err.message}` });
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: { isLoading: false } });
    }
  }, [apiKey, previousTopics, dispatch, ActionTypes]);

  const handleSearchMore = useCallback(async () => {
    const currentTitles = allTopics.map((t) => t.title);
    dispatch({ type: ActionTypes.ADD_NP_PREVIOUS_TOPICS, payload: currentTitles });
    dispatch({ type: ActionTypes.SET_ERROR, payload: null });
    dispatch({ type: ActionTypes.SET_LOADING, payload: { isLoading: true, message: '追加のニュースを収集中...' } });

    try {
      const reportHistory = getRecentReportTopics();
      const newPrev = [...previousTopics, ...currentTitles];
      const topics = await fetchAllTopicsMultiple(apiKey, newPrev, reportHistory);
      dispatch({ type: ActionTypes.SET_NP_TOPICS, payload: [...allTopics, ...topics] });
    } catch (err) {
      dispatch({ type: ActionTypes.SET_ERROR, payload: `追加トピック取得に失敗しました: ${err.message}` });
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: { isLoading: false } });
    }
  }, [apiKey, allTopics, previousTopics, dispatch, ActionTypes]);

  const toggleTopic = (index) => {
    setSelectedTopics((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleConfirm = () => {
    const chosen = selectedTopics.map((i) => allTopics[i]);
    dispatch({ type: ActionTypes.SET_NP_TOPICS, payload: chosen });
    dispatch({ type: ActionTypes.SET_PHASE, payload: 3 });
  };

  const needMore = selectedTopics.length < 8;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8">
        <h2 className="text-2xl font-bold text-white mb-2">トピック収集</h2>
        <p className="text-slate-400 mb-6">
          複数のソースからAI最新ニュースを収集します。新聞に掲載するトピックを8件以上選んでください。
        </p>

        {allTopics.length === 0 && !isLoading && (
          <button
            onClick={handleSearch}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Search className="w-5 h-5" />
            今日のAIニュースを収集する
          </button>
        )}

        {isLoading && <LoadingIndicator message={state.loadingMessage} />}
        {error && <ErrorMessage message={error} />}

        {allTopics.length > 0 && (
          <>
            <div className="space-y-3 mb-6">
              <p className="text-sm text-slate-400">
                {allTopics.length}件のトピックが見つかりました。
                新聞に掲載する{selectedTopics.length}件を選択中
                {needMore && ` (あと${8 - selectedTopics.length}件以上選んでください)`}
              </p>
              {allTopics.map((topic, i) => {
                const sourceStyle = SOURCE_STYLES[topic.source] || SOURCE_STYLES.general;
                const Icon = sourceStyle.icon;
                const isSelected = selectedTopics.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => toggleTopic(i)}
                    className={`
                      w-full text-left p-4 rounded-xl border transition-all duration-200
                      ${isSelected
                        ? 'bg-indigo-500/15 border-indigo-500/40 ring-2 ring-indigo-500/30'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex items-center justify-center w-6 h-6 rounded-full border text-xs font-bold ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-500 text-slate-500'}`}>
                        {isSelected ? selectedTopics.indexOf(i) + 1 : ''}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${sourceStyle.color}`}>
                            <Icon className="w-3 h-3" />
                            {sourceStyle.label}
                          </span>
                        </div>
                        <h3 className="text-white font-semibold text-sm mb-1">{topic.title}</h3>
                        <p className="text-slate-400 text-xs line-clamp-2">{topic.summary}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSearchMore}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 rounded-xl transition-all duration-200"
              >
                <RefreshCw className="w-4 h-4" />
                もっと探す
              </button>
              <button
                onClick={handleConfirm}
                disabled={needMore}
                className={`
                  flex items-center gap-2 px-6 py-2 font-semibold rounded-xl transition-all duration-200 ml-auto
                  ${needMore
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]'
                  }
                `}
              >
                <ChevronRight className="w-4 h-4" />
                {selectedTopics.length}件でスロット割当へ
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
