import type { AgreementFormation, FormationOpenPoint } from './view';
import { NextQuestion } from './NextQuestion';
import { nextStep } from './nextStep';

/**
 * Entry Perfection Phase 6 -- once SecurePay understands a coherent arrangement, the agreement takes visual priority over the
 * chat: a calm card at the top of the conversation with the one-line summary, the key terms and REVIEW THIS. Nothing here is
 * agreed; the card says so. It never appears for an exploration or a vague intention (nothing reviewable yet).
 */
export function AgreementShaping({ formation, onReview, onAnswer, answering = false, onResolvePoint }: {
  formation: AgreementFormation | null; onReview: () => void; onAnswer?: (text: string) => void; answering?: boolean;
  /** User-Ready Beta Gate 1 (EP-CERT-007) -- one open point opens a micro-review of just that decision. */
  onResolvePoint?: (point: FormationOpenPoint) => void;
}) {
  if (!formation || !formation.reviewable) return null;
  const step = nextStep(formation);
  const go = () => { if (step.kind === 'point' && onResolvePoint) onResolvePoint(step.point); else onReview(); };
  // The planner's one question, when it is about a disagreement SecurePay can settle directly: answered with "Use this", never
  // with a quick-answer sentence the model would have to interpret (User-Ready Beta Gate 1, "direct conflict resolution").
  const settleable = formation.question && onResolvePoint
    ? formation.openPoints.find(p => formation.question!.openPointIds.includes(p.id) && p.sides.some(s => s.choosable)) ?? null
    : null;
  const total = formation.money.find(t => t.label === 'Total price' && !t.needsChecking);
  const finish = formation.when.find(t => t.label === 'Finish by' && !t.needsChecking);
  const keyTerms = [formation.what[0] && { label: formation.what[0].label, value: formation.what[0].value }, total && { label: 'Total', value: total.value },
    finish && { label: 'Finish by', value: finish.value }].filter(Boolean) as { label: string; value: string }[];
  const open = formation.openPoints.filter(p => p.blocksConfirmation || !p.checked).length;
  return <section aria-labelledby="agreement-shaping-title" className="surface-info border-forest-200 px-4 py-3.5">
    <h2 id="agreement-shaping-title" className="font-display text-[0.95rem] text-forest-800">Your agreement is taking shape</h2>
    {formation.summary && <p className="mt-1 text-[0.85rem] leading-snug text-sand-700">{formation.summary}</p>}
    {formation.readingSources.length > 0 && <p className="mt-1 text-[0.78rem] text-sand-600">Still reading {formation.readingSources.join(', ')}…</p>}
    {keyTerms.length > 0 && <dl className="mt-2 grid gap-x-4 gap-y-1 text-[0.82rem] sm:grid-cols-3">
      {keyTerms.map(t => <div key={t.label} className="min-w-0"><dt className="text-[0.7rem] uppercase tracking-wide text-sand-500">{t.label}</dt><dd className="break-words text-forest-800">{t.value}</dd></div>)}
    </dl>}
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <button type="button" onClick={go} data-next-step={step.kind} className="inline-flex min-h-11 items-center rounded-full bg-forest-700 px-5 text-[0.9rem] font-medium text-white hover:bg-forest-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">
        {step.kind === 'none' ? 'Review agreement' : step.label}
      </button>
      {step.kind !== 'review' && step.kind !== 'none' && <button type="button" onClick={onReview} className="min-h-11 text-[0.82rem] text-forest-700 underline">Whole agreement</button>}
      <span className="text-[0.78rem] text-sand-600">{open === 0 ? 'Nothing is agreed until you set it up.' : `${open} ${open === 1 ? 'point' : 'points'} to check · nothing is agreed yet`}</span>
    </div>
    {/* Entry Perfection Phase 7 -- the agreement is primary; the one question it still needs sits under it, never over it. */}
    {settleable && onResolvePoint
      ? <div className="mt-3 rounded-xl border border-cream-200 bg-cream-50/80 px-3.5 py-3">
          <p className="text-[0.9rem] leading-snug text-forest-900">{formation.question!.text}</p>
          <button type="button" onClick={() => onResolvePoint(settleable)} disabled={answering}
            className="mt-2 inline-flex min-h-11 items-center rounded-full border border-forest-300 bg-white px-4 text-[0.85rem] font-medium text-forest-800 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300">Choose</button>
        </div>
      : onAnswer && <NextQuestion question={formation.question} disabled={answering} onAnswer={onAnswer} />}
  </section>;
}
