import { useState } from 'react';
import type { FormationQuestion } from './view';

/**
 * Phase 3 Human Experience — the server still owns the one material next question.
 * The UI does not add another workflow label around it; it simply asks the human.
 */
export function NextQuestion({ question, disabled, onAnswer, suggestedChoices = [], onAddPlace, onUploadPhoto, onUploadDocument }: {
  question: FormationQuestion | null;
  disabled: boolean;
  onAnswer: (text: string) => void;
  /** Human-readable examples only; never verified payment/rail options. */
  suggestedChoices?: string[];
  onAddPlace?: () => void;
  onUploadPhoto?: (file: File) => void;
  onUploadDocument?: (file: File) => void;
}) {
  const [dateAnswer, setDateAnswer] = useState('');
  const [timeAnswer, setTimeAnswer] = useState('');
  if (!question) return null;
  // Only offer bounded values already present in the question, never imagined amounts.
  const explicitMoneyValues = [...question.text.matchAll(/(?:KES|KSh|USD|EUR)\s*[\d,]+(?:\.\d{1,2})?/gi)].map(match => match[0].replace(/\s+/g, ' ').trim());
  const uniqueMoneyValues = [...new Set(explicitMoneyValues)];
  const conflictPills = question.choices.length === 0 && suggestedChoices.length === 0
    && /which (?:one|amount|total)|which is (?:right|correct)|payments.*add up|different (?:total|amount)/i.test(question.text)
    && uniqueMoneyValues.length === 2 ? [...uniqueMoneyValues, 'Neither — I’ll explain'] : [];
  const choices = question.choices.length > 0 ? question.choices : suggestedChoices.length > 0 ? suggestedChoices : conflictPills;
  const chip = 'inline-flex min-h-11 items-center rounded-full border px-4 text-[0.85rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-300 disabled:opacity-50';
  const asksForDate = /(?:what|which|choose|confirm|set).*\bdate\b|\bwhen\s+(?:should|will|is)\b/i.test(question.text) && !/\b(?:deadline passed|date of birth)\b/i.test(question.text);
  const asksForTime = /\b(?:time|what hour|at what time|what time|when exactly)\b/i.test(question.text);
  const asksForPlace = /\b(?:where|location|place|venue|address|site)\b/i.test(question.text);
  const asksForMedia = /\b(?:photo|photograph|picture|image|receipt|evidence)\b/i.test(question.text);
  const asksForDocument = /\b(?:file|document|minutes|contract|programme|attachment|upload)\b/i.test(question.text);
  const wantsDate = asksForDate || (/\b(?:date|day)\b/i.test(question.text) && asksForTime);
  return <div aria-labelledby="next-question-label">
    <p id="next-question-label" aria-live="polite" className="text-[1.12rem] font-semibold leading-7 text-forest-900">{question.text}</p>
    {wantsDate && choices.length === 0 && <div className="mt-3 flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="ks001-date-answer">Choose a date</label>
      <input id="ks001-date-answer" type="date" value={dateAnswer} onChange={event => setDateAnswer(event.target.value)} disabled={disabled} className="min-h-11 rounded-xl border border-forest-300 bg-white px-3 text-sm text-forest-900" />
      {asksForTime && <><label className="sr-only" htmlFor="ks001-time-answer">Choose a time</label><input id="ks001-time-answer" type="time" value={timeAnswer} onChange={event => setTimeAnswer(event.target.value)} disabled={disabled} className="min-h-11 rounded-xl border border-forest-300 bg-white px-3 text-sm text-forest-900" /></>}
      <button type="button" disabled={disabled || !dateAnswer || (asksForTime && !timeAnswer)} onClick={() => onAnswer(asksForTime ? `${dateAnswer} at ${timeAnswer} (local time)` : dateAnswer)} className={`${chip} border-forest-300 bg-forest-700 text-white`}>{asksForTime ? 'Use date and time' : 'Use this date'}</button>
    </div>}
    {asksForTime && !wantsDate && choices.length === 0 && <div className="mt-3 flex flex-wrap gap-2">
      <label className="sr-only" htmlFor="ks001-time-only">Choose a time</label>
      <input id="ks001-time-only" type="time" value={timeAnswer} onChange={event => setTimeAnswer(event.target.value)} disabled={disabled} className="min-h-11 rounded-xl border border-forest-300 bg-white px-3 text-sm" />
      <button type="button" className={`${chip} border-forest-300 bg-forest-700 text-white`} disabled={disabled || !timeAnswer} onClick={() => onAnswer(`${timeAnswer} local time`)}>Use this time</button>
    </div>}
    {asksForPlace && onAddPlace && <button type="button" disabled={disabled} onClick={onAddPlace} className={`mt-3 ${chip} border-forest-300 bg-white text-forest-800`}>Choose a place</button>}
    {(asksForMedia || asksForDocument) && <div className="mt-3 flex flex-wrap gap-3">
      {asksForMedia && onUploadPhoto && <label className={`${chip} cursor-pointer border-forest-300 bg-white text-forest-800`}>Add photo<input aria-label="Attach a photo for KS001" type="file" accept="image/*" className="sr-only" disabled={disabled} onChange={event => {const file=event.target.files?.[0];if(file)onUploadPhoto(file);event.target.value='';}} /></label>}
      {onUploadDocument && <label className={`${chip} cursor-pointer border-forest-300 bg-white text-forest-800`}>Add document<input aria-label="Attach a document for KS001" type="file" accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx" className="sr-only" disabled={disabled} onChange={event => {const file=event.target.files?.[0];if(file)onUploadDocument(file);event.target.value='';}} /></label>}
    </div>}
    {choices.length > 0 && <div role="group" aria-label="Quick answers" className="mt-3 flex flex-wrap gap-2">
      {choices.map(choice => <button key={choice} type="button" disabled={disabled} onClick={() => onAnswer(choice === "Neither — I’ll explain" ? "Neither amount is correct; let me explain." : choice)}
        className={`${chip} border-forest-300 bg-white text-forest-800`}>{choice}</button>)}
      <button type="button" disabled={disabled} onClick={() => onAnswer("I don't know yet")} className={`${chip} border-cream-300 bg-transparent text-sand-700`}>I don’t know yet</button>
      <button type="button" disabled={disabled} onClick={() => onAnswer('Let’s decide that later')} className={`${chip} border-cream-300 bg-transparent text-sand-700`}>Decide later</button>
    </div>}
  </div>;
}
