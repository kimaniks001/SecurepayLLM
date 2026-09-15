import { Heart, Target } from 'lucide-react';
import type { ContributionPlanResponse } from '../types';

interface ContributionPlanCardProps {
  data: ContributionPlanResponse;
}

export function ContributionPlanCard({ data }: ContributionPlanCardProps) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden">
      <div className="px-4 py-3 bg-forest-50 border-b border-forest-100 flex items-center gap-2 animate-reveal-stagger" style={{ animationDelay: '0.1s' }}>
        <Heart className="w-4 h-4 text-forest-600" />
        <span className="text-[0.75rem] font-medium text-forest-700 uppercase tracking-wide">{data.title}</span>
      </div>
      <div className="p-4">
        <div className="space-y-2">
          {data.categories.map((cat, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b border-cream-100 last:border-0 animate-reveal-stagger"
              style={{ animationDelay: `${0.15 + i * 0.08}s` }}
            >
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${cat.state === 'set' ? 'bg-forest-500' : 'bg-sand-300'}`} />
                <span className={`text-[0.875rem] ${cat.state === 'set' ? 'text-forest-800' : 'text-sand-500'}`}>
                  {cat.label}
                </span>
              </div>
              {cat.amount && (
                <span className="text-[0.825rem] font-medium text-forest-700">{cat.amount}</span>
              )}
            </div>
          ))}
        </div>
        {data.target && (
          <div className="mt-3 pt-3 border-t border-cream-200 flex items-center gap-2 animate-reveal-stagger" style={{ animationDelay: '0.5s' }}>
            <Target className="w-4 h-4 text-forest-500" />
            <span className="text-[0.825rem] text-sand-600">Target:</span>
            <span className="font-display text-lg text-forest-800 font-medium">{data.target}</span>
          </div>
        )}
        {data.note && (
          <p className="mt-2 text-[0.78rem] text-sand-500 leading-relaxed">{data.note}</p>
        )}
      </div>
    </div>
  );
}
