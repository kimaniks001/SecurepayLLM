import { Check, X } from 'lucide-react';
import type { DisputeMatch } from '../types';

interface DisputeMatchingViewProps {
  match?: DisputeMatch;
}

export function DisputeMatchingView({ match }: DisputeMatchingViewProps) {
  if (!match) return null;

  return (
    <div className="space-y-3 animate-quiet-in">
      {/* Where you match */}
      <div className="rounded-2xl border border-forest-200 bg-forest-50/50 px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Check className="w-4 h-4 text-forest-600" />
          <span className="text-[0.7rem] font-medium text-forest-700 uppercase tracking-wide">Where you match</span>
        </div>
        {match.agreedPoints.length > 0 ? (
          <ul className="space-y-1.5">
            {match.agreedPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-[0.825rem] text-forest-800">
                <Check className="w-3.5 h-3.5 text-forest-500 mt-0.5 shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[0.825rem] text-sand-500">No matching points yet.</p>
        )}
      </div>

      {/* Where you do not yet match */}
      <div className="rounded-2xl border border-ember-200 bg-ember-50/50 px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <X className="w-4 h-4 text-ember-600" />
          <span className="text-[0.7rem] font-medium text-ember-700 uppercase tracking-wide">Where you do not yet match</span>
        </div>
        {match.disagreedPoints.length > 0 ? (
          <div className="space-y-2.5">
            {match.disagreedPoints.map((pt, i) => (
              <div key={i} className="rounded-xl bg-white border border-ember-100 px-3 py-2.5">
                <div className="text-[0.78rem] font-medium text-sand-600 mb-1">{pt.label}</div>
                <div className="flex items-center gap-3 text-[0.825rem]">
                  <div className="flex-1">
                    <span className="text-sand-500 text-[0.72rem]">James</span>
                    <p className="text-forest-800">{pt.james}</p>
                  </div>
                  <div className="w-px h-8 bg-cream-200" />
                  <div className="flex-1">
                    <span className="text-sand-500 text-[0.72rem]">Peter</span>
                    <p className="text-forest-800">{pt.peter}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[0.825rem] text-sand-500">No disagreements remain.</p>
        )}
      </div>

      <p className="text-[0.72rem] text-sand-400 px-1">
        SecurePay shows where your positions match and differ. It does not editorialize or decide who is right.
      </p>
    </div>
  );
}
