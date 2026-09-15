import { Check, Handshake } from 'lucide-react';
import type { DisputeDetail } from '../types';

interface DisputeMatchReachedProps {
  dispute: DisputeDetail;
}

export function DisputeMatchReached({ dispute }: DisputeMatchReachedProps) {
  return (
    <div className="space-y-3 animate-quiet-in">
      <div className="rounded-2xl border border-forest-200 bg-forest-50/50 px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Handshake className="w-4 h-4 text-forest-600" />
          <span className="text-[0.7rem] font-medium text-forest-700 uppercase tracking-wide">Match reached</span>
        </div>
        <p className="text-[0.85rem] text-forest-800 mb-3">Both parties agree:</p>
        <p className="text-[0.85rem] text-forest-800 leading-relaxed mb-4">{dispute.resolution}</p>
        <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.825rem] font-medium py-2.5 hover:bg-forest-700 transition-colors">
          <Check className="w-4 h-4" />
          Confirm this resolution
        </button>
      </div>
      <p className="text-[0.72rem] text-sand-400 px-1">
        Both parties must explicitly confirm the matching resolution. Silence is never consent.
      </p>
    </div>
  );
}
