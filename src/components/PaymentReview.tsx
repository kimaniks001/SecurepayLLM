import { ShieldCheck, ArrowRight } from 'lucide-react';
import type { MoneyDetail } from '../types';

interface PaymentReviewProps {
  detail: MoneyDetail;
  onConfirm: () => void;
  onBack: () => void;
}

export function PaymentReview({ detail, onConfirm, onBack }: PaymentReviewProps) {
  return (
    <div className="space-y-3 animate-quiet-in">
      <div className="rounded-2xl border border-forest-300 bg-white shadow-deliberate px-5 py-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-forest-600" />
          <span className="text-[0.7rem] font-medium text-forest-700 uppercase tracking-wide">You are about to pay</span>
        </div>

        <div className="space-y-2.5 mb-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[0.78rem] text-sand-600">Agreement</span>
            <span className="text-[0.825rem] font-medium text-forest-800 text-right">{detail.agreementLink.agreementTitle}</span>
          </div>
          {detail.agreementLink.milestoneTitle && (
            <div className="flex items-baseline justify-between">
              <span className="text-[0.78rem] text-sand-600">Related milestone</span>
              <span className="text-[0.825rem] text-forest-800">{detail.agreementLink.milestoneTitle}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-[0.78rem] text-sand-600">Amount</span>
            <span className="text-[1.1rem] font-display font-medium text-forest-800">{detail.amount}</span>
          </div>
          {detail.selectedRail && (
            <div className="flex items-baseline justify-between">
              <span className="text-[0.78rem] text-sand-600">Payment method</span>
              <span className="text-[0.825rem] text-forest-800">{detail.selectedRail.label}</span>
            </div>
          )}
          {detail.counterpartyName && (
            <div className="flex items-baseline justify-between">
              <span className="text-[0.78rem] text-sand-600">Recipient</span>
              <span className="text-[0.825rem] text-forest-800">{detail.counterpartyName}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-[0.78rem] text-sand-600">Paying as</span>
            <span className="text-[0.825rem] text-forest-800">{detail.capacityLabel}</span>
          </div>
        </div>

        {detail.feeBreakdown && (
          <div className="rounded-lg bg-cream-50 px-3 py-2.5 mb-4 space-y-1.5">
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1">Fee breakdown</div>
            <div className="flex items-baseline justify-between text-[0.78rem]">
              <span className="text-sand-600">Agreement amount</span>
              <span className="text-forest-800">{detail.feeBreakdown.agreementAmount}</span>
            </div>
            {detail.feeBreakdown.securePayFee && (
              <div className="flex items-baseline justify-between text-[0.78rem]">
                <span className="text-sand-600">SecurePay fee</span>
                <span className="text-forest-800">{detail.feeBreakdown.securePayFee}</span>
              </div>
            )}
            {detail.feeBreakdown.railFee && (
              <div className="flex items-baseline justify-between text-[0.78rem]">
                <span className="text-sand-600">Rail/provider fee</span>
                <span className="text-forest-800">{detail.feeBreakdown.railFee}</span>
              </div>
            )}
            <div className="flex items-baseline justify-between text-[0.825rem] font-medium pt-1.5 border-t border-cream-200">
              <span className="text-sand-600">Total</span>
              <span className="text-forest-800">{detail.feeBreakdown.total}</span>
            </div>
            {detail.feeBreakdown.feePending && (
              <p className="text-[0.68rem] text-sand-400 mt-1">Final fee will be shown before you confirm.</p>
            )}
          </div>
        )}

        <p className="text-[0.72rem] text-sand-400 mb-4">
          Take a moment to review. This is a consequential action.
        </p>

        <button
          onClick={onConfirm}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-700 text-cream-50 text-[0.875rem] font-medium py-3 hover:bg-forest-800 transition-colors"
        >
          Continue to payment
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={onBack}
          className="w-full text-[0.78rem] text-sand-500 hover:text-forest-600 mt-2"
        >
          Back
        </button>
      </div>
    </div>
  );
}
