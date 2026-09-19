import type { ReactNode } from 'react';

/**
 * Final Phase 3 completion pass -- UNDERSTOOD's locked truth vocabulary. Something displayed here
 * does not become Agreement truth merely because it is shown:
 *
 * - CONFIRMED: canonical backend truth (Agreement/Home structured artifacts, real tool output).
 * - STILL TO DECIDE: unresolved/proposed/candidate information (Trade Context candidates, the
 *   non-authoritative Agreement preview).
 * - FOUND ON SECUREPAY: reserved for Phase 4 (Store/Community/opportunity discovery). This
 *   section exists as a presentation seam now -- Phase 3 renders it with no discovery content.
 */
export function UnderstoodTruthSections({ confirmed, stillToDecide }: { confirmed: ReactNode; stillToDecide: ReactNode }) {
  return (
    <div className="space-y-4">
      {confirmed && (
        <div className="space-y-2">
          <div className="text-[0.68rem] font-semibold text-forest-600 uppercase tracking-wide">Confirmed</div>
          {confirmed}
        </div>
      )}
      {stillToDecide && (
        <div className="space-y-2">
          <div className="text-[0.68rem] font-semibold text-ember-600 uppercase tracking-wide">Still to decide</div>
          {stillToDecide}
        </div>
      )}
      <div className="space-y-2">
        <div className="text-[0.68rem] font-semibold text-sand-400 uppercase tracking-wide">Found on SecurePay</div>
        <p className="text-[0.75rem] text-sand-400">Reserved for later SecurePay-wide discovery.</p>
      </div>
    </div>
  );
}
