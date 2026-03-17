import { useEffect, useCallback, useRef, useState } from 'react';
import { ChevronRight, ArrowLeft, FileText, Terminal, CheckCircle, Loader2 } from 'lucide-react';
import { generateAllArticles, saveNewspaperHtml } from './newspaperApi';
import { buildNewspaper } from './newspaperBuilder';
import { pickRandomAuthor } from './columnAuthors';
import { logger } from './logger';
import ErrorMessage from '../components/ErrorMessage';
import LogConsoleModal from './LogConsoleModal';

const IS_DEV = import.meta.env.DEV;

export default function NewspaperArticleGenerator({ state, dispatch, ActionTypes, onResetApiKey }) {
  const { newspaper, isLoading, error, apiKey } = state;
  const { slotAssignment, articles, generatedHtml } = newspaper;
  const started = useRef(false);

  // 完了済みステップの蓄積
  const [progressLog, setProgressLog] = useState([]);
  // DEV モード: ログコンソールモーダルの表示状態
  const [showLog, setShowLog] = useState(false);
  // DEV モード: ログエントリのリアルタイム蓄積
  const [logEntries, setLogEntries] = useState([]);

  // logger をサブスクライブしてリアルタイム更新
  useEffect(() => {
    if (!IS_DEV) return;
    // 既存エントリを初期ロード
    setLogEntries(logger.getEntries());
    const unsubscribe = logger.subscribe((entry) => {
      setLogEntries((prev) => [...prev, entry]);
    });
    return unsubscribe;
  }, []);

  const handleGenerate = useCallback(async () => {
    setProgressLog([]);
    dispatch({ type: ActionTypes.SET_ERROR, payload: null });
    dispatch({ type: ActionTypes.SET_LOADING, payload: { isLoading: true, message: '記事の執筆を開始しています...' } });

    try {
      const author = pickRandomAuthor();
      dispatch({ type: ActionTypes.SET_NP_COLUMN_AUTHOR, payload: author });

      const onProgress = (msg) => {
        dispatch({ type: ActionTypes.SET_LOADING, payload: { isLoading: true, message: msg } });
        setProgressLog((prev) => [...prev, msg]);
      };

      const generatedArticles = await generateAllArticles(apiKey, slotAssignment, author, onProgress);
      dispatch({ type: ActionTypes.SET_NP_ARTICLES, payload: generatedArticles });

      const html = buildNewspaper(generatedArticles, author);
      dispatch({ type: ActionTypes.SET_NP_HTML, payload: html });

      // data/YYYYMMDD/ フォルダへ自動保存
      const savedPath = await saveNewspaperHtml(html);
      if (savedPath) {
        dispatch({ type: ActionTypes.SET_NP_SAVED_PATH, payload: savedPath });
      }

      dispatch({ type: ActionTypes.SET_PHASE, payload: 5 });
    } catch (err) {
      logger.error('[NewspaperArticleGenerator] 記事生成エラー', {
        message: err.message,
        stack: err.stack,
      });
      await logger.flushNow();
      dispatch({
        type: ActionTypes.SET_ERROR,
        payload: `記事生成に失敗しました:\n${err.message}`,
      });
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: { isLoading: false } });
    }
  }, [apiKey, slotAssignment, dispatch, ActionTypes]);

  useEffect(() => {
    if (!started.current && slotAssignment && !generatedHtml) {
      started.current = true;
      handleGenerate();
    }
  }, [slotAssignment, generatedHtml, handleGenerate]);

  const handleBack = () => {
    dispatch({ type: ActionTypes.SET_PHASE, payload: 3 });
  };

  // 完了済みステップと現在処理中ステップを分離
  const completedSteps = isLoading ? progressLog.slice(0, -1) : progressLog;
  const currentStep = isLoading && progressLog.length > 0 ? progressLog[progressLog.length - 1] : null;
  const initialStep = isLoading && progressLog.length === 0 ? state.loadingMessage : null;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8">
        {/* ヘッダー行 */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-2xl font-bold text-white">記事生成</h2>
            <p className="text-slate-400 mt-1">
              各スロットの記事をAIが執筆しています。完了後に自動的にプレビュー画面へ進みます。
            </p>
          </div>
          {IS_DEV && (
            <button
              onClick={() => setShowLog(true)}
              className="shrink-0 ml-4 flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-white/10 rounded-lg transition-all duration-150"
              title="ログコンソールを開く (DEV)"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>ログ</span>
              {logEntries.filter((e) => e.level === 'ERROR').length > 0 && (
                <span className="ml-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          )}
        </div>

        {/* 処理ステップ表示エリア */}
        {(isLoading || progressLog.length > 0) && (
          <div className="mt-6 bg-slate-900/60 border border-white/5 rounded-xl p-4 space-y-2">
            {/* 完了済みステップ */}
            {completedSteps.map((msg, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-slate-400">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{msg}</span>
              </div>
            ))}

            {/* 現在処理中ステップ */}
            {(currentStep || initialStep) && (
              <div className="flex items-center gap-2 text-sm text-indigo-300">
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
                <span>{currentStep || initialStep}</span>
              </div>
            )}
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <>
            <div className="mt-4">
              <ErrorMessage message={error} />
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 bg-slate-800/50 rounded-lg px-3 py-2">
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>
                詳細ログ: <code className="text-slate-400 font-mono">{logger.getLogFileName()}</code>
              </span>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                スロット割当に戻る
              </button>
              <button
                onClick={() => { started.current = false; handleGenerate(); }}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold rounded-xl transition-all duration-200"
              >
                リトライ
              </button>
            </div>
          </>
        )}
      </div>

      {/* DEV モード: ログコンソールモーダル */}
      {IS_DEV && showLog && (
        <LogConsoleModal entries={logEntries} onClose={() => setShowLog(false)} />
      )}
    </div>
  );
}
