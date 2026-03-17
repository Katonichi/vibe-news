import { Radio, Mic, Newspaper } from 'lucide-react';

const MODE = import.meta.env.VITE_APP_MODE || 'development';

const MODE_TABS = [
  { id: 'podcast', label: 'Podcast', icon: Mic },
  { id: 'newspaper', label: 'AI新聞', icon: Newspaper },
];

export default function Header({ mode, onModeChange }) {
  return (
    <header className="pt-12 pb-6 px-4 text-center">
      <div className="inline-flex items-center gap-3 mb-4 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
        <Radio className="w-4 h-4 text-indigo-400 animate-pulse" />
        <span className="text-sm text-indigo-300 font-medium tracking-wide">
          {MODE === 'production' ? 'LIVE' : 'DEV MODE'}
        </span>
      </div>
      <h1 className="text-5xl md:text-6xl font-bold mb-3 bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
        Vibe News
      </h1>
      <p className="text-slate-400 text-lg mb-4">
        {mode === 'newspaper' ? 'AI Newspaper Generator' : 'AI Podcast Generator'}
      </p>
      {mode && onModeChange && (
        <div className="inline-flex items-center bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
          {MODE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === mode;
            return (
              <button
                key={tab.id}
                onClick={() => onModeChange(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-white/5 border border-transparent'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
}
