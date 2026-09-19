import { User, MapPin, Clock, BadgeCheck } from 'lucide-react';
import type { DisputeMaster } from '../types';

interface DisputeMasterListProps {
  masters: DisputeMaster[];
}

export function DisputeMasterList({ masters }: DisputeMasterListProps) {
  return (
    <div className="space-y-3 animate-quiet-in">
      <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4">
        <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1">Get a Master to help</div>
        <p className="text-[0.825rem] text-sand-600 mb-3">
          A Master is a human expert who can review this disputed issue and help the parties reach a resolution. The Master is not the SecurePay Agent and is not automatically a legal arbitrator.
        </p>
      </div>

      <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4">
        <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-3">Masters available for this issue</div>
        <div className="space-y-3">
          {masters.map((master) => (
            <div key={master.id} className="rounded-xl border border-cream-200 px-4 py-3 hover:border-forest-300 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-forest-50 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-forest-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.875rem] font-medium text-forest-800">{master.name}</div>
                  <div className="text-[0.78rem] text-sand-500">{master.title}</div>
                  <div className="text-[0.78rem] text-sand-600 mt-1">{master.expertise}</div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-[0.72rem] text-sand-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {master.serviceArea}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {master.availability}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 text-[0.72rem] text-forest-600">
                    <BadgeCheck className="w-3 h-3" />
                    {master.provenance}
                  </div>
                  <div className="mt-2 text-[0.825rem] font-medium text-forest-800">
                    Cost: {master.cost}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[0.72rem] text-sand-400 mt-3">
          No star-rating theatre. Masters are shown by expertise, qualification, service area, availability and cost.
        </p>
      </div>
    </div>
  );
}
