import { FileText, ArrowRight, Eye } from 'lucide-react';
import type { PreviewView } from '../api/securepay/agent/adapters';
import type { AgreementPreviewResponse } from '../types';

interface AgreementPreviewCardProps {
  data: AgreementPreviewResponse | PreviewView;
  onChoice?: (value: string) => void;
}

export function AgreementPreviewCard({ data, onChoice }: AgreementPreviewCardProps) {
  return (
    <div className="rounded-2xl border border-forest-200 bg-white shadow-lifted overflow-hidden">
      <div className="px-4 py-3 bg-forest-50 border-b border-forest-100 flex items-center gap-2 animate-reveal-stagger" style={{ animationDelay: '0.1s' }}>
        <FileText className="w-4 h-4 text-forest-600" />
        <span className="text-[0.75rem] font-medium text-forest-700 uppercase tracking-wide">Agreement taking shape</span>
      </div>

      <div className="p-4">
        <h3 className="font-display text-xl text-forest-800 mb-4 leading-tight animate-reveal-stagger" style={{ animationDelay: '0.15s' }}>
          {'title' in data ? data.title : 'Trade taking shape'}
        </h3>

        {/* WHAT */}
        <div className="mb-4 animate-reveal-stagger" style={{ animationDelay: '0.25s' }}>
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1.5">What</div>
          <ul className="space-y-1">
            {data.what.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-[0.875rem] text-forest-800">
                <span className="w-1 h-1 rounded-full bg-forest-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* WHO */}
        <div className="mb-4 animate-reveal-stagger" style={{ animationDelay: '0.35s' }}>
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1.5">Who</div>
          <div className="space-y-1">
            {data.who.map((person, i) => (
              <div key={i} className="flex items-baseline gap-2 text-[0.875rem]">
                <span className="font-medium text-forest-800">{typeof person === 'string' ? person : person.name}</span>
                {typeof person !== 'string' && <span className="text-sand-500">— {person.role}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* MONEY */}
        <div className="mb-4 animate-reveal-stagger" style={{ animationDelay: '0.45s' }}>
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1.5">Money</div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg text-forest-800 font-medium">{Array.isArray(data.money) ? data.money.join(' · ') : data.money.amount}</span>
            <span className="text-[0.78rem] text-sand-500">{Array.isArray(data.money) ? '' : data.money.note}</span>
          </div>
        </div>

        {/* MATERIALS */}
        {'materials' in data && data.materials && (
          <div className="mb-4 animate-reveal-stagger" style={{ animationDelay: '0.55s' }}>
            <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1.5">Materials</div>
            <p className="text-[0.875rem] text-forest-800">{data.materials}</p>
          </div>
        )}

        {/* WHEN */}
        <div className="mb-4 animate-reveal-stagger" style={{ animationDelay: '0.65s' }}>
          <div className="text-[0.7rem] font-medium text-sand-500 uppercase tracking-wide mb-1.5">When</div>
          <p className="text-[0.875rem] text-forest-800">{Array.isArray(data.when) ? data.when.join(' · ') : data.when}</p>
        </div>

        {/* STILL WORTH SETTLING — calm, deliberate */}
        <div className="rounded-xl bg-cream-50 border border-cream-200 p-3 mb-4 animate-reveal-stagger" style={{ animationDelay: '0.75s' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <Eye className="w-3.5 h-3.5 text-ember-500" />
            <span className="text-[0.7rem] font-medium text-sand-600 uppercase tracking-wide">Still worth settling</span>
          </div>
          <ul className="space-y-1.5">
            {data.stillToSettle.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-[0.825rem] text-sand-700">
                <span className="w-1 h-1 rounded-full bg-ember-400 mt-2 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {'disclaimer' in data && <p className="text-[0.78rem] text-sand-600 mb-4">{data.disclaimer}</p>}
        {/* Actions */}
        <div className="flex gap-2 animate-reveal-stagger" style={{ animationDelay: '0.85s' }}>
          <button
            onClick={() => onChoice?.('keep_talking')}
            className="flex-1 text-[0.825rem] font-medium text-forest-700 bg-cream-100 hover:bg-cream-200 rounded-lg px-4 py-2.5 transition-colors active:scale-[0.98]"
          >
            Keep talking
          </button>
          <button
            onClick={() => onChoice?.('review_agreement')}
            className="flex-1 flex items-center justify-center gap-1.5 text-[0.825rem] font-medium text-forest-700 bg-forest-50 hover:bg-forest-100 border border-forest-200 rounded-lg px-4 py-2.5 transition-colors active:scale-[0.98]"
          >
            Review what we have
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
