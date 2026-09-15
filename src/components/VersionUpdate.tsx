import { RefreshCw } from 'lucide-react';
import type { VersionUpdateResponse } from '../types';

interface VersionUpdateCardProps {
  data: VersionUpdateResponse;
}

export function VersionUpdateCard({ data }: VersionUpdateCardProps) {
  return (
    <div className="rounded-xl border border-ember-200 bg-ember-50/40 px-4 py-3 animate-quiet-in">
      <div className="flex items-center gap-2 mb-1">
        <RefreshCw className="w-4 h-4 text-ember-600" />
        <span className="text-[0.75rem] font-medium text-ember-700 uppercase tracking-wide">{data.title}</span>
      </div>
      <div className="text-[0.78rem] text-sand-600 mb-1">Version: <span className="font-medium text-forest-700">{data.version}</span></div>
      <p className="text-[0.825rem] text-sand-700 leading-relaxed">{data.note}</p>
    </div>
  );
}
