import { Clock } from 'lucide-react';
import type { WaitingItem } from '../types';

interface WaitingOnOthersListProps {
  items: WaitingItem[];
  onOpenAgreement: (id: string) => void;
}

export function WaitingOnOthersList({ items, onOpenAgreement }: WaitingOnOthersListProps) {
  if (items.length === 0) return null;

  return (
    <div className="animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">
        Waiting on others · {items.length}
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onOpenAgreement(item.agreementId)}
            className="w-full text-left rounded-xl border border-cream-200 bg-cream-50/50 px-4 py-3 hover:border-cream-300 transition-all"
          >
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-cream-100 text-sand-500">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">{item.statusText}</div>
                <div className="text-[0.875rem] font-medium text-forest-800 mt-0.5">{item.title}</div>
                <div className="text-[0.78rem] text-sand-600 mt-0.5">{item.detail}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
