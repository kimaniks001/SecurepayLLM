import { ArrowLeft, Building2, MapPin, ShieldCheck, ArrowRight } from 'lucide-react';
import type { PartnerProfile } from '../types';

interface PartnerProfileCardProps {
  partner: PartnerProfile;
  onBack: () => void;
  onOpenSolution: (solutionId: string) => void;
}

export function PartnerProfileCard({ partner, onBack, onOpenSolution }: PartnerProfileCardProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Help
        </button>
        <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">{partner.identity}</h1>
        <div className="text-[0.72rem] text-sand-500 mt-0.5 capitalize">{partner.partnerType.replace(/_/g, ' ')} — Partner</div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-cream-100 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-sand-500" />
            </div>
            <div className="flex-1">
              <div className="text-[0.875rem] font-medium text-forest-800">{partner.identity}</div>
              <div className="text-[0.72rem] text-sand-500 mt-0.5">{partner.institutionalStatus}</div>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[0.78rem] text-sand-600">
              <MapPin className="w-3.5 h-3.5 text-sand-400" />
              {partner.serviceAreas.join(' · ')}
            </div>
            {partner.accreditationRefs.length > 0 && (
              <div className="flex items-center gap-1.5 text-[0.78rem] text-forest-600">
                <ShieldCheck className="w-3.5 h-3.5" />
                {partner.accreditationRefs.join(' · ')}
              </div>
            )}
          </div>
        </div>

        {/* Solutions */}
        <div>
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Solutions provided</div>
          <div className="space-y-2">
            {partner.solutions.map((solId) => (
              <button
                key={solId}
                onClick={() => onOpenSolution(solId)}
                className="w-full text-left rounded-xl border border-cream-200 bg-white px-4 py-3 hover:border-forest-300 transition-all flex items-center justify-between"
              >
                <span className="text-[0.825rem] font-medium text-forest-800">View solution</span>
                <ArrowRight className="w-4 h-4 text-sand-400" />
              </button>
            ))}
          </div>
        </div>

        <p className="text-[0.68rem] text-sand-400 italic px-2">
          Partner ≠ Store seller automatically. Partner ≠ original Agreement party by default. Partner and Solution are distinct capacities.
        </p>
      </div>
    </div>
  );
}
