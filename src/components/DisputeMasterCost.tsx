import { ArrowLeft, Receipt } from 'lucide-react';
import type { DisputeDetail } from '../types';

interface DisputeMasterCostProps {
  dispute: DisputeDetail;
}

export function DisputeMasterCost({ dispute }: DisputeMasterCostProps) {
  const master = dispute.selectedMaster;
  if (!master) return null;

  return (
    <div className="space-y-3 animate-quiet-in">
      <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Receipt className="w-4 h-4 text-forest-600" />
          <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Master review cost</span>
        </div>
        <div className="text-[1.5rem] font-display font-medium text-forest-800 mb-3">{master.cost}</div>
        <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">What this covers</div>
        <ul className="space-y-1.5 mb-4">
          <li className="flex items-start gap-2 text-[0.825rem] text-forest-800">
            <span className="w-1 h-1 rounded-full bg-forest-500 mt-2 shrink-0" />
            Review agreement
          </li>
          <li className="flex items-start gap-2 text-[0.825rem] text-forest-800">
            <span className="w-1 h-1 rounded-full bg-forest-500 mt-2 shrink-0" />
            Review submitted evidence
          </li>
          <li className="flex items-start gap-2 text-[0.825rem] text-forest-800">
            <span className="w-1 h-1 rounded-full bg-forest-500 mt-2 shrink-0" />
            Review both parties' positions
          </li>
          <li className="flex items-start gap-2 text-[0.825rem] text-forest-800">
            <span className="w-1 h-1 rounded-full bg-forest-500 mt-2 shrink-0" />
            Issue written expert opinion
          </li>
        </ul>

        {dispute.siteInspection && (
          <div className="rounded-lg bg-cream-50 px-3 py-2.5 mb-4">
            <div className="text-[0.78rem] font-medium text-sand-600 mb-1">If physical inspection is required</div>
            <div className="text-[0.825rem] text-forest-800">Additional site inspection cost: {dispute.siteInspection.cost}</div>
            <div className="text-[0.72rem] text-sand-500 mt-0.5">{dispute.siteInspection.location} · {dispute.siteInspection.date}</div>
          </div>
        )}

        <p className="text-[0.72rem] text-sand-400 mb-4">
          Any actual charge will be handled through the authoritative SecurePay Money/Operations flow. No hidden costs.
        </p>

        <div className="flex gap-2">
          <button className="flex-1 rounded-xl bg-forest-600 text-cream-50 text-[0.825rem] font-medium py-2.5 hover:bg-forest-700 transition-colors">
            Agree to appoint Master
          </button>
          <button className="flex items-center gap-1.5 rounded-xl border border-cream-200 text-sand-600 text-[0.825rem] font-medium px-4 py-2.5 hover:bg-cream-50 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to discussion
          </button>
        </div>
      </div>
    </div>
  );
}
