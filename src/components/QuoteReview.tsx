import { FileCheck, AlertCircle, FileQuestion } from 'lucide-react';
import type { QuoteReviewResponse } from '../types';

interface QuoteReviewCardProps {
  data: QuoteReviewResponse;
}

export function QuoteReviewCard({ data }: QuoteReviewCardProps) {
  const stateConfig = {
    clear: { icon: FileCheck, iconClass: 'text-forest-500', label: 'Clear', labelClass: 'text-forest-700' },
    needs_clarification: { icon: AlertCircle, iconClass: 'text-ember-500', label: 'Needs clarification', labelClass: 'text-ember-700' },
    not_stated: { icon: FileQuestion, iconClass: 'text-sand-400', label: 'Not stated', labelClass: 'text-sand-500' },
  };

  return (
    <div className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden">
      <div className="px-4 py-3 bg-forest-50 border-b border-forest-100 flex items-center gap-2 animate-reveal-stagger" style={{ animationDelay: '0.1s' }}>
        <FileCheck className="w-4 h-4 text-forest-600" />
        <span className="text-[0.75rem] font-medium text-forest-700 uppercase tracking-wide">Quote review</span>
        <span className="text-[0.7rem] text-sand-500 ml-auto truncate">{data.filename}</span>
      </div>
      <div className="p-4 space-y-2.5">
        {data.facts.map((fact, i) => {
          const config = stateConfig[fact.state];
          const Icon = config.icon;
          return (
            <div
              key={i}
              className="flex items-start gap-2.5 animate-reveal-stagger"
              style={{ animationDelay: `${0.15 + i * 0.08}s` }}
            >
              <Icon className={`w-4 h-4 ${config.iconClass} shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[0.825rem] text-sand-600">{fact.label}</span>
                  <span className={`text-[0.7rem] font-medium uppercase tracking-wide ${config.labelClass}`}>
                    {config.label}
                  </span>
                </div>
                <div className={`text-[0.875rem] mt-0.5 ${fact.state === 'clear' ? 'text-forest-800 font-medium' : fact.state === 'not_stated' ? 'text-sand-400 italic' : 'text-ember-700'}`}>
                  {fact.value}
                </div>
              </div>
            </div>
          );
        })}
        {data.note && (
          <p className="mt-3 pt-3 border-t border-cream-200 text-[0.78rem] text-sand-500 leading-relaxed animate-reveal-stagger" style={{ animationDelay: `${0.15 + data.facts.length * 0.08}s` }}>
            {data.note}
          </p>
        )}
      </div>
    </div>
  );
}
