import { CheckCircle, ArrowRight } from 'lucide-react';
import type { DisputeDetail } from '../types';

interface DisputeResolvedProps {
  dispute: DisputeDetail;
}

export function DisputeResolved({ dispute }: DisputeResolvedProps) {
  return (
    <div className="space-y-3 animate-quiet-in">
      <div className="rounded-2xl border border-forest-200 bg-forest-50/50 px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 text-forest-600" />
          <span className="text-[0.7rem] font-medium text-forest-700 uppercase tracking-wide">Dispute resolution agreed</span>
        </div>
        <div className="space-y-2.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[0.78rem] text-sand-600">Disputed component</span>
            <span className="text-[0.825rem] text-forest-800">{dispute.scope.disputedArea}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[0.78rem] text-sand-600">Agreed action</span>
            <span className="text-[0.825rem] text-forest-800 text-right">Correct affected tiles within 5 working days</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[0.78rem] text-sand-600">Agreed amount treatment</span>
            <span className="text-[0.825rem] text-forest-800">KES 15,000 linked to correction</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[0.78rem] text-sand-600">Target date</span>
            <span className="text-[0.825rem] text-forest-800">21 Nov 2026</span>
          </div>
        </div>
        <p className="text-[0.85rem] text-forest-800 mt-3 leading-relaxed">{dispute.resolution}</p>
      </div>

      <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4">
        <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">What happens next</div>
        <p className="text-[0.825rem] text-sand-600 mb-3">
          This dispute can now return to the agreement lifecycle.
        </p>
        <div className="space-y-2">
          <button className="w-full flex items-center justify-between rounded-xl border border-cream-200 px-4 py-3 hover:border-forest-300 hover:bg-cream-50 transition-all text-left">
            <span className="text-[0.825rem] font-medium text-forest-800">Return to agreement</span>
            <ArrowRight className="w-4 h-4 text-sand-400" />
          </button>
          <p className="text-[0.72rem] text-sand-400 px-1">
            If the resolution requires an agreement change, a change/version flow will be created. If it affects Money, the handoff goes to authoritative SecurePay Money. The dispute UI does not mutate either authority.
          </p>
        </div>
      </div>
    </div>
  );
}
