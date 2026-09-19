import { ShoppingBag, ChevronRight } from 'lucide-react';
import type { StorePromptResponse } from '../types';

interface StorePromptProps {
  data: StorePromptResponse;
}

export function StorePrompt({ data }: StorePromptProps) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden animate-fade-in-up">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-cream-100">
        <div className="w-7 h-7 rounded-full bg-forest-50 flex items-center justify-center">
          <ShoppingBag className="w-3.5 h-3.5 text-forest-500" />
        </div>
        <span className="text-[0.75rem] font-medium text-sand-500 uppercase tracking-wide">
          SecurePay Store
        </span>
      </div>

      <div className="p-4">
        <p className="text-[0.875rem] text-forest-800 leading-relaxed mb-3">
          {data.text}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {data.materials.map((mat, i) => (
            <span
              key={i}
              className="text-[0.75rem] text-sand-600 bg-cream-100 border border-cream-200 rounded-full px-2.5 py-1"
            >
              {mat}
            </span>
          ))}
        </div>

        <button className="w-full flex items-center justify-center gap-1.5 text-[0.825rem] font-medium text-forest-700 bg-forest-50 hover:bg-forest-100 rounded-lg px-4 py-2.5 transition-colors">
          Browse store listings
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
