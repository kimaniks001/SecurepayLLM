import { Users, Calendar, TrendingUp, Eye } from 'lucide-react';
import type { ChamaSetupResponse } from '../types';

interface ChamaSetupCardProps {
  data: ChamaSetupResponse;
}

export function ChamaSetupCard({ data }: ChamaSetupCardProps) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden">
      <div className="px-4 py-3 bg-forest-50 border-b border-forest-100 animate-reveal-stagger" style={{ animationDelay: '0.1s' }}>
        <span className="text-[0.75rem] font-medium text-forest-700 uppercase tracking-wide">{data.title}</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2.5 animate-reveal-stagger" style={{ animationDelay: '0.15s' }}>
          <Users className="w-4 h-4 text-forest-400 shrink-0" />
          <span className="text-[0.825rem] text-sand-600">Members:</span>
          <span className="text-[0.875rem] font-medium text-forest-800">{data.members}</span>
        </div>
        <div className="flex items-center gap-2.5 animate-reveal-stagger" style={{ animationDelay: '0.25s' }}>
          <Calendar className="w-4 h-4 text-forest-400 shrink-0" />
          <span className="text-[0.825rem] text-sand-600">Contribution:</span>
          <span className="text-[0.875rem] font-medium text-forest-800">{data.contribution}</span>
          <span className="text-[0.78rem] text-sand-500">{data.frequency}</span>
        </div>
        <div className="flex items-center gap-2.5 animate-reveal-stagger" style={{ animationDelay: '0.35s' }}>
          <TrendingUp className="w-4 h-4 text-forest-400 shrink-0" />
          <span className="text-[0.825rem] text-sand-600">Purpose:</span>
          <span className="text-[0.875rem] font-medium text-forest-800">{data.purpose}</span>
        </div>
        {data.stillToDecide.length > 0 && (
          <div className="mt-3 pt-3 border-t border-cream-200 animate-reveal-stagger" style={{ animationDelay: '0.45s' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <Eye className="w-3.5 h-3.5 text-ember-500" />
              <span className="text-[0.7rem] font-medium text-sand-600 uppercase tracking-wide">Still to decide</span>
            </div>
            <ul className="space-y-1.5">
              {data.stillToDecide.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-[0.825rem] text-sand-700">
                  <span className="w-1 h-1 rounded-full bg-ember-400 mt-2 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
