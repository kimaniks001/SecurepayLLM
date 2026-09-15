import { AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import type { MoneyDetail } from '../types';
import { MoneyAuthorityBadge } from './MoneyAuthorityBadge';

interface PaymentFailedStateProps {
  detail: MoneyDetail;
  onRetry?: () => void;
  onChooseAnother?: () => void;
}

export function PaymentFailedState({ detail, onRetry, onChooseAnother }: PaymentFailedStateProps) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/30 px-5 py-5 animate-quiet-in">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-5 h-5 text-red-500" />
        <span className="text-[0.7rem] font-medium text-red-700 uppercase tracking-wide">Payment not completed</span>
      </div>
      {detail.errorMessage && (
        <p className="text-[0.825rem] text-red-600 mb-3">{detail.errorMessage}</p>
      )}
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
      <p className="text-[0.72rem] text-sand-400 mb-4">
        You can try again only after authority makes clear the prior attempt is final.
      </p>
      <div className="space-y-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-700 text-cream-50 text-[0.825rem] font-medium py-2.5 hover:bg-forest-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        )}
        {onChooseAnother && (
          <button
            onClick={onChooseAnother}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-cream-200 text-sand-600 text-[0.825rem] font-medium py-2.5 hover:bg-cream-50 transition-colors"
          >
            Choose another available method
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
        {!onRetry && !onChooseAnother && (
          <p className="text-[0.78rem] text-sand-500 text-center">
            No authorized next action for this participant.
          </p>
        )}
      </div>
      <div className="mt-3">
        <MoneyAuthorityBadge />
      </div>
    </div>
  );
}
