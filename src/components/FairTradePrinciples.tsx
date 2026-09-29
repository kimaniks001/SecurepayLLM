import { MomentSheet } from './dna/MomentSheet';
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
      className="inline-flex min-h-11 items-center text-[0.8rem] text-sand-700 hover:text-forest-700 transition-colors underline decoration-sand-300 underline-offset-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300"
    >
      Guided by the 12 Principles of Fair Trade ›
    </button>
  );
}

/**
 * The 12 Principles, as a LEVEL 4 moment (User-Ready Beta Gate 1): a centred dialog on desktop and a bottom sheet on phones,
 * with a real focus trap and focus return (see MomentSheet). It never navigates away, so whatever the person had typed and
 * whatever conversation state exists underneath is untouched while it is open.
 *
 * `withKs001` (EP-CERT-010) -- opened from KS001 itself: first says who KS001 is (a beta observer read "KS001" as an internal
 * code), then shows the compass it follows. KS001 = the voice; the 12 Principles = the compass; the agreement = the output.
 */
export function FairTradePrinciplesPanel({ onClose, withKs001 = false }: { onClose: () => void; withKs001?: boolean }) {
  return (
    <MomentSheet title={withKs001 ? 'KS001 and the 12 Principles' : 'The 12 Principles of Fair Trade'} onClose={onClose}>
      {withKs001 && (
        <div className="mb-4 space-y-2 border-b rule-quiet pb-4">
          <p className="text-[0.9rem] leading-relaxed text-forest-800">
            <span className="font-display">KS001</span> is SecurePay’s guide — the first KS Number. It reads what you bring, does the
            structural work, and asks only what really needs your decision.
          </p>
          <p className="text-wisdom text-lg">It is guided by the 12 Principles of Fair Trade.</p>
        </div>
      )}
      <p className="text-[0.82rem] text-sand-700 leading-relaxed">
        These guide how SecurePay expects trade to happen here. They describe what fair looks like
        for everyone involved — they are not a score, a rating, or a certification.
      </p>
      <ol className="mt-4 space-y-4">
        {FAIR_TRADE_PRINCIPLES.map(principle => (
          <li key={principle.number} className="flex gap-3">
            <span className="font-display text-sand-600 text-sm shrink-0 w-5 text-right">{principle.number}</span>
            <div>
              <div className="text-[0.88rem] text-forest-800 font-medium">{principle.title}</div>
              <div className="text-[0.8rem] text-sand-700 mt-0.5 leading-relaxed">{principle.text}</div>
            </div>
          </li>
        ))}
      </ol>
    </MomentSheet>
  );
}
