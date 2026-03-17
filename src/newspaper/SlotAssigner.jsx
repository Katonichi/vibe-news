import { useState, useCallback } from 'react';
import { Wand2, ChevronRight, ArrowLeft } from 'lucide-react';
import { autoAssignSlots } from './newspaperApi';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';

const SLOT_DEFS = [
  { key: 'main', label: 'トップ記事', charRange: '400〜440字', count: 1 },
  { key: 'secondary1', label: '主要記事①', charRange: '280〜320字', count: 1 },
  { key: 'secondary2', label: '主要記事②', charRange: '280〜320字', count: 1 },
  { key: 'tertiary1', label: '小記事①', charRange: '100〜130字', count: 1 },
  { key: 'tertiary2', label: '小記事②', charRange: '100〜130字', count: 1 },
  { key: 'tertiary3', label: '小記事③', charRange: '100〜130字', count: 1 },
  { key: 'tertiary4', label: '小記事④', charRange: '100〜130字', count: 1 },
  { key: 'columnArticle', label: '特別コラム記事', charRange: '240〜280字', count: 1 },
  { key: 'qa', label: 'QA記事（生徒×記者）', charRange: '自由', count: 1 },
  { key: 'tenshouryusen', label: '天翔龍閃コラム', charRange: '350〜450字', count: 1 },
];

function buildInitialAssignment(topics) {
  const assignment = {};
  SLOT_DEFS.forEach((slot, i) => {
    assignment[slot.key] = i < topics.length ? topics[i] : null;
  });
  return assignment;
}

export default function SlotAssigner({ state, dispatch, ActionTypes, onResetApiKey }) {
  const { newspaper, isLoading, error, apiKey } = state;
  const { allTopics } = newspaper;
  const [assignment, setAssignment] = useState(() => buildInitialAssignment(allTopics));

  const handleSlotChange = (slotKey, topicIndex) => {
    setAssignment((prev) => ({
      ...prev,
      [slotKey]: topicIndex === '' ? null : allTopics[parseInt(topicIndex)],
    }));
  };

  const handleAutoAssign = useCallback(async () => {
    dispatch({ type: ActionTypes.SET_ERROR, payload: null });
    dispatch({ type: ActionTypes.SET_LOADING, payload: { isLoading: true, message: 'AIがトピックの重要度を分析中...' } });

    try {
      const result = await autoAssignSlots(apiKey, allTopics);
      setAssignment(result);
    } catch (err) {
      dispatch({ type: ActionTypes.SET_ERROR, payload: `自動割当に失敗しました: ${err.message}` });
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: { isLoading: false } });
    }
  }, [apiKey, allTopics, dispatch, ActionTypes]);

  const handleConfirm = () => {
    dispatch({ type: ActionTypes.SET_NP_SLOT_ASSIGNMENT, payload: assignment });
    dispatch({ type: ActionTypes.SET_PHASE, payload: 4 });
  };

  const handleBack = () => {
    dispatch({ type: ActionTypes.SET_PHASE, payload: 2 });
  };

  const allFilled = SLOT_DEFS.every((slot) => assignment[slot.key] != null);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">スロット割当</h2>
            <p className="text-slate-400 text-sm">各記事スロットにトピックを割り当ててください</p>
          </div>
          <button
            onClick={handleAutoAssign}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-violet-500 hover:bg-violet-400 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/25 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <Wand2 className="w-4 h-4" />
            AIで自動割当
          </button>
        </div>

        {isLoading && <LoadingIndicator message={state.loadingMessage} />}
        {error && <ErrorMessage message={error} />}

        {!isLoading && (
          <div className="space-y-3 mb-6">
            {SLOT_DEFS.map((slot) => (
              <div key={slot.key} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="w-40 shrink-0">
                  <div className="text-sm font-semibold text-white">{slot.label}</div>
                  <div className="text-xs text-slate-500">{slot.charRange}</div>
                </div>
                <select
                  value={assignment[slot.key] ? allTopics.indexOf(assignment[slot.key]) : ''}
                  onChange={(e) => handleSlotChange(slot.key, e.target.value)}
                  className="flex-1 bg-slate-800 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
                >
                  <option value="">-- 未選択 --</option>
                  {allTopics.map((topic, i) => (
                    <option key={i} value={i}>
                      [{SOURCE_SHORT[topic.source] || topic.source}] {topic.title}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            戻る
          </button>
          <button
            onClick={handleConfirm}
            disabled={!allFilled}
            className={`
              flex items-center gap-2 px-6 py-3 font-semibold rounded-xl transition-all duration-200
              ${!allFilled
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]'
              }
            `}
          >
            <ChevronRight className="w-4 h-4" />
            記事を生成する
          </button>
        </div>
      </div>
    </div>
  );
}

const SOURCE_SHORT = {
  general: '一般',
  zenn: 'Zenn',
  qiita: 'Qiita',
  youtube: 'YT',
  techcrunch: 'TC',
};
