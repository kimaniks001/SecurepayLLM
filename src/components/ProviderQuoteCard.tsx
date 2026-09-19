import { Check, X, Calendar } from 'lucide-react';
import type { ProviderQuoteResponse } from '../types';

interface ProviderQuoteCardProps {
  data: ProviderQuoteResponse;
}

export function ProviderQuoteCard({ data }: ProviderQuoteCardProps) {
  return (
    <div className="rounded-2xl border border-forest-200 bg-white shadow-lifted overflow-hidden">
      {/* Header — enters first */}
      <div className="px-4 py-3 bg-forest-50 border-b border-forest-100 flex items-center gap-2.5 animate-reveal-stagger" style={{ animationDelay: '0.1s' }}>
        <img src={data.providerAvatar} alt={data.providerName} className="w-8 h-8 rounded-full object-cover ring-1 ring-cream-200" />
        <div>
          <div className="font-display text-sm text-forest-800 leading-tight">{data.providerName}</div>
          <div className="text-[0.7rem] text-sand-500">Quote</div>
        </div>
      </div>

      <div className="p-4">
        {/* Quote text */}
        <p className="text-[0.9rem] leading-relaxed text-forest-800 italic animate-reveal-stagger" style={{ animationDelay: '0.2s' }}>
          "{data.text}"
        </p>

        {/* Amount — settles with weight */}
        <div className="mt-4 flex items-baseline gap-2 animate-reveal-stagger" style={{ animationDelay: '0.35s' }}>
          <span className="font-display text-2xl text-forest-700 font-medium">{data.amount}</span>
          <span className="text-[0.78rem] text-sand-500">labour</span>
        </div>

        {/* Includes / excludes */}
        <div className="mt-3 grid grid-cols-2 gap-3 animate-reveal-stagger" style={{ animationDelay: '0.5s' }}>
          <div>
            <div className="text-[0.7rem] font-medium text-forest-600 uppercase tracking-wide mb-1.5">Includes</div>
            <ul className="space-y-1">
              {data.includes.map((item, i) => (
                <li key={i} className="flex items-center gap-1.5 text-[0.8rem] text-forest-700">
                  <Check className="w-3 h-3 text-forest-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[0.7rem] font-medium text-ember-600 uppercase tracking-wide mb-1.5">Customer provides</div>
            <ul className="space-y-1">
              {data.excludes.map((item, i) => (
                <li key={i} className="flex items-center gap-1.5 text-[0.8rem] text-sand-600">
                  <X className="w-3 h-3 text-ember-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Completion */}
        <div className="mt-3 flex items-center gap-2 text-[0.8rem] text-sand-600 animate-reveal-stagger" style={{ animationDelay: '0.65s' }}>
          <Calendar className="w-3.5 h-3.5 text-forest-400" />
          <span>Complete by {data.completion}</span>
        </div>
      </div>
    </div>
  );
}
