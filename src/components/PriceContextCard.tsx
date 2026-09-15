import { TrendingUp, Info } from 'lucide-react';
import type { PriceContextResponse } from '../types';

interface PriceContextCardProps {
  data: PriceContextResponse;
}

export function PriceContextCard({ data }: PriceContextCardProps) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden">
      {/* Main range appears first */}
      <div className="px-4 pt-4 pb-3 animate-reveal-stagger" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center gap-2 text-[0.75rem] font-medium text-sand-500 uppercase tracking-wide">
          <TrendingUp className="w-3.5 h-3.5" />
          {data.label}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-3xl text-forest-800 font-medium tracking-tight">{data.range}</span>
          <span className="text-sm text-sand-500">{data.unit}</span>
        </div>
      </div>

      {/* Supporting provenance follows */}
      <div className="px-4 pb-3 animate-reveal-stagger" style={{ animationDelay: '0.35s' }}>
        <div className="text-[0.7rem] text-sand-500 uppercase tracking-wide mb-1.5">Based on</div>
        <ul className="space-y-1">
          {data.sources.map((src, i) => (
            <li key={i} className="flex items-center gap-2 text-[0.825rem] text-sand-700">
              <span className="w-1 h-1 rounded-full bg-forest-400" />
              {src}
            </li>
          ))}
        </ul>
      </div>

      {/* Notes settle next */}
      <div className="px-4 py-2.5 bg-cream-50 border-t border-cream-100 flex items-start gap-2 animate-reveal-stagger" style={{ animationDelay: '0.55s' }}>
        <Info className="w-3.5 h-3.5 text-ember-400 shrink-0 mt-0.5" />
        <p className="text-[0.78rem] text-sand-600 leading-relaxed">{data.note}</p>
      </div>

      {/* Provenance note settles last */}
      <div className="px-4 py-2 bg-forest-50/50 border-t border-forest-100 animate-reveal-stagger" style={{ animationDelay: '0.75s' }}>
        <p className="text-[0.7rem] text-forest-600 leading-relaxed">
          Demo market data. Real results will come from current SecurePay listings.
        </p>
      </div>
    </div>
  );
}
