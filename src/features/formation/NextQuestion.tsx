import type { FormationQuestion } from './view';

/**
 * Entry Perfection Phase 7 -- the one small thing SecurePay needs next, under the agreement it already built (never instead of
 * it). Quick answers are offered only when the evidence itself bounds the answer (the two figures, the two dates); "I don't know"
 * and "Decide later" are always valid and leave the point open for Review. Every quick answer is just a message in the person's
 * own words -- free text in the composer always works too.
 */
export function NextQuestion({ question, disabled, onAnswer }: { question: FormationQuestion | null; disabled: boolean; onAnswer: (text: string) => void }) {
  if (!question) return null;
  const chip = 'inline-flex min-h-11 items-center rounded-full border px-4 text-[0.85rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 disabled:opacity-50';
  return <div className="mt-3 rounded-xl border border-cream-200 bg-cream-50/80 px-3.5 py-3" aria-labelledby="next-question-label">
    <p id="next-question-label" className="text-[0.72rem] font-semibold uppercase tracking-wide text-sand-600">
      {question.blocksSetUp ? 'One thing to settle before it can be set up' : 'One point is still unclear'}
    </p>
    <p aria-live="polite" className="mt-1 text-[0.9rem] leading-snug text-forest-900">{question.text}</p>
    <div role="group" aria-label="Quick answers" className="mt-2 flex flex-wrap gap-2">
      {question.choices.map(choice => <button key={choice} type="button" disabled={disabled} onClick={() => onAnswer(choice)}
        className={`${chip} border-forest-300 bg-white text-forest-800`}>{choice}</button>)}
      <button type="button" disabled={disabled} onClick={() => onAnswer("I don't know yet")} className={`${chip} border-cream-300 bg-transparent text-sand-700`}>I don’t know yet</button>
      <button type="button" disabled={disabled} onClick={() => onAnswer('Let’s decide that later')} className={`${chip} border-cream-300 bg-transparent text-sand-700`}>Decide later</button>
    </div>
  </div>;
}
