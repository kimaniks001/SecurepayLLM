import { ArrowLeft, ShieldCheck, MapPin, Award, Check, ArrowRight } from 'lucide-react';
import type { MasterProfile } from '../types';

interface MasterProfileCardProps {
  master: MasterProfile;
  onBack: () => void;
  onRequest: () => void;
}

export function MasterProfileCard({ master, onBack, onRequest }: MasterProfileCardProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Help
        </button>
        <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">{master.identity}</h1>
        <div className="text-[0.72rem] text-sand-500 mt-0.5">SecurePay Master — Subject-matter expert</div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-cream-100 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-sand-500" />
            </div>
            <div className="flex-1">
              <div className="text-[0.875rem] font-medium text-forest-800">{master.identity}</div>
              <div className="text-[0.72rem] text-sand-500 mt-0.5">SecurePay Master status — active</div>
            </div>
          </div>

          <div className="mt-3">
            <div className="text-[0.72rem] text-sand-500 mb-1">Expertise</div>
            <div className="flex flex-wrap gap-1.5">
              {master.expertise.map((exp, i) => (
                <span key={i} className="text-[0.72rem] text-forest-700 bg-forest-50 border border-forest-100 rounded-full px-2 py-0.5">{exp}</span>
              ))}
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[0.78rem] text-sand-600">
              <MapPin className="w-3.5 h-3.5 text-sand-400" />
              {master.serviceArea}
            </div>
            <div className="text-[0.78rem] text-sand-600">Availability: {master.availability}</div>
            <div className="text-[0.78rem] text-sand-600">Pricing: {master.pricingBasis}</div>
            {master.inspectionCapability && (
              <div className="flex items-center gap-1.5 text-[0.78rem] text-forest-600">
                <Check className="w-3.5 h-3.5" />
                Site inspection capability
              </div>
            )}
          </div>

          {master.qualificationRefs.length > 0 && (
            <div className="mt-3 pt-3 border-t border-cream-100">
              <div className="flex items-center gap-1.5 text-[0.72rem] font-medium text-sand-500 mb-1">
                <Award className="w-3.5 h-3.5" />
                Qualifications
              </div>
              <ul className="space-y-0.5">
                {master.qualificationRefs.map((q, i) => (
                  <li key={i} className="text-[0.78rem] text-forest-800">· {q}</li>
                ))}
              </ul>
            </div>
          )}

          {master.accreditationRefs.length > 0 && (
            <div className="mt-2">
              <div className="text-[0.72rem] font-medium text-sand-500 mb-1">Accreditation</div>
              <ul className="space-y-0.5">
                {master.accreditationRefs.map((a, i) => (
                  <li key={i} className="text-[0.78rem] text-forest-800">· {a}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Master status ≠ licence */}
        <div className="rounded-2xl border border-cream-200 bg-cream-50/50 px-5 py-4">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Master status vs statutory licence</div>
          <p className="text-[0.78rem] text-sand-600">
            SecurePay Master status is not the same as a statutory licence or accreditation. Where licensing matters, the real qualification is shown separately above. Master status does not invent statutory authority.
          </p>
        </div>

        {/* Master opinion ≠ Agreement */}
        <div className="rounded-2xl border border-cream-200 bg-cream-50/50 px-5 py-4">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">What a Master opinion can and cannot do</div>
          <div className="space-y-1 text-[0.78rem] text-sand-600">
            <div className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-forest-400 mt-2 shrink-0" /> Expert assessment, recommendation, or finding within stated scope</div>
            <div className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-sand-400 mt-2 shrink-0" /> Does not automatically change Agreement</div>
            <div className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-sand-400 mt-2 shrink-0" /> Does not automatically resolve dispute or release Money</div>
            <div className="flex items-start gap-2"><span className="w-1 h-1 rounded-full bg-sand-400 mt-2 shrink-0" /> Not a binding SecurePay judgment</div>
          </div>
        </div>

        <button
          onClick={onRequest}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.875rem] font-medium py-3 hover:bg-forest-700 transition-colors"
        >
          Request Master assessment
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-[0.68rem] text-sand-400 italic px-2">
          Master ≠ Agent. Master ≠ Arbitrator by default. Master opinion ≠ Agreement change. Master opinion ≠ Money instruction.
        </p>
      </div>
    </div>
  );
}
