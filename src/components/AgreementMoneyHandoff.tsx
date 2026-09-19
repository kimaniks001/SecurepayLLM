import { Wallet } from 'lucide-react';
import type { AgreementDetail } from '../types';

interface AgreementMoneyHandoffProps {
  detail: AgreementDetail;
}

export function AgreementMoneyHandoff({ detail }: AgreementMoneyHandoffProps) {
  return (
    <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
      <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">Money</div>
      <div className="space-y-2.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[0.78rem] text-sand-600">Agreement amount</span>
          <span className="text-[0.875rem] font-medium text-forest-800">{detail.amount}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-[0.78rem] text-sand-600">Payment status</span>
          <span className="text-[0.78rem] text-sand-500">Available from SecurePay Money authority</span>
        </div>
      </div>
      <button className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.825rem] font-medium py-2.5 hover:bg-forest-700 transition-colors">
        <Wallet className="w-4 h-4" />
        Open Money
      </button>
      <p className="mt-2 text-[0.72rem] text-sand-400 text-center">Demo handoff to SecurePay Money</p>
    </div>
  );
}
