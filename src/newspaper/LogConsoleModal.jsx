import { useEffect, useRef } from 'react';
import { X, Terminal, AlertTriangle, Info, AlertCircle } from 'lucide-react';

const LEVEL_STYLES = {
  INFO:  { text: 'text-emerald-400',  bg: 'bg-emerald-500/10', icon: Info,          label: 'INFO' },
  WARN:  { text: 'text-amber-400',    bg: 'bg-amber-500/10',   icon: AlertTriangle,  label: 'WARN' },
  ERROR: { text: 'text-red-400',      bg: 'bg-red-500/10',     icon: AlertCircle,    label: 'ERR ' },
};

function formatTime(isoString) {
  const d = new Date(isoString);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

function formatData(data) {
  if (data === undefined || data === null || data === '') return null;
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function LogEntry({ entry }) {
  const style = LEVEL_STYLES[entry.level] || LEVEL_STYLES.INFO;
  const Icon = style.icon;
  const dataStr = formatData(entry.data);

  return (
    <div className={`border-b border-white/5 px-3 py-1.5 font-mono text-xs hover:bg-white/5 transition-colors`}>
      <div className="flex items-start gap-2">
        <span className="text-slate-600 shrink-0 tabular-nums">{formatTime(entry.time)}</span>
        <span className={`shrink-0 flex items-center gap-1 ${style.text}`}>
          <Icon className="w-3 h-3" />
          <span className="font-bold">{style.label}</span>
        </span>
        <span className="text-slate-300 break-all leading-relaxed">{entry.message}</span>
      </div>
      {dataStr && (
        <div className="mt-1 ml-[13.5rem] text-slate-500 whitespace-pre-wrap break-all leading-relaxed">
          {dataStr.length > 500 ? dataStr.slice(0, 500) + '\n…（省略）' : dataStr}
        </div>
      )}
    </div>
  );
}

export default function LogConsoleModal({ entries, onClose }) {
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const isAtBottomRef = useRef(true);

  // 自動スクロール（ユーザーが上にスクロールしていたら止める）
  useEffect(() => {
    if (isAtBottomRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [entries]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const threshold = 60;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  };

  const counts = {
    INFO:  entries.filter((e) => e.level === 'INFO').length,
    WARN:  entries.filter((e) => e.level === 'WARN').length,
    ERROR: entries.filter((e) => e.level === 'ERROR').length,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-4xl mx-4 bg-slate-950 border border-white/10 rounded-2xl shadow-2xl flex flex-col"
           style={{ height: '80vh' }}>
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span className="text-white font-semibold text-sm">ログコンソール</span>
            <span className="text-slate-600 text-xs font-mono ml-1">DEV MODE</span>
          </div>
          <div className="flex items-center gap-3">
            {/* サマリーバッジ */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-mono">
                {counts.INFO} INFO
              </span>
              {counts.WARN > 0 && (
                <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-mono">
                  {counts.WARN} WARN
                </span>
              )}
              {counts.ERROR > 0 && (
                <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full font-mono">
                  {counts.ERROR} ERR
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ログエリア */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto bg-slate-950 rounded-b-2xl"
          style={{ fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace" }}
        >
          {entries.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-600 text-sm">
              ログなし
            </div>
          ) : (
            <>
              {entries.map((entry, i) => (
                <LogEntry key={i} entry={entry} />
              ))}
              <div ref={bottomRef} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
