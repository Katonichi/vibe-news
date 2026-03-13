import { Radio } from 'lucide-react';

const MODE = import.meta.env.VITE_APP_MODE || 'development';

export default function Header() {
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
      <p className="text-slate-400 text-lg">AI Podcast Generator</p>
    </header>
  );
}
