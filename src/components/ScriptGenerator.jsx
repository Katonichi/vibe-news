import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ScrollText, Download, Mic, Sparkles, Clock, FileText, BookOpen } from 'lucide-react';
import { marked } from 'marked';
import { generateScript } from '../geminiApi';
import { buildScriptPrompt } from '../prompts';
import { downloadFile, formatDate } from '../utils';
import { autoSave } from '../saveUtils';
import LoadingIndicator from './LoadingIndicator';
import ErrorMessage from './ErrorMessage';
import SaveIndicator from './SaveIndicator';

const SCRIPT_LENGTHS = [
  {
    value: 3000,
    label: 'コンパクト',
    desc: '興味深いポイントを厳選して詳しく解説',
    icon: Clock,
    time: '約3分',
  },
  {
    value: 6000,
    label: 'スタンダード',
    desc: '主要なポイントをバランスよく丁寧に解説',
    icon: FileText,
    time: '約6分',
  },
  {
    value: 10000,
    label: 'ロング',
    desc: 'レポート全体をまんべんなく詳細に深掘り',
    icon: BookOpen,
    time: '約10分',
  },
];

function renderScriptHtml(markdown) {
  let html = marked(markdown);
  html = html.replace(
    /<strong>ゆい<\/strong>:/g,
    '<span class="speaker-yui">ゆい:</span>'
  );
  html = html.replace(
    /<strong>ひかり<\/strong>:/g,
    '<span class="speaker-hikari">ひかり:</span>'
  );
  return html;
}

export default function ScriptGenerator({ state, dispatch, ActionTypes, onResetApiKey }) {
  const {
    apiKey, currentTopic, report, scriptLength, script,
    isLoading, loadingMessage, error, reportTimestamp,
  } = state;
  const hasStarted = useRef(false);
  const [saveResults, setSaveResults] = useState(null);

  const handleGenerate = useCallback(async () => {
    dispatch({ type: ActionTypes.SET_ERROR, payload: null });
    dispatch({
      type: ActionTypes.SET_LOADING,
      payload: { isLoading: true, message: '原稿を執筆中...' },
    });

    try {
      const prompt = buildScriptPrompt(report, scriptLength);
      const scriptText = await generateScript(apiKey, prompt);
      dispatch({ type: ActionTypes.SET_SCRIPT, payload: scriptText });

      if (reportTimestamp) {
        const slug = currentTopic.title.replace(/\s+/g, '_').slice(0, 30);
        const results = await autoSave(reportTimestamp, `script_${formatDate()}_${slug}.md`, scriptText);
        setSaveResults(results);
      }
    } catch (err) {
      dispatch({
        type: ActionTypes.SET_ERROR,
        payload: `原稿生成に失敗しました: ${err.message}`,
      });
    } finally {
      dispatch({
        type: ActionTypes.SET_LOADING,
        payload: { isLoading: false, message: '' },
      });
    }
  }, [apiKey, report, scriptLength, currentTopic, reportTimestamp, dispatch, ActionTypes]);

  useEffect(() => {
    if (scriptLength && !script && !isLoading && !error && !hasStarted.current) {
      hasStarted.current = true;
      handleGenerate();
    }
  }, [scriptLength, script, isLoading, error, handleGenerate]);

  const scriptHtml = useMemo(() => {
    return script ? renderScriptHtml(script) : '';
  }, [script]);

  const handleDownload = () => {
    const slug = currentTopic.title.replace(/\s+/g, '_').slice(0, 30);
    downloadFile(script, `script_${formatDate()}_${slug}.md`);
  };

  const handleNext = () => {
    dispatch({ type: ActionTypes.SET_PHASE, payload: 5 });
  };

  const handleSelectLength = (len) => {
    dispatch({ type: ActionTypes.SET_SCRIPT_LENGTH, payload: len });
  };

  if (!scriptLength && !script) {
    return (
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <ScrollText className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">番組原稿</h2>
            <p className="text-sm text-slate-400">原稿の長さを選んでください</p>
          </div>
        </div>

        <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg px-4 py-2 mb-6 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
          <p className="text-sm text-violet-300 truncate">
            <span className="font-semibold">トピック: </span>
            {currentTopic.title}
          </p>
        </div>

        <div className="space-y-3">
          {SCRIPT_LENGTHS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                onClick={() => handleSelectLength(opt.value)}
                className="w-full text-left rounded-xl p-4 bg-white/5 border border-white/10 hover:bg-gradient-to-r hover:from-violet-500/10 hover:to-indigo-500/10 hover:border-violet-400/30 transition-all duration-200 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/10 group-hover:bg-violet-500/20 flex items-center justify-center transition-colors shrink-0">
                    <Icon className="w-5 h-5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-sm text-white">{opt.label}</h3>
                      <span className="text-xs text-slate-500">約{opt.value.toLocaleString()}文字</span>
                      <span className="text-xs text-violet-400/70 ml-auto">{opt.time}</span>
                    </div>
                    <p className="text-slate-400 text-xs">{opt.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
          <ScrollText className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">番組原稿</h2>
          <p className="text-sm text-slate-400">ゆいとひかりの会話形式で原稿を作成</p>
        </div>
      </div>

      <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg px-4 py-2 mb-6 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
        <p className="text-sm text-violet-300 truncate">
          <span className="font-semibold">トピック: </span>
          {currentTopic.title}
        </p>
      </div>

      {isLoading ? (
        <LoadingIndicator message={loadingMessage} />
      ) : error && !script ? (
        <ErrorMessage message={error} onRetry={handleGenerate} onResetApiKey={onResetApiKey} />
      ) : script ? (
        <div className="space-y-4">
          <div
            className="prose prose-invert prose-slate max-w-none prose-sm md:prose-base bg-slate-800/30 rounded-xl p-5 md:p-6 max-h-[60vh] overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: scriptHtml }}
          />

          <SaveIndicator results={saveResults} />

          {error && <ErrorMessage message={error} onRetry={handleGenerate} onResetApiKey={onResetApiKey} />}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-violet-500 hover:bg-violet-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Mic className="w-4 h-4" />
              番組を制作する
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
