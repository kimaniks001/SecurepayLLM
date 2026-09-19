import { User, FileSearch } from 'lucide-react';
import type { DisputeDetail } from '../types';

interface DisputeMasterReviewProps {
  dispute: DisputeDetail;
}

export function DisputeMasterReview({ dispute }: DisputeMasterReviewProps) {
  const master = dispute.selectedMaster;
  if (!master) return null;

  return (
    <div className="space-y-3 animate-quiet-in">
      <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <FileSearch className="w-4 h-4 text-forest-600" />
          <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Master review</span>
        </div>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-forest-50 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-forest-600" />
          </div>
          <div>
            <div className="text-[0.875rem] font-medium text-forest-800">{master.name}</div>
            <div className="text-[0.78rem] text-sand-500">{master.title}</div>
          </div>
        </div>

        <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Reviewing</div>
        <ul className="space-y-1.5 mb-4">
          <li className="flex items-start gap-2 text-[0.825rem] text-forest-800">
            <span className="w-1 h-1 rounded-full bg-forest-500 mt-2 shrink-0" />
            Current agreement/version
          </li>
          <li className="flex items-start gap-2 text-[0.825rem] text-forest-800">
            <span className="w-1 h-1 rounded-full bg-forest-500 mt-2 shrink-0" />
            Isolated disputed obligation
          </li>
          <li className="flex items-start gap-2 text-[0.825rem] text-forest-800">
            <span className="w-1 h-1 rounded-full bg-forest-500 mt-2 shrink-0" />
            Both party statements
          </li>
          <li className="flex items-start gap-2 text-[0.825rem] text-forest-800">
            <span className="w-1 h-1 rounded-full bg-forest-500 mt-2 shrink-0" />
            Evidence
          </li>
          <li className="flex items-start gap-2 text-[0.825rem] text-forest-800">
            <span className="w-1 h-1 rounded-full bg-forest-500 mt-2 shrink-0" />
            Any relevant documents
          </li>
        </ul>

        {dispute.siteInspection && (
          <div className="rounded-lg bg-ember-50 border border-ember-200 px-3 py-2.5">
            <div className="text-[0.7rem] font-medium text-ember-700 uppercase tracking-wide mb-1">Site inspection requested</div>
            <div className="text-[0.825rem] text-forest-800">{dispute.siteInspection.date} · {dispute.siteInspection.location}</div>
            <div className="text-[0.78rem] text-sand-600 mt-0.5">Cost: {dispute.siteInspection.cost}</div>
            <div className="text-[0.72rem] text-sand-500 mt-0.5">Who must attend: James (provide access)</div>
          </div>
        )}
      </div>
    </div>
  );
}
