import { Scale } from 'lucide-react';
import type { MoneyDetail } from '../types';
import { MoneyAuthorityBadge } from './MoneyAuthorityBadge';

interface MoneyDisputeContextProps {
  detail: MoneyDetail;
}

export function MoneyDisputeContext({ detail }: MoneyDisputeContextProps) {
  return (
    <div className="rounded-2xl border border-ember-200 bg-ember-50/20 px-5 py-4 animate-quiet-in">
      <div className="flex items-center gap-2 mb-3">
        <Scale className="w-4 h-4 text-ember-600" />
        <span className="text-[0.7rem] font-medium text-ember-700 uppercase tracking-wide">Dispute context</span>
      </div>
      <div className="space-y-2.5 mb-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[0.78rem] text-sand-600">Disputed amount</span>
          <span className="text-[0.875rem] font-medium text-ember-700">{detail.disputeAmount}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-[0.78rem] text-sand-600">Agreement</span>
          <span className="text-[0.825rem] text-forest-800">{detail.agreementLink.agreementTitle}</span>
        </div>
      </div>
      <div className="rounded-lg bg-white border border-cream-200 px-3 py-2.5 mb-3">
        <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1">Money status</div>
        <p className="text-[0.825rem] text-forest-800">{detail.stateLabel}</p>
        <p className="text-[0.78rem] text-sand-600 mt-1">
          The dispute identifies what is contested. Money determines what is financially true. These are separate.
        </p>
      </div>
      <MoneyAuthorityBadge />
    </div>
  );
}
