import { CheckCircle2 } from 'lucide-react';
import type { MoneyDetail } from '../types';
import { MoneyAuthorityBadge } from './MoneyAuthorityBadge';

interface PaymentConfirmedProps {
  detail: MoneyDetail;
}

export function PaymentConfirmed({ detail }: PaymentConfirmedProps) {
  const lastActivity = detail.activity[detail.activity.length - 1];

  return (
    <div className="rounded-2xl border border-forest-300 bg-forest-50/30 px-5 py-5 animate-quiet-in">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 className="w-5 h-5 text-forest-600" />
        <span className="text-[0.7rem] font-medium text-forest-700 uppercase tracking-wide">Payment confirmed</span>
      </div>
      <div className="space-y-2 mb-4">
        <div className="flex items-baseline justify-between text-[0.78rem]">
          <span className="text-sand-600">Agreement</span>
          <span className="text-forest-800 text-right">{detail.agreementLink.agreementTitle}</span>
        </div>
        <div className="flex items-baseline justify-between text-[0.78rem]">
          <span className="text-sand-600">Amount</span>
          <span className="font-medium text-forest-800">{detail.amount}</span>
        </div>
        {detail.selectedRail && (
          <div className="flex items-baseline justify-between text-[0.78rem]">
            <span className="text-sand-600">Method</span>
            <span className="text-forest-800">{detail.selectedRail.label}</span>
          </div>
        )}
        {lastActivity?.reference && (
          <div className="flex items-baseline justify-between text-[0.78rem]">
            <span className="text-sand-600">Reference</span>
            <span className="text-forest-800">{lastActivity.reference}</span>
          </div>
        )}
        {lastActivity && (
          <div className="flex items-baseline justify-between text-[0.78rem]">
            <span className="text-sand-600">Date</span>
            <span className="text-forest-800">{lastActivity.date}</span>
          </div>
        )}
      </div>
      <div className="rounded-lg bg-cream-50 border border-cream-200 px-3 py-2.5 mb-3">
        <p className="text-[0.78rem] text-sand-600">
          Payment confirmed does not automatically mean the agreement or milestone is complete. Those are separate authorities.
        </p>
      </div>
      <MoneyAuthorityBadge />
    </div>
  );
}
