import { ShieldCheck, ChevronRight } from 'lucide-react';
import type { IdentityCheckResponse } from '../types';

interface IdentityCheckProps {
  data: IdentityCheckResponse;
}

export function IdentityCheck({ data }: IdentityCheckProps) {
  return (
    <div className="rounded-2xl border border-forest-200 bg-white shadow-deliberate overflow-hidden animate-fade-in-up">
      <div className="px-4 py-3 bg-forest-50 border-b border-forest-100 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-forest-600" />
        <span className="text-[0.75rem] font-medium text-forest-700 uppercase tracking-wide">
          Secure identity
        </span>
      </div>

      <div className="p-4">
        <p className="text-[0.875rem] text-sand-700 leading-relaxed mb-3">
          You are about to continue this as:
        </p>

        <div className="rounded-xl bg-cream-50 border border-cream-200 px-4 py-3 mb-3">
          <div className="font-display text-lg text-forest-800 leading-tight">{data.name}</div>
          <div className="text-[0.78rem] text-sand-500 mt-0.5">{data.ksn}</div>
        </div>

        <div className="rounded-xl bg-forest-50/50 border border-forest-100 px-3.5 py-2.5 mb-4">
          <p className="text-[0.78rem] text-forest-700 leading-relaxed">
            {data.reason}
          </p>
        </div>

        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 text-[0.825rem] font-medium text-cream-50 bg-forest-700 hover:bg-forest-800 rounded-lg px-4 py-2.5 transition-colors">
            Continue
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button className="flex-1 text-[0.825rem] font-medium text-forest-700 bg-cream-100 hover:bg-cream-200 rounded-lg px-4 py-2.5 transition-colors">
            Use another identity
          </button>
        </div>
      </div>
    </div>
  );
}
