import { FileText, ChevronRight } from 'lucide-react';
import type { AgreementResultResponse } from '../types';

interface AgreementResultCardProps {
  data: AgreementResultResponse;
}

export function AgreementResultCard({ data }: AgreementResultCardProps) {
  return (
    <div className="rounded-2xl border border-forest-200 bg-white shadow-lifted overflow-hidden">
      <div className="px-4 py-3 bg-forest-50 border-b border-forest-100 flex items-center gap-2 animate-reveal-stagger" style={{ animationDelay: '0.1s' }}>
        <FileText className="w-4 h-4 text-forest-600" />
        <span className="text-[0.75rem] font-medium text-forest-700 uppercase tracking-wide">Agreement</span>
      </div>
      <div className="p-4">
        <h3 className="font-display text-lg text-forest-800 leading-tight animate-reveal-stagger" style={{ animationDelay: '0.15s' }}>
          {data.title}
        </h3>
        <div className="mt-2 flex items-center gap-2 animate-reveal-stagger" style={{ animationDelay: '0.2s' }}>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-forest-100 text-forest-700 text-[0.7rem] font-medium">
            {data.status}
          </span>
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex items-baseline gap-2 animate-reveal-stagger" style={{ animationDelay: '0.3s' }}>
            <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide w-16 shrink-0">Agreed</span>
            <span className="text-[0.875rem] text-forest-800 font-medium">{data.agreed}</span>
          </div>
          <div className="flex items-baseline gap-2 animate-reveal-stagger" style={{ animationDelay: '0.4s' }}>
            <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide w-16 shrink-0">Period</span>
            <span className="text-[0.875rem] text-forest-800">{data.period}</span>
          </div>
        </div>
        <div className="mt-3 animate-reveal-stagger" style={{ animationDelay: '0.5s' }}>
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1.5">Key terms</div>
          <ul className="space-y-1">
            {data.keyTerms.map((term, i) => (
              <li key={i} className="flex items-center gap-2 text-[0.825rem] text-forest-800">
                <span className="w-1 h-1 rounded-full bg-forest-500" />
                {term}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-3 text-[0.7rem] text-sand-400 leading-relaxed animate-reveal-stagger" style={{ animationDelay: '0.6s' }}>
          {data.provenance}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 animate-reveal-stagger" style={{ animationDelay: '0.7s' }}>
          <button className="flex items-center gap-1.5 text-[0.825rem] font-medium text-cream-50 bg-forest-700 hover:bg-forest-800 rounded-lg px-4 py-2.5 transition-colors active:scale-[0.98]">
            Open agreement
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button className="text-[0.825rem] font-medium text-forest-700 bg-cream-100 hover:bg-cream-200 rounded-lg px-4 py-2.5 transition-colors active:scale-[0.98]">
            What did we agree about defects?
          </button>
        </div>
      </div>
    </div>
  );
}
