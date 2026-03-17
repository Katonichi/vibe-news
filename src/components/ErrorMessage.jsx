import { AlertTriangle, RotateCcw, KeyRound } from 'lucide-react';

export default function ErrorMessage({ message, onRetry, onResetApiKey }) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-red-300 text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                リトライ
              </button>
            )}
            {onResetApiKey && (
              <button
                onClick={onResetApiKey}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 transition-colors"
              >
                <KeyRound className="w-3 h-3" />
                APIキーを再設定
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
