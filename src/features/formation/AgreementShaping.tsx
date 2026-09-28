import type { AgreementFormation } from './view';
import { NextQuestion } from './NextQuestion';

/**
 * Entry Perfection Phase 6 -- once SecurePay understands a coherent arrangement, the agreement takes visual priority over the
 * chat: a calm card at the top of the conversation with the one-line summary, the key terms and REVIEW THIS. Nothing here is
 * agreed; the card says so. It never appears for an exploration or a vague intention (nothing reviewable yet).
 */
export function AgreementShaping({ formation, onReview, onAnswer, answering = false }: {
  formation: AgreementFormation | null; onReview: () => void; onAnswer?: (text: string) => void; answering?: boolean;
}) {
  if (!formation || !formation.reviewable) return null;
  const total = formation.money.find(t => t.label === 'Total price' && !t.needsChecking);
  const finish = formation.when.find(t => t.label === 'Finish by' && !t.needsChecking);
  const keyTerms = [formation.what[0] && { label: formation.what[0].label, value: formation.what[0].value }, total && { label: 'Total', value: total.value },
    finish && { label: 'Finish by', value: finish.value }].filter(Boolean) as { label: string; value: string }[];
  const open = formation.openPoints.filter(p => p.blocksConfirmation || !p.checked).length;
  return <section aria-labelledby="agreement-shaping-title" className="rounded-2xl border border-forest-200 bg-white/90 px-4 py-3.5 shadow-soft">
    <h2 id="agreement-shaping-title" className="font-display text-[0.95rem] text-forest-800">Your agreement is taking shape</h2>
    {formation.summary && <p className="mt-1 text-[0.85rem] leading-snug text-sand-700">{formation.summary}</p>}
    {formation.readingSources.length > 0 && <p className="mt-1 text-[0.78rem] text-sand-600">Still reading {formation.readingSources.join(', ')}…</p>}
    {keyTerms.length > 0 && <dl className="mt-2 grid gap-x-4 gap-y-1 text-[0.82rem] sm:grid-cols-3">
      {keyTerms.map(t => <div key={t.label} className="min-w-0"><dt className="text-[0.7rem] uppercase tracking-wide text-sand-500">{t.label}</dt><dd className="break-words text-forest-800">{t.value}</dd></div>)}
    </dl>}
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <button type="button" onClick={onReview} className="inline-flex min-h-11 items-center rounded-full bg-forest-700 px-5 text-[0.9rem] font-medium text-white hover:bg-forest-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
        Review this
      </button>
      <span className="text-[0.78rem] text-sand-600">{open === 0 ? 'Nothing is agreed until you set it up.' : `${open} ${open === 1 ? 'point' : 'points'} to check · nothing is agreed yet`}</span>
    </div>
    {/* Entry Perfection Phase 7 -- the agreement is primary; the one question it still needs sits under it, never over it. */}
    {onAnswer && <NextQuestion question={formation.question} disabled={answering} onAnswer={onAnswer} />}
  </section>;
}
