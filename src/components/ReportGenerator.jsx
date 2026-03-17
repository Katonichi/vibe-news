import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Download, Clapperboard, Sparkles } from 'lucide-react';
import { marked } from 'marked';
import { generateReport } from '../geminiApi';
import { buildReportPrompt } from '../prompts';
import { downloadFile, formatDate } from '../utils';
import { autoSave } from '../saveUtils';
import { saveReportTopic } from '../topicHistory';
import LoadingIndicator from './LoadingIndicator';
import ErrorMessage from './ErrorMessage';
import SaveIndicator from './SaveIndicator';

const LOADING_MESSAGES = [
  '情報収集中...',
  '分析中...',
  'レポート作成中...',
];

export default function ReportGenerator({ state, dispatch, ActionTypes, onResetApiKey }) {
  const { apiKey, currentTopic, report, isLoading, loadingMessage, error } = state;
  const messageInterval = useRef(null);
  const hasStarted = useRef(false);
  const [saveResults, setSaveResults] = useState(null);

  const handleGenerate = useCallback(async () => {
    dispatch({ type: ActionTypes.SET_ERROR, payload: null });
    dispatch({
      type: ActionTypes.SET_LOADING,
      payload: { isLoading: true, message: LOADING_MESSAGES[0] },
    });

    let msgIndex = 0;
    messageInterval.current = setInterval(() => {
      msgIndex = Math.min(msgIndex + 1, LOADING_MESSAGES.length - 1);
      dispatch({
        type: ActionTypes.SET_LOADING,
        payload: { isLoading: true, message: LOADING_MESSAGES[msgIndex] },
      });
    }, 5000);

    try {
      const prompt = buildReportPrompt(currentTopic);
      const reportText = await generateReport(apiKey, prompt);

      const timestamp = new Date();
      dispatch({ type: ActionTypes.SET_REPORT_TIMESTAMP, payload: timestamp });
      dispatch({ type: ActionTypes.SET_REPORT, payload: reportText });
      saveReportTopic(currentTopic.title);

      const slug = currentTopic.title.replace(/\s+/g, '_').slice(0, 30);
      const results = await autoSave(timestamp, `report_${formatDate()}_${slug}.md`, reportText);
      setSaveResults(results);
    } catch (err) {
      dispatch({
        type: ActionTypes.SET_ERROR,
        payload: `レポート生成に失敗しました: ${err.message}`,
      });
    } finally {
      clearInterval(messageInterval.current);
      dispatch({
        type: ActionTypes.SET_LOADING,
        payload: { isLoading: false, message: '' },
      });
    }
  }, [apiKey, currentTopic, dispatch, ActionTypes]);

  useEffect(() => {
    if (!report && !isLoading && !error && !hasStarted.current) {
      hasStarted.current = true;
      handleGenerate();
    }
  }, [report, isLoading, error, handleGenerate]);

  useEffect(() => {
    return () => {
      if (messageInterval.current) clearInterval(messageInterval.current);
    };
  }, []);

  const handleDownload = () => {
    const slug = currentTopic.title.replace(/\s+/g, '_').slice(0, 30);
    downloadFile(report, `report_${formatDate()}_${slug}.md`);
  };

  const handleNext = () => {
    dispatch({ type: ActionTypes.SET_PHASE, payload: 4 });
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
          <FileText className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">調査レポート</h2>
          <p className="text-sm text-slate-400">トピックの包括的な調査と分析</p>
        </div>
      </div>

      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-4 py-2 mb-6 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
        <p className="text-sm text-indigo-300 truncate">
          <span className="font-semibold">トピック: </span>
          {currentTopic.title}
        </p>
      </div>

      {isLoading ? (
        <LoadingIndicator message={loadingMessage} />
      ) : error && !report ? (
        <ErrorMessage message={error} onRetry={handleGenerate} onResetApiKey={onResetApiKey} />
      ) : report ? (
        <div className="space-y-4">
          <div
            className="prose prose-invert prose-slate max-w-none prose-sm md:prose-base bg-slate-800/30 rounded-xl p-5 md:p-6 max-h-[60vh] overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: marked(report) }}
          />

          <SaveIndicator results={saveResults} />

          {error && <ErrorMessage message={error} onRetry={handleGenerate} onResetApiKey={onResetApiKey} />}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-violet-500 hover:bg-violet-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Clapperboard className="w-4 h-4" />
              番組原稿を生成
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 text-slate-300 hover:text-white font-medium rounded-xl transition-all duration-200 hover:bg-white/10"
            >
              <Download className="w-4 h-4" />
              ダウンロード
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
