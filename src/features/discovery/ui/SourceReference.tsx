import type { ReactNode } from 'react';
import { formatMinor } from '../money';
import { originLabel } from '../origin';

/**
 * SourceReference: WHERE this trade started, shown as provenance -- restrained, never endorsement and never
 * authority. Selecting a source is not buying, joining, accepting or confirming. It renders only what the
 * backend captured (title, owner KS Number, captured price) and, once an Agreement handoff has been
 * reviewed, the backend's own CURRENT / CHANGED / UNAVAILABLE status -- the frontend never reconciles.
 */
export interface SourceView {
  /** Where it came from, from the backend's own sourceType (STORE_LISTING -> "SecurePay Store"). Community/Opportunity/etc. reuse this unchanged. */
  sourceType?: string;
  title: string;
  ownerKs: string | null;
  capturedPriceMinor: number | null;
  capturedCurrency: string | null;
  /** Only present after a handoff review; absent for a fresh selection. */
  status?: 'CURRENT' | 'CHANGED' | 'UNAVAILABLE';
  current?: { priceMinor: number | null; currency: string | null; availability: string | null } | null;
  capturedAvailability?: string | null;
}
export function SourceReference({ source, action }: { source: SourceView; action?: ReactNode }) {
  const captured = formatMinor(source.capturedPriceMinor, source.capturedCurrency ?? '');
  const changed = source.status === 'CHANGED' && source.current;
  const nowPrice = changed ? formatMinor(source.current!.priceMinor, source.current!.currency ?? '') : null;
  return <section aria-label="Where this started" className="rounded-2xl border border-cream-200 bg-cream-50/70 px-4 py-3">
    <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-sand-500">Started from</p>
    <p className="mt-0.5 text-[0.9rem] text-forest-800 break-words">{originLabel(source.sourceType)} · {source.title}{source.ownerKs ? <span className="text-sand-500"> · {source.ownerKs}</span> : null}</p>
    {!changed && captured && <p className="text-[0.8rem] text-sand-600">Listed at {captured} when chosen</p>}
    {source.status === 'UNAVAILABLE' && <p role="status" className="mt-1.5 text-[0.85rem] text-sand-700">This listing isn’t available any more. You can choose another, or carry on with this conversation directly.</p>}
    {changed && <div role="status" className="mt-1.5 space-y-1 text-[0.85rem] text-sand-700">
      <p>This listing has changed since you chose it.</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        <dt className="text-sand-500">Selected earlier</dt><dd>{captured ?? 'No price listed'}{source.capturedAvailability ? ` · ${source.capturedAvailability}` : ''}</dd>
        <dt className="text-sand-500">Current listing</dt><dd>{nowPrice ?? 'No price listed'}{source.current!.availability ? ` · ${source.current!.availability}` : ''}</dd>
      </dl>
    </div>}
    {action && <div className="mt-2">{action}</div>}
  </section>;
}

/** The calm, recoverable state when linking a chosen listing to the conversation did not work. */
export function SourceFailureNote({ busy, error, onRetry, onContinueWithout }: { busy: boolean; error: string; onRetry: () => void; onContinueWithout: () => void }) {
  return <div role="alert" className="rounded-2xl border border-ember-200 bg-ember-50 px-4 py-3 text-[0.88rem] text-sand-800">
    <p className="font-medium">We couldn’t link this listing to your conversation.</p>
    <p className="mt-0.5 text-sand-700">{error}</p>
    <p className="mt-1.5 text-[0.82rem] text-sand-600">You can try again. Or carry on without it — the conversation then won’t be attributed to this listing, though its price stays as a suggestion you can review.</p>
    <div className="mt-1 flex flex-wrap gap-x-4">
      <button type="button" disabled={busy} onClick={onRetry} className="min-h-11 text-forest-700 underline decoration-cream-400 underline-offset-4 disabled:opacity-40">Try again</button>
      <button type="button" disabled={busy} onClick={onContinueWithout} className="min-h-11 text-sand-600 underline decoration-cream-400 underline-offset-4 disabled:opacity-40">Continue without this listing</button>
    </div>
  </div>;
}
