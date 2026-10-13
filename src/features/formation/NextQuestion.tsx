import type { FormationQuestion } from './view';

/**
 * Phase 3 Human Experience — the server still owns the one material next question.
 * The UI does not add another workflow label around it; it simply asks the human.
 */
export function NextQuestion({ question, disabled, onAnswer, suggestedChoices = [] }: {
  question: FormationQuestion | null;
  disabled: boolean;
  onAnswer: (text: string) => void;
  /** Human-readable examples only; never verified payment/rail options. */
  suggestedChoices?: string[];
}) {
  if (!question) return null;
  // Only offer bounded values already present in the question, never imagined amounts.
  const explicitMoneyValues = [...question.text.matchAll(/(?:KES|KSh|USD|EUR)\\s*[\\d,]+(?:\\.\\d{1,2})?/gi)].map(match => match[0].replace(/\\s+/g, ' ').trim());
  const uniqueMoneyValues = [...new Set(explicitMoneyValues)];
  const conflictPills = question.choices.length === 0 && suggestedChoices.length === 0
    && /which (?:one|amount|total)|which is (?:right|correct)|payments.*add up|different (?:total|amount)/i.test(question.text)
    && uniqueMoneyValues.length === 2 ? [...uniqueMoneyValues, 'Neither — I’ll explain'] : [];
  const choices = question.choices.length > 0 ? question.choices : suggestedChoices.length > 0 ? suggestedChoices : conflictPills;
  const chip = 'inline-flex min-h-11 items-center rounded-full border px-4 text-[0.85rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 disabled:opacity-50';
  return <div aria-labelledby="next-question-label">
    <p id="next-question-label" aria-live="polite" className="text-[1.12rem] font-semibold leading-7 text-forest-900">{question.text}</p>
    {choices.length > 0 && <div role="group" aria-label="Quick answers" className="mt-3 flex flex-wrap gap-2">
      {choices.map(choice => <button key={choice} type="button" disabled={disabled} onClick={() => onAnswer(choice === "Neither — I’ll explain" ? "Neither amount is correct; let me explain." : choice)}
        className={`${chip} border-forest-300 bg-white text-forest-800`}>{choice}</button>)}
      <button type="button" disabled={disabled} onClick={() => onAnswer("I don't know yet")} className={`${chip} border-cream-300 bg-transparent text-sand-700`}>I don’t know yet</button>
      <button type="button" disabled={disabled} onClick={() => onAnswer('Let’s decide that later')} className={`${chip} border-cream-300 bg-transparent text-sand-700`}>Decide later</button>
    </div>}
  </div>;
}
