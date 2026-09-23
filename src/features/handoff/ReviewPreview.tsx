import { SourceReference } from '../discovery/ui/SourceReference';
import type { HandoffView } from './controller';
import { formatHandoffMoney, sourceReferenceView } from './view';

/**
 * What SecurePay understands so far, read-only, shown BEFORE anyone signs in. It is the unauthenticated
 * handoff's own candidate summary (the same facts the canonical review will be built from) -- not the
 * canonical review itself, which SecurePay only serves to a signed-in participant. Nothing here is
 * editable; changing anything means going back to the conversation.
 */
export function ReviewPreview({ handoff }: { handoff: HandoffView }) {
  const { candidate, reviewedSource, mustResolve, stillToDecide } = handoff;
  const rows: { label: string; values: string[] }[] = [
    { label: 'What', values: candidate.what }, { label: 'Who', values: candidate.who },
    { label: 'When', values: candidate.when },
    { label: 'Money', values: candidate.amountMinor != null ? [formatHandoffMoney(candidate.currency, candidate.amountMinor)] : [] },
  ].filter(row => row.values.length > 0);
  return <section aria-label="What you would be reviewing" className="space-y-3 rounded-2xl border border-cream-200 bg-white/80 px-4 py-3 shadow-soft">
    <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-sand-500">What SecurePay understands so far</p>
    {candidate.title && <h3 className="break-words font-display text-[1.05rem] leading-snug text-forest-800">{candidate.title}</h3>}
    {rows.length > 0
      ? <dl className="space-y-1.5">{rows.map(row => <div key={row.label} className="grid grid-cols-[4rem_1fr] gap-x-3 text-[0.9rem]">
          <dt className="text-sand-500">{row.label}</dt><dd className="min-w-0 break-words text-forest-800">{row.values.join(', ')}</dd>
        </div>)}</dl>
      : <p className="text-[0.88rem] text-sand-600">Not much has been settled yet.</p>}
    {/* KS001 Upgrade Phase 2 final convergence correction (item 2) -- mustResolve and stillToDecide are
        shown separately, never merged back into one flat "unresolved" list. */}
    {mustResolve.length > 0 && <div>
      <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-ember-700">Needs your decision before this can be set up</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[0.85rem] text-sand-700">{mustResolve.map((matter, i) => <li key={i}>{matter}</li>)}</ul>
    </div>}
    {stillToDecide.length > 0 && <div>
      <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-sand-500">Still to decide</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[0.85rem] text-sand-700">{stillToDecide.map((matter, i) => <li key={i}>{matter}</li>)}</ul>
    </div>}
    {reviewedSource && <SourceReference source={sourceReferenceView(reviewedSource)} />}
  </section>;
}
