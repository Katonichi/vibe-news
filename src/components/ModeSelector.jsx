import { Mic, Newspaper } from 'lucide-react';

const MODES = [
  {
    id: 'podcast',
    label: 'Podcast',
    description: 'AIニュースを1つ選んで雑談解説の音声ファイルを生成',
    icon: Mic,
    gradient: 'from-indigo-500/20 to-violet-500/20',
    border: 'border-indigo-500/30',
    accent: 'text-indigo-400',
  },
  {
    id: 'newspaper',
    label: 'AI新聞',
    description: '複数のAIニュースを収集して新聞風HTMLを自動生成',
    icon: Newspaper,
    gradient: 'from-amber-500/20 to-orange-500/20',
    border: 'border-amber-500/30',
    accent: 'text-amber-400',
  },
];

export default function ModeSelector({ onSelect }) {
  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">モードを選択</h2>
        <p className="text-slate-400">どちらの形式でAIニュースを生成しますか？</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
        {MODES.map((mode) => {
          const Icon = mode.icon;
          return (
            <button
              key={mode.id}
              onClick={() => onSelect(mode.id)}
              className={`
                bg-gradient-to-br ${mode.gradient} backdrop-blur-xl
                border ${mode.border} rounded-2xl p-8
                text-left transition-all duration-200
                hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]
                cursor-pointer group
              `}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center ${mode.accent}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">{mode.label}</h3>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{mode.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
