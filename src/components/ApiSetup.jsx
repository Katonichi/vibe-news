import { useState, useEffect } from 'react';
import {
  Key, Eye, EyeOff, CheckCircle, Loader2,
  FolderOpen, FolderX, HardDrive,
} from 'lucide-react';
import { validateApiKey } from '../geminiApi';
import {
  isFileSystemAccessSupported,
  pickSaveDirectory,
  clearSaveDirectory,
  requestSaveDirectoryPermission,
} from '../fileStorage';
import ErrorMessage from './ErrorMessage';

const STORAGE_KEY = 'vibe-news-api-key';

export default function ApiSetup({ dispatch, ActionTypes, saveDirName }) {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [needsPermission, setNeedsPermission] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    const restored = saved || envKey || '';
    if (restored) {
      setKey(restored);
    }

    if (isFileSystemAccessSupported() && !saveDirName) {
      setNeedsPermission(true);
    }
  }, [saveDirName]);

  const handleTest = async () => {
    if (!key.trim()) {
      setError('APIキーを入力してください。');
      return;
    }
    setTesting(true);
    setError(null);
    setSuccess(false);

    try {
      const valid = await validateApiKey(key.trim());
      if (valid) {
        setSuccess(true);
        localStorage.setItem(STORAGE_KEY, key.trim());
        dispatch({ type: ActionTypes.SET_API_KEY, payload: key.trim() });
        setTimeout(() => {
          dispatch({ type: ActionTypes.SET_PHASE, payload: 1 });
        }, 800);
      } else {
        setError('APIキーの検証に失敗しました。正しいキーを確認してください。');
      }
    } catch (err) {
      if (err.status === 403 || err.status === 401) {
        setError('APIキーが無効です。正しいキーを入力してください。');
      } else {
        setError(`接続テストに失敗しました: ${err.message}`);
      }
    } finally {
      setTesting(false);
    }
  };

  const handlePickDirectory = async () => {
    try {
      const name = await pickSaveDirectory();
      dispatch({ type: ActionTypes.SET_SAVE_DIR_NAME, payload: name });
      setNeedsPermission(false);
    } catch {
      // user cancelled
    }
  };

  const handleReconnect = async () => {
    try {
      const name = await requestSaveDirectoryPermission();
      if (name) {
        dispatch({ type: ActionTypes.SET_SAVE_DIR_NAME, payload: name });
        setNeedsPermission(false);
      }
    } catch {
      // permission denied
    }
  };

  const handleClearDirectory = async () => {
    await clearSaveDirectory();
    dispatch({ type: ActionTypes.SET_SAVE_DIR_NAME, payload: null });
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 shadow-2xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
          <Key className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">API設定</h2>
          <p className="text-sm text-slate-400">Gemini APIキーを設定して開始</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Gemini APIキー
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setError(null);
                setSuccess(false);
              }}
              placeholder="AIzaSy..."
              className="w-full px-4 py-3 pr-12 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-mono text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleTest()}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            <a
              href="https://aistudio.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300"
            >
              Google AI Studio
            </a>
            {' '}でAPIキーを取得できます
          </p>
        </div>

        {error && <ErrorMessage message={error} onRetry={handleTest} />}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <p className="text-emerald-300 text-sm font-medium">
              接続テスト成功！開始しています...
            </p>
          </div>
        )}

        <button
          onClick={handleTest}
          disabled={testing || success}
          className={`
            w-full flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-xl transition-all duration-200 shadow-lg
            ${
              success
                ? 'bg-emerald-500 text-white shadow-emerald-500/25'
                : 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]'
            }
            ${testing || success ? 'opacity-70 cursor-not-allowed' : ''}
          `}
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              接続テスト中...
            </>
          ) : success ? (
            <>
              <CheckCircle className="w-4 h-4" />
              接続成功
            </>
          ) : (
            <>
              <Key className="w-4 h-4" />
              接続テスト
            </>
          )}
        </button>

        {isFileSystemAccessSupported() && (
          <div className="border-t border-white/10 pt-5 mt-5">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="w-4 h-4 text-slate-400" />
              <label className="text-sm font-medium text-slate-300">
                自動保存先フォルダ
              </label>
              <span className="text-xs text-slate-500">（任意）</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              設定すると、レポート・台本・音声が指定フォルダへ自動保存されます
            </p>

            {saveDirName ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl min-w-0">
                  <FolderOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-sm text-emerald-300 truncate">{saveDirName}</span>
                </div>
                <button
                  onClick={handlePickDirectory}
                  className="px-3 py-2.5 text-xs bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-xl transition-colors hover:bg-white/10"
                >
                  変更
                </button>
                <button
                  onClick={handleClearDirectory}
                  className="p-2.5 text-slate-500 hover:text-red-400 rounded-xl transition-colors hover:bg-red-500/10"
                  title="自動保存を解除"
                >
                  <FolderX className="w-4 h-4" />
                </button>
              </div>
            ) : needsPermission ? (
              <div className="space-y-2">
                <button
                  onClick={handleReconnect}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 rounded-xl transition-colors"
                >
                  <FolderOpen className="w-4 h-4" />
                  前回の保存先に再接続
                </button>
                <button
                  onClick={handlePickDirectory}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-xl transition-colors hover:bg-white/10"
                >
                  <FolderOpen className="w-4 h-4" />
                  新しいフォルダを選択
                </button>
              </div>
            ) : (
              <button
                onClick={handlePickDirectory}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-xl transition-colors hover:bg-white/10"
              >
                <FolderOpen className="w-4 h-4" />
                フォルダを選択
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
