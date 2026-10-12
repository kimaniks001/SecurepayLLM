import { SourceReference } from '../discovery/ui/SourceReference';
import type { HandoffView } from './controller';
import { formatHandoffMoney, sourceReferenceView } from './view';

/**
 * Phase 3 — keep the same Agreement visible across the identity boundary.
 * This is still a read-only handoff candidate, not canonical Agreement authority, but it is presented
 * as the person's Agreement rather than as SecurePay's internal "understanding".
 */
export function ReviewPreview({ handoff }: { handoff: HandoffView }) {
  const { candidate, reviewedSource, mustResolve, stillToDecide } = handoff;
  const rows: { label: string; values: string[] }[] = [
    { label: 'People', values: candidate.who },
    { label: 'Work', values: candidate.what },
    { label: 'When', values: candidate.when },
    { label: 'Price', values: candidate.amountMinor != null ? [formatHandoffMoney(candidate.currency, candidate.amountMinor)] : [] },
  ].filter(row => row.values.length > 0);

  return <article aria-label="Agreement preview" className="sp-agreement-paper space-y-4 px-5 py-5 md:px-6">
    <header className="border-b border-cream-200 pb-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-forest-700">Your Agreement</p>
      <h3 className="mt-2 break-words font-display text-[1.35rem] leading-snug text-forest-900">{candidate.title ?? 'Agreement'}</h3>
      <p className="mt-1 text-[0.8rem] text-sand-700">You already reviewed this. Sign-in, when needed, only establishes who you are and returns you here.</p>
    </header>

    {rows.length > 0
      ? <dl className="divide-y divide-cream-100">{rows.map(row => <div key={row.label} className="grid gap-1 py-3 sm:grid-cols-[6rem_1fr] sm:gap-x-4">
          <dt className="text-[0.7rem] font-semibold uppercase tracking-wide text-sand-600">{row.label}</dt>
          <dd className="min-w-0 break-words text-[0.92rem] leading-6 text-forest-900">{row.values.join(', ')}</dd>
        </div>)}</dl>
      : <p className="text-[0.88rem] text-sand-700">This Agreement still needs more from the conversation before it can be kept.</p>}

    {mustResolve.length > 0 && <div className="rounded-xl border border-ember-200 bg-ember-50/60 px-4 py-3">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-ember-800">Needs your decision</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-[0.85rem] text-sand-800">{mustResolve.map((matter, i) => <li key={i}>{matter}</li>)}</ul>
    </div>}
    {stillToDecide.length > 0 && <details className="text-[0.8rem] text-sand-700">
      <summary className="cursor-pointer select-none underline underline-offset-2">Still to decide</summary>
      <ul className="mt-1 list-disc space-y-1 pl-5">{stillToDecide.map((matter, i) => <li key={i}>{matter}</li>)}</ul>
    </details>}
    {reviewedSource && <details className="text-[0.8rem] text-sand-700">
      <summary className="cursor-pointer select-none underline underline-offset-2">Source details</summary>
      <div className="mt-2"><SourceReference source={sourceReferenceView(reviewedSource)} /></div>
    </details>}
  </article>;
}
