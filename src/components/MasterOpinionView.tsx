import { ArrowLeft, ShieldCheck, FileText, ArrowRight, AlertCircle } from 'lucide-react';
import type { MasterOpinion } from '../types';

interface MasterOpinionViewProps {
  opinion: MasterOpinion;
  onBack: () => void;
  onUseDirection: () => void;
}

export function MasterOpinionView({ opinion, onBack, onUseDirection }: MasterOpinionViewProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="px-4 md:px-6 py-3 border-b border-cream-200/60 bg-cream-50">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[0.8rem] text-sand-500 hover:text-forest-600 transition-colors mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Help
        </button>
        <h1 className="font-display text-lg text-forest-800 font-medium leading-tight">Master opinion</h1>
        <div className="text-[0.72rem] text-sand-500 mt-0.5">{opinion.masterIdentity} · {opinion.createdAt}</div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 space-y-4">
        {/* Question */}
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-sand-500" />
            <span className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide">Question asked</span>
          </div>
          <p className="text-[0.875rem] text-forest-800 leading-relaxed">{opinion.question}</p>
        </div>

        {/* Observations */}
        <div className="rounded-2xl border border-cream-200 bg-white px-5 py-4 animate-quiet-in">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Observations</div>
          <ul className="space-y-1.5">
            {opinion.observations.map((obs, i) => (
              <li key={i} className="flex items-start gap-2 text-[0.825rem] text-forest-800">
                <span className="w-1 h-1 rounded-full bg-sand-400 mt-2 shrink-0" />
                {obs}
              </li>
            ))}
          </ul>
        </div>

        {/* Opinion */}
        <div className="rounded-2xl border border-forest-300 bg-forest-50/30 px-5 py-4 animate-quiet-in">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-forest-600" />
            <span className="text-[0.7rem] font-medium text-forest-700 uppercase tracking-wide">Expert opinion</span>
          </div>
          <p className="text-[0.875rem] text-forest-800 leading-relaxed">{opinion.opinion}</p>
        </div>

        {/* Limitations */}
        <div className="rounded-2xl border border-cream-200 bg-cream-50/50 px-5 py-4 animate-quiet-in">
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-2">Limitations</div>
          <ul className="space-y-1">
            {opinion.limitations.map((lim, i) => (
              <li key={i} className="flex items-start gap-2 text-[0.78rem] text-sand-600">
                <AlertCircle className="w-3.5 h-3.5 text-sand-400 mt-0.5 shrink-0" />
                {lim}
              </li>
            ))}
          </ul>
        </div>

        {/* Use this direction */}
        <button
          onClick={onUseDirection}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-forest-600 text-cream-50 text-[0.875rem] font-medium py-3 hover:bg-forest-700 transition-colors"
        >
          Use this direction
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-[0.68rem] text-sand-400 italic px-2">
          Master opinion ≠ Agreement change. Master opinion ≠ Money instruction. Using this direction creates a SourceReference — it does not silently alter the Agreement.
        </p>
      </div>
    </div>
  );
}
