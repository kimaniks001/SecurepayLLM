import { ArrowLeft, ArrowRight, FileText, Sparkles } from 'lucide-react';
import type { CommunityObject } from '../types';

interface CommunityToTradeHandoffProps {
  object: CommunityObject;
  helperName?: string;
  onBack: () => void;
  onProceed: () => void;
}

export function CommunityToTradeHandoff({ object, helperName, onBack, onProceed }: CommunityToTradeHandoffProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Community
        </button>
        <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">Trade Taking Shape</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        {/* Community provenance */}
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-forest-500" />
            <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">From Community</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-[0.78rem]">
              <span className="text-sand-600">Source</span>
              <span className="text-forest-800 font-medium text-right">{object.title}</span>
            </div>
            <div className="flex items-baseline justify-between text-[0.78rem]">
              <span className="text-sand-600">Type</span>
              <span className="text-forest-800 capitalize">{object.objectType.replace(/_/g, ' ')}</span>
            </div>
            {helperName && (
              <div className="flex items-baseline justify-between text-[0.78rem]">
                <span className="text-sand-600">Helper</span>
                <span className="text-forest-800">{helperName}</span>
              </div>
            )}
            {object.generalLocation && (
              <div className="flex items-baseline justify-between text-[0.78rem]">
                <span className="text-sand-600">Location</span>
                <span className="text-forest-800">{object.generalLocation}</span>
              </div>
            )}
          </div>
          <div className="mt-2 text-[0.68rem] text-sand-400 italic">{object.provenance}</div>
        </div>

        {/* Taking shape */}
        <div className="rounded-2xl border border-forest-300 bg-forest-50/30 px-5 py-4 animate-quiet-in">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-forest-600" />
            <span className="text-[0.7rem] font-medium text-forest-700 uppercase tracking-wide">Current trade taking shape</span>
          </div>
          <p className="text-[0.825rem] text-sand-600 mb-3">
            Nothing is authoritative yet. Community facts are adopted into the candidate trade. The agreement process will determine what becomes authoritative.
          </p>
          <button
            onClick={onProceed}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.875rem] font-medium py-3 hover:bg-forest-700 transition-colors"
          >
            Continue to agreement
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="text-[0.68rem] text-sand-400 italic px-2 space-y-0.5">
          <p>Community object ≠ Trade</p>
          <p>Need ≠ Agreement</p>
          <p>"I can help" ≠ Agreement</p>
          <p>Community content ≠ Agreement term</p>
        </div>
      </div>
    </div>
  );
}
