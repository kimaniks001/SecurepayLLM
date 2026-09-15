import { ArrowLeft, Briefcase, MapPin, Clock, Check, ArrowRight, AlertCircle } from 'lucide-react';
import type { Solution } from '../types';

interface SolutionCardProps {
  solution: Solution;
  onBack: () => void;
  onUse: () => void;
}

export function SolutionCard({ solution, onBack, onUse }: SolutionCardProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Help
        </button>
        <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">{solution.title}</h1>
        <div className="text-[0.72rem] text-sand-500 mt-0.5">{solution.partnerName} · {solution.solutionType.replace(/_/g, ' ')}</div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-cream-100 flex items-center justify-center shrink-0">
              <Briefcase className="w-5 h-5 text-sand-500" />
            </div>
            <div className="flex-1">
              <div className="text-[0.875rem] font-medium text-forest-800">{solution.title}</div>
              <div className="text-[0.72rem] text-sand-500 mt-0.5">{solution.provenance}</div>
            </div>
          </div>
          <p className="text-[0.825rem] text-forest-800 leading-relaxed mt-3">{solution.description}</p>
        </div>

        {/* Details */}
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[0.825rem]">
              <MapPin className="w-3.5 h-3.5 text-sand-400" />
              <span className="text-sand-600">Service area:</span>
              <span className="text-forest-800">{solution.serviceArea}</span>
            </div>
            <div className="flex items-center gap-2 text-[0.825rem]">
              <Clock className="w-3.5 h-3.5 text-sand-400" />
              <span className="text-sand-600">Timing:</span>
              <span className="text-forest-800">{solution.timing}</span>
            </div>
            <div className="flex items-baseline justify-between text-[0.825rem]">
              <span className="text-sand-600">Pricing</span>
              <span className="text-forest-800 font-medium">{solution.price || solution.pricingType.replace(/_/g, ' ')}</span>
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Requirements</div>
          <ul className="space-y-1">
            {solution.requirements.map((req, i) => (
              <li key={i} className="flex items-start gap-2 text-[0.825rem] text-forest-800">
                <Check className="w-3.5 h-3.5 text-forest-500 mt-0.5 shrink-0" />
                {req}
              </li>
            ))}
          </ul>
        </div>

        {/* Can / Cannot establish */}
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="space-y-3">
            <div>
              <div className="text-[0.72rem] font-medium text-forest-600 mb-1">What it can establish</div>
              <p className="text-[0.825rem] text-forest-800">{solution.whatItCanEstablish}</p>
            </div>
            <div className="pt-2 border-t border-cream-100">
              <div className="text-[0.72rem] font-medium text-ember-600 mb-1">What it cannot establish</div>
              <p className="text-[0.825rem] text-sand-600">{solution.whatItCannotEstablish}</p>
            </div>
          </div>
        </div>

        {/* Authority boundary */}
        {(solution.solutionType === 'fund' || solution.solutionType === 'insure') && (
          <div className="rounded-xl border border-ember-200 bg-ember-50/30 px-4 py-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-ember-600 mt-0.5 shrink-0" />
              <p className="text-[0.72rem] text-ember-700">
                {solution.solutionType === 'fund'
                  ? 'Eligibility, interest rate, and loan approval are not determined by SecurePay. The Partner evaluates and decides.'
                  : 'Coverage, premium, and policy terms are not determined by SecurePay. The insurer evaluates and issues.'}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={onUse}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.875rem] font-medium py-3 hover:bg-forest-700 transition-colors"
        >
          Use this
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-[0.68rem] text-sand-400 italic px-2">
          Solution ≠ Agreement authority. Solution ≠ Money authority. Using this creates a SourceReference — it does not silently insert the Partner into your Agreement.
        </p>
      </div>
    </div>
  );
}
