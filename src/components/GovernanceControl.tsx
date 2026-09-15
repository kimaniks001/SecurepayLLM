import { Shield, Banknote } from 'lucide-react';
import type { GovernanceResponse } from '../types';

interface GovernanceControlCardProps {
  data: GovernanceResponse;
}

export function GovernanceControlCard({ data }: GovernanceControlCardProps) {
  return (
    <div className="rounded-2xl border border-forest-200 bg-white shadow-lifted overflow-hidden">
      <div className="px-4 py-3 bg-forest-50 border-b border-forest-100 animate-reveal-stagger" style={{ animationDelay: '0.1s' }}>
        <span className="text-[0.75rem] font-medium text-forest-700 uppercase tracking-wide">{data.title}</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-2.5 animate-reveal-stagger" style={{ animationDelay: '0.2s' }}>
          <Shield className="w-4 h-4 text-forest-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Major decisions</div>
            <div className="text-[0.875rem] text-forest-800 mt-0.5">{data.majorDecisions}</div>
          </div>
        </div>
        <div className="flex items-start gap-2.5 animate-reveal-stagger" style={{ animationDelay: '0.35s' }}>
          <Banknote className="w-4 h-4 text-forest-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Money movement</div>
            <div className="text-[0.875rem] text-forest-800 mt-0.5">{data.moneyAuthority}</div>
          </div>
        </div>
        {data.note && (
          <p className="mt-2 pt-2 border-t border-cream-200 text-[0.78rem] text-sand-500 leading-relaxed animate-reveal-stagger" style={{ animationDelay: '0.5s' }}>
            {data.note}
          </p>
        )}
      </div>
    </div>
  );
}
