import { CheckCircle, Circle, ClipboardCheck } from 'lucide-react';
import type { PurchaseChecklistResponse } from '../types';

interface PurchaseChecklistCardProps {
  data: PurchaseChecklistResponse;
}

export function PurchaseChecklistCard({ data }: PurchaseChecklistCardProps) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white shadow-card overflow-hidden">
      <div className="px-4 py-3 bg-forest-50 border-b border-forest-100 flex items-center gap-2 animate-reveal-stagger" style={{ animationDelay: '0.1s' }}>
        <ClipboardCheck className="w-4 h-4 text-forest-600" />
        <span className="text-[0.75rem] font-medium text-forest-700 uppercase tracking-wide">{data.title}</span>
      </div>
      <div className="p-4">
        <ul className="space-y-2">
          {data.items.map((item, i) => (
            <li
              key={i}
              className="flex items-center gap-2.5 animate-reveal-stagger"
              style={{ animationDelay: `${0.15 + i * 0.08}s` }}
            >
              {item.checked ? (
                <CheckCircle className="w-4 h-4 text-forest-500 shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-sand-300 shrink-0" />
              )}
              <span className={`text-[0.875rem] ${item.checked ? 'text-forest-800' : 'text-sand-600'}`}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
        {data.note && (
          <p className="mt-3 pt-3 border-t border-cream-200 text-[0.78rem] text-sand-500 leading-relaxed">
            {data.note}
          </p>
        )}
      </div>
    </div>
  );
}
