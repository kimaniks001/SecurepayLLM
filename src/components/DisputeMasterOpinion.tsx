import { Scale, Check, X } from 'lucide-react';
import type { DisputeDetail } from '../types';

interface DisputeMasterOpinionProps {
  dispute: DisputeDetail;
  showMatching?: boolean;
}

export function DisputeMasterOpinion({ dispute, showMatching }: DisputeMasterOpinionProps) {
  return (
    <div className="space-y-3 animate-quiet-in">
      <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Scale className="w-4 h-4 text-forest-600" />
          <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Master opinion</span>
        </div>
        <p className="text-[0.85rem] text-forest-800 leading-relaxed mb-3">{dispute.masterOpinion}</p>

        {dispute.masterRecommendation && (
          <div className="rounded-lg bg-forest-50 px-3 py-2.5 mb-3">
            <div className="text-[0.7rem] font-medium text-forest-700 uppercase tracking-wide mb-1">Recommended resolution</div>
            <p className="text-[0.825rem] text-forest-800">{dispute.masterRecommendation}</p>
          </div>
        )}

        <p className="text-[0.72rem] text-sand-400 mb-3">
          This is an expert opinion, not a court judgment. It helps the parties reach matching instructions.
        </p>
      </div>

      {showMatching && (
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">Do you agree to resolve the disputed component this way?</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl border border-cream-200 px-3 py-2">
              <span className="text-[0.825rem] text-forest-800">James</span>
              <div className="flex gap-2">
                <button className="flex items-center gap-1.5 rounded-lg bg-forest-50 text-forest-600 text-[0.78rem] font-medium px-3 py-1.5 hover:bg-forest-100 transition-colors">
                  <Check className="w-3.5 h-3.5" />
                  Agree
                </button>
                <button className="flex items-center gap-1.5 rounded-lg bg-ember-50 text-ember-600 text-[0.78rem] font-medium px-3 py-1.5 hover:bg-ember-100 transition-colors">
                  <X className="w-3.5 h-3.5" />
                  Counter
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-cream-200 px-3 py-2">
              <span className="text-[0.825rem] text-forest-800">Peter</span>
              <div className="flex gap-2">
                <button className="flex items-center gap-1.5 rounded-lg bg-forest-50 text-forest-600 text-[0.78rem] font-medium px-3 py-1.5 hover:bg-forest-100 transition-colors">
                  <Check className="w-3.5 h-3.5" />
                  Agree
                </button>
                <button className="flex items-center gap-1.5 rounded-lg bg-ember-50 text-ember-600 text-[0.78rem] font-medium px-3 py-1.5 hover:bg-ember-100 transition-colors">
                  <X className="w-3.5 h-3.5" />
                  Counter
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
