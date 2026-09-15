import { ArrowRight } from 'lucide-react';
import type { ChangeRequestResponse } from '../types';

interface ChangeRequestCardProps {
  data: ChangeRequestResponse;
}

export function ChangeRequestCard({ data }: ChangeRequestCardProps) {
  return (
    <div className="rounded-2xl border border-ember-200 bg-ember-50/40 overflow-hidden max-w-md mx-auto animate-quiet-in">
      <div className="px-6 py-4">
        <h2 className="font-display text-base text-forest-800">{data.title}</h2>
        <div className="mt-3 space-y-2.5">
          {data.changes.map((change, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[0.825rem] text-sand-600 w-28 shrink-0">{change.label}</span>
              <span className="text-[0.825rem] text-sand-400 line-through">{change.from}</span>
              <ArrowRight className="w-3.5 h-3.5 text-ember-500" />
              <span className="text-[0.875rem] font-medium text-forest-800">{change.to}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[0.75rem] text-sand-500">The initiator must review this changed version before it can be set.</p>
      </div>
    </div>
  );
}
