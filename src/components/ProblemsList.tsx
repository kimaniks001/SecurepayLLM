import { Gavel } from 'lucide-react';
import type { ProblemItem } from '../types';

interface ProblemsListProps {
  items: ProblemItem[];
  onOpenAgreement: (id: string) => void;
}

/** Final Phase 3 correction (Section 9) — real, backend-authoritative review/dispute state from
 *  GET /api/v1/me/agreements/home, never inferred from Agreement age or status alone. */
export function ProblemsList({ items, onOpenAgreement }: ProblemsListProps) {
  if (items.length === 0) return null;

  return (
    <div className="animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">
        Problems · {items.length}
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onOpenAgreement(item.agreementId)}
            className="w-full text-left rounded-xl border border-ember-200 bg-ember-50/50 px-4 py-3 hover:border-ember-300 transition-all"
          >
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-ember-100 text-ember-600">
                <Gavel className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.7rem] font-medium text-ember-600 uppercase tracking-wide">{item.stateLabel}</div>
                <div className="text-[0.875rem] font-medium text-forest-800 mt-0.5">{item.title}</div>
                {item.detail && <div className="text-[0.78rem] text-sand-600 mt-0.5">{item.detail}</div>}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
