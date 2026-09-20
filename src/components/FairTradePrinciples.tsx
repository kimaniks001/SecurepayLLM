import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { FAIR_TRADE_PRINCIPLES } from '../fairTradePrinciplesData';

/**
 * The quiet line beneath the conversation input. Deliberately not a badge/chip/certification
 * mark, a score, or a rating -- principles guide, they do not grade a person (task doctrine: never
 * "10/12 fair trade" or "fair trader score").
 */
export function FairTradeAffordance({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="text-[0.78rem] text-sand-500 hover:text-forest-600 transition-colors underline decoration-sand-300 underline-offset-2"
    >
      Guided by the 12 principles of fair trade ›
    </button>
  );
}

/**
 * A single overlay component that renders as a centered, dismissible panel on desktop and a
 * bottom sheet on mobile via responsive classes alone -- it never navigates away from Home, so
 * whatever the person had typed in the conversation input (an uncontrolled, locally-stateful
 * component) and whatever conversation state exists underneath is untouched while this is open.
 */
export function FairTradePrinciplesPanel({ onClose }: { onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-forest-900/30 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fair-trade-principles-title"
        className="relative w-full md:max-w-lg max-h-[85vh] md:max-h-[80vh] overflow-y-auto rounded-t-3xl md:rounded-2xl bg-cream-50 border border-cream-200 shadow-lifted animate-fade-in-up"
      >
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-cream-200/70 bg-cream-50/95 backdrop-blur-sm">
          <h2 id="fair-trade-principles-title" className="font-display text-lg text-forest-800">The 12 Principles of Fair Trade</h2>
          <button ref={closeButtonRef} onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-sand-500 hover:text-forest-700 hover:bg-cream-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="px-5 pt-4 text-[0.82rem] text-sand-600 leading-relaxed">
          These guide how SecurePay expects trade to happen here. They describe what fair looks like
          for everyone involved — they are not a score, a rating, or a certification.
        </p>
        <ol className="px-5 py-4 space-y-4">
          {FAIR_TRADE_PRINCIPLES.map(principle => (
            <li key={principle.number} className="flex gap-3">
              <span className="font-display text-sand-400 text-sm shrink-0 w-5 text-right">{principle.number}</span>
              <div>
                <div className="text-[0.88rem] text-forest-800 font-medium">{principle.title}</div>
                <div className="text-[0.8rem] text-sand-600 mt-0.5 leading-relaxed">{principle.text}</div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
