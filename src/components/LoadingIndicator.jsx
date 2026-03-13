import { Loader2 } from 'lucide-react';

export default function LoadingIndicator({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
      <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
      <p className="text-slate-300 text-sm font-medium">{message}</p>
      <div className="flex items-center gap-1.5 mt-3">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
