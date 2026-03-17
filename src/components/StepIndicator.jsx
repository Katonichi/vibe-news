import { Check, Key, Search, FileText, ScrollText, Mic, Layers, PenTool, Eye, Newspaper } from 'lucide-react';

const PODCAST_STEPS = [
  { label: 'API設定', icon: Key },
  { label: 'モード', icon: Layers },
  { label: 'トピック', icon: Search },
  { label: '調査', icon: FileText },
  { label: '原稿', icon: ScrollText },
  { label: '音声', icon: Mic },
];

const NEWSPAPER_STEPS = [
  { label: 'API設定', icon: Key },
  { label: 'モード', icon: Layers },
  { label: 'トピック収集', icon: Search },
  { label: 'スロット割当', icon: Newspaper },
  { label: '記事生成', icon: PenTool },
  { label: 'プレビュー', icon: Eye },
];

export default function StepIndicator({ currentPhase, mode }) {
  const steps = mode === 'newspaper' ? NEWSPAPER_STEPS : PODCAST_STEPS;

  return (
    <div className="flex items-center justify-center gap-0 px-4 pb-8 overflow-x-auto">
      {steps.map((step, i) => {
        const isCompleted = i < currentPhase;
        const isCurrent = i === currentPhase;
        const Icon = isCompleted ? Check : step.icon;

        return (
          <div key={`${mode}-${step.label}`} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                  ${isCompleted ? 'bg-emerald-500 text-white' : ''}
                  ${isCurrent ? 'bg-indigo-500 text-white ring-4 ring-indigo-500/30' : ''}
                  ${!isCompleted && !isCurrent ? 'bg-slate-700 text-slate-400' : ''}
                `}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${
                  isCurrent
                    ? 'text-indigo-300'
                    : isCompleted
                      ? 'text-emerald-400'
                      : 'text-slate-500'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-8 md:w-12 h-0.5 mx-1 mb-5 transition-colors duration-300 ${
                  i < currentPhase ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
