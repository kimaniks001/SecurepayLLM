import { Smartphone, Clock, RefreshCw } from 'lucide-react';
import type { MoneyDetail } from '../types';
import { MoneyAuthorityBadge } from './MoneyAuthorityBadge';

interface PaymentPendingProps {
  detail: MoneyDetail;
  onCheckStatus: () => void;
}

export function PaymentPending({ detail, onCheckStatus }: PaymentPendingProps) {
  return (
    <div className="rounded-2xl border border-ember-200 bg-ember-50/30 px-5 py-5 animate-quiet-in">
      <div className="flex items-center gap-2 mb-3">
        <Smartphone className="w-5 h-5 text-ember-600" />
        <span className="text-[0.7rem] font-medium text-ember-700 uppercase tracking-wide">Payment request sent</span>
      </div>
      <p className="text-[0.875rem] text-forest-800 mb-3">
        Check your phone to complete the M-PESA request.
      </p>
      <div className="space-y-1.5 mb-4">
        <div className="flex items-baseline justify-between text-[0.78rem]">
          <span className="text-sand-600">Amount</span>
          <span className="font-medium text-forest-800">{detail.amount}</span>
        </div>
        <div className="flex items-baseline justify-between text-[0.78rem]">
          <span className="text-sand-600">Reference</span>
          <span className="text-forest-800">{detail.attemptReference}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[0.78rem] text-ember-600">
          <Clock className="w-3.5 h-3.5" />
          Waiting for confirmation
        </div>
      </div>
      <div className="rounded-lg bg-cream-50 border border-cream-200 px-3 py-2.5 mb-4">
        <p className="text-[0.78rem] text-sand-600">
          A payment attempt is already in progress. Do not attempt another payment while this one may still exist.
        </p>
      </div>
      <button
        onClick={onCheckStatus}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-cream-200 text-sand-600 text-[0.825rem] font-medium py-2.5 hover:bg-cream-50 transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Check status
      </button>
      <div className="mt-3">
        <MoneyAuthorityBadge />
      </div>
    </div>
  );
}
