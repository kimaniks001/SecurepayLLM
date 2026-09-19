import { Wallet, ChevronRight } from 'lucide-react';
import type { MoneyHandoffResponse } from '../types';

interface MoneyHandoffProps {
  data: MoneyHandoffResponse;
}

export function MoneyHandoff({ data }: MoneyHandoffProps) {
  return (
    <div className="rounded-2xl border border-forest-300 bg-white shadow-deliberate overflow-hidden animate-fade-in-up">
      <div className="px-4 py-3 bg-forest-700 border-b border-forest-600 flex items-center gap-2">
        <Wallet className="w-4 h-4 text-cream-100" />
        <span className="text-[0.75rem] font-medium text-cream-100 uppercase tracking-wide">
          Money
        </span>
      </div>

      <div className="p-4">
        <p className="text-[0.875rem] text-forest-800 leading-relaxed mb-3">
          {data.text}
        </p>

        <div className="rounded-xl bg-cream-50 border border-cream-200 px-3.5 py-2.5 mb-4">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-0.5">
            Agreement
          </div>
          <div className="text-[0.825rem] text-forest-700 font-medium">{data.agreementRef}</div>
        </div>

        <button className="w-full flex items-center justify-center gap-1.5 text-[0.825rem] font-medium text-cream-50 bg-forest-700 hover:bg-forest-800 rounded-lg px-4 py-2.5 transition-colors">
          View payment options
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
