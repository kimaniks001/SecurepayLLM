import { ArrowLeft, FileText, MapPin, Check, ArrowRight, AlertCircle } from 'lucide-react';
import type { MasterRequest, MasterProfile } from '../types';

interface MasterRequestViewProps {
  master: MasterProfile;
  request: MasterRequest;
  onBack: () => void;
  onAppoint: () => void;
}

export function MasterRequestView({ master, request, onBack, onAppoint }: MasterRequestViewProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          {master.identity}
        </button>
        <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">Master request</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        {/* Question */}
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-forest-500" />
            <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Question</span>
          </div>
          <p className="text-[0.875rem] text-forest-800 leading-relaxed">{request.question}</p>
        </div>

        {/* Scope */}
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Scope</div>
          <p className="text-[0.825rem] text-forest-800 leading-relaxed">{request.scope}</p>
        </div>

        {/* Evidence */}
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Evidence available</div>
          <ul className="space-y-1">
            {request.evidenceRefs.map((ev, i) => (
              <li key={i} className="flex items-start gap-2 text-[0.825rem] text-forest-800">
                <Check className="w-3.5 h-3.5 text-forest-500 mt-0.5 shrink-0" />
                {ev}
              </li>
            ))}
          </ul>
        </div>

        {/* Site visit + cost */}
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[0.825rem]">
              <MapPin className="w-3.5 h-3.5 text-sand-400" />
              <span className="text-sand-600">Site visit:</span>
              <span className="text-forest-800">{request.siteVisitRequirement ? 'Required' : 'Not required'}</span>
            </div>
            <div className="flex items-baseline justify-between text-[0.825rem]">
              <span className="text-sand-600">Cost</span>
              <span className="font-display text-lg text-forest-800 font-medium">{request.cost}</span>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-ember-50 border border-ember-200 px-3 py-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-ember-600 mt-0.5 shrink-0" />
              <p className="text-[0.72rem] text-ember-700">
                Cost is shown before appointment. Payment for Master services is handled through the appropriate Money/commerce path — not automatically from Agreement funds.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onAppoint}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.875rem] font-medium py-3 hover:bg-forest-700 transition-colors"
        >
          Appoint {master.identity}
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-[0.68rem] text-sand-400 italic px-2">
          Master opinion does not automatically change Agreement, resolve dispute, or release Money. Parties may use the opinion as context.
        </p>
      </div>
    </div>
  );
}
