import { ArrowLeft, ArrowRight, FileText, Sparkles, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { SourceReference } from '../types';
import { SourceReferenceBadge } from './SourceReferenceBadge';

interface SourceToTradeHandoffProps {
  source: SourceReference;
  onBack: () => void;
  onProceed: () => void;
}

export function SourceToTradeHandoff({ source, onBack, onProceed }: SourceToTradeHandoffProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </button>
        <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">Trade Taking Shape</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        {/* Source provenance */}
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-forest-500" />
            <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Started from</span>
          </div>
          <div className="mb-2">
            <SourceReferenceBadge source={source} />
          </div>
          <p className="text-[0.825rem] text-forest-800 mt-1">{source.sourceProvenance}</p>
          {source.sourceVersion && (
            <div className="text-[0.72rem] text-sand-400 mt-1">Source version: {source.sourceVersion}</div>
          )}
        </div>

        {/* Counterparty */}
        {source.selectedCounterpartyIdentity && (
          <div className={`rounded-2xl border px-5 py-4 animate-quiet-in ${source.sourceType === 'store_offer' && source.sourceIntroducerIdentity ? 'border-ember-200 bg-ember-50/20' : 'border-forest-200 bg-forest-50/20'}`}>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-forest-600" />
              <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Candidate counterparty</span>
            </div>
            <div className="flex items-baseline justify-between text-[0.78rem]">
              <span className="text-sand-600">Counterparty</span>
              <span className="text-forest-800 font-medium">{source.selectedCounterpartyIdentity}</span>
            </div>
            {source.sourceIntroducerIdentity && (
              <div className="mt-2 flex items-start gap-2 text-[0.72rem] text-sand-500">
                <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-ember-500" />
                <span>Introduced by {source.sourceIntroducerIdentity}. Introducer is provenance only, not a party to the agreement.</span>
              </div>
            )}
          </div>
        )}

        {/* Adopted facts */}
        <div className="rounded-2xl border border-forest-300 bg-forest-50/30 px-5 py-4 animate-quiet-in">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-forest-600" />
            <span className="text-[0.7rem] font-medium text-forest-700 uppercase tracking-wide">Adopted facts from source</span>
          </div>
          <div className="space-y-2.5 mb-3">
            {source.adoptedCandidateFacts.map((fact, i) => (
              <div key={i} className="rounded-lg bg-white/60 px-3 py-2">
                <div className="flex items-baseline justify-between text-[0.78rem]">
                  <span className="text-sand-600">{fact.label}</span>
                  <span className="text-forest-800 text-right">{fact.value}</span>
                </div>
                <div className="text-[0.68rem] text-sand-400 mt-0.5">{fact.provenance}</div>
              </div>
            ))}
          </div>
          <p className="text-[0.78rem] text-sand-600 mb-2">
            Nothing is authoritative yet. Source facts are candidate trade understanding until the agreement process crosses the established authority boundary.
          </p>
          <p className="text-[0.72rem] text-sand-400 mb-3">
            You only need to explain what is different or what remains unknown. SecurePay already understands the rest from the source.
          </p>
          <button
            onClick={onProceed}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.875rem] font-medium py-3 hover:bg-forest-700 transition-colors"
          >
            Continue to agreement
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Doctrine */}
        <div className="text-[0.68rem] text-sand-400 italic px-2 space-y-0.5">
          <p>Source ≠ Agreement</p>
          <p>Reference ≠ Adoption</p>
          <p>Adoption ≠ Established Agreement</p>
          <p>Source price ≠ Money truth</p>
        </div>
      </div>
    </div>
  );
}
