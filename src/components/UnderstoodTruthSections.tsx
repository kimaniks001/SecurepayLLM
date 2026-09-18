import type { ReactNode } from 'react';

/**
 * Final Phase 4 Economy pass -- UNDERSTOOD's locked truth vocabulary. Something displayed here
 * does not become Agreement truth merely because it is shown:
 *
 * - CONFIRMED: canonical backend truth (Agreement/Home structured artifacts, real tool output).
 * - STILL TO DECIDE: unresolved/proposed/candidate information (Trade Context candidates, the
 *   non-authoritative Agreement preview).
 * - FOUND ON SECUREPAY: real Agent market-discovery results (provider/Store/price search) once the
 *   person has explicitly asked to look -- see Phase-4 spec sections 8/9/42. These are discovery
 *   results, never Agreement truth: opening/seeing one here never selects a counterparty, accepts
 *   an offer, or authorizes anything. Nothing is shown here from mere profiling -- only from a real
 *   tool the model invoked in response to an explicit question. `foundOnSecurePay` is optional;
 *   when there is nothing to show yet, the section renders its own reserved, empty state rather
 *   than disappearing, so the seam remains visible.
 */
export function UnderstoodTruthSections({ confirmed, stillToDecide, foundOnSecurePay }: { confirmed: ReactNode; stillToDecide: ReactNode; foundOnSecurePay?: ReactNode }) {
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
        {foundOnSecurePay ?? <p className="text-[0.75rem] text-sand-400">Nothing found yet. Ask SecurePay to look for something.</p>}
      </div>
    </div>
  );
}
