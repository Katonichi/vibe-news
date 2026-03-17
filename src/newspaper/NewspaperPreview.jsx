import { useCallback } from 'react';
import { Download, ExternalLink, RotateCcw } from 'lucide-react';
import { downloadFile, formatDate } from '../utils';

export default function NewspaperPreview({ state, dispatch, ActionTypes }) {
  const { newspaper } = state;
  const { generatedHtml, columnAuthor, savedHtmlPath } = newspaper;

  const handlePreview = useCallback(() => {
    if (savedHtmlPath) {
      window.open(savedHtmlPath, '_blank');
    } else {
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(generatedHtml);
        win.document.close();
      }
    }
  }, [generatedHtml, savedHtmlPath]);

  const handleDownload = useCallback(async () => {
    const filename = savedHtmlPath
      ? savedHtmlPath.split('/').pop()
      : `ai_newspaper_${formatDate(new Date())}.html`;

    if (savedHtmlPath) {
      // 保存済みファイルをフェッチしてダウンロード（直接編集が反映される）
      try {
        const res = await fetch(savedHtmlPath);
        const html = await res.text();
        downloadFile(html, filename, 'text/html');
        return;
      } catch {
        // フォールバック
      }
    }
    downloadFile(generatedHtml, filename, 'text/html');
  }, [generatedHtml, savedHtmlPath]);

  const handleReset = () => {
    dispatch({ type: ActionTypes.RESET_NEWSPAPER });
  };

  if (!generatedHtml) {
    return null;
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8">
        <h2 className="text-2xl font-bold text-white mb-2">AI新聞が完成しました</h2>
        {columnAuthor && (
          <p className="text-slate-400 text-sm mb-1">
            コラム「天翔龍閃」執筆者: {columnAuthor.name}（{columnAuthor.profession}）
          </p>
        )}
        {savedHtmlPath && (
          <p className="text-emerald-400 text-sm mb-6 font-mono">
            💾 保存済み: {savedHtmlPath}
          </p>
        )}
        {!savedHtmlPath && <div className="mb-6" />}

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
          <div className="aspect-[4/3] bg-slate-800 rounded-lg overflow-hidden">
            <iframe
              srcDoc={generatedHtml}
              title="AI新聞プレビュー"
              className="w-full h-full border-0"
              style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: '200%', height: '200%' }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handlePreview}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]"
          >
            <ExternalLink className="w-4 h-4" />
            新しいウィンドウで表示
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            HTMLをダウンロード
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-3 text-slate-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all duration-200"
          >
            <RotateCcw className="w-4 h-4" />
            最初からやり直す
          </button>
        </div>
      </div>
    </div>
  );
}
