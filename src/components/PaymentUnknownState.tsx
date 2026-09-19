import { HelpCircle, RefreshCw } from 'lucide-react';
import type { MoneyDetail } from '../types';
import { MoneyAuthorityBadge } from './MoneyAuthorityBadge';

interface PaymentUnknownStateProps {
  detail: MoneyDetail;
  onCheckStatus: () => void;
}

export function PaymentUnknownState({ detail, onCheckStatus }: PaymentUnknownStateProps) {
  return (
    <div className="rounded-2xl border border-ember-300 bg-ember-50/40 px-5 py-5 animate-quiet-in">
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle className="w-5 h-5 text-ember-600" />
        <span className="text-[0.7rem] font-medium text-ember-700 uppercase tracking-wide">We're checking the payment status</span>
      </div>
      <p className="text-[0.875rem] text-forest-800 mb-3">
        SecurePay has not received a final status.
      </p>
      <div className="space-y-1.5 mb-4">
        <div className="flex items-baseline justify-between text-[0.78rem]">
          <span className="text-sand-600">Amount</span>
          <span className="font-medium text-forest-800">{detail.amount}</span>
        </div>
        {detail.attemptReference && (
          <div className="flex items-baseline justify-between text-[0.78rem]">
            <span className="text-sand-600">Reference</span>
            <span className="text-forest-800">{detail.attemptReference}</span>
          </div>
        )}
      </div>
      <div className="rounded-lg bg-white border border-ember-200 px-3 py-2.5 mb-4">
        <p className="text-[0.78rem] text-sand-600">
          Do not try again yet. A payment attempt is already in progress. Attempting another payment may cause a duplicate.
        </p>
      </div>
      <button
        onClick={onCheckStatus}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-ember-600 text-cream-50 text-[0.825rem] font-medium py-2.5 hover:bg-ember-700 transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Check status
      </button>
      <button className="w-full text-[0.78rem] text-sand-500 hover:text-forest-600 mt-2">
        Return to agreement
      </button>
      <div className="mt-3">
        <MoneyAuthorityBadge />
      </div>
    </div>
  );
}
