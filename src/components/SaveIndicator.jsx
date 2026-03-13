import { Server, HardDrive, AlertTriangle } from 'lucide-react';

export default function SaveIndicator({ results }) {
  if (!results || !results.attempted) return null;

  const parts = [];
  if (results.server) parts.push('サーバ');
  if (results.local) parts.push('ローカル');

  if (parts.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/5 border border-amber-500/10 rounded-lg">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500/70" />
        <span className="text-xs text-amber-400/70">
          自動保存に失敗しました（サーバが停止中の可能性があります）
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
      {results.server ? (
        <Server className="w-3.5 h-3.5 text-emerald-500/70" />
      ) : (
        <HardDrive className="w-3.5 h-3.5 text-emerald-500/70" />
      )}
      <span className="text-xs text-emerald-400/70">
        自動保存済み（{parts.join(' + ')}）
      </span>
    </div>
  );
}
