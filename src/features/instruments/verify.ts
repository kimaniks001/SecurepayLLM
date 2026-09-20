import type { ContextView } from '../agent/controller';
import { fromIso, MONTHS, readDateText, sameAmount, type InstrumentDraft, type InstrumentSpec } from './model';

/**
 * "Did the backend actually record what the person just said?" -- read back from Trade Context,
 * never assumed from an HTTP 200. A statement can be perfectly delivered and still not change
 * SecurePay's understanding (the Agent may ask a question instead), and an instrument must not
 * close as if it had succeeded when that happened.
 */
const dateTexts = (context: ContextView): string[] => [
  ...context.relationships.filter(r => r.kind === 'CONDITION').flatMap(r => [r.qualifiers.date, r.qualifiers.startDate]).filter((v): v is string => typeof v === 'string'),
  ...context.entities.filter(e => e.type === 'DATE' || e.type === 'DATE_RANGE').map(e => e.name),
];
const mentionsDate = (texts: string[], iso: string): boolean => {
  const p = fromIso(iso);
  if (!p) return false;
  const today = `${p.year}-01-01`;
  return texts.some(text => readDateText(text, today) === iso
    || (new RegExp(`\\b${p.day}(?:st|nd|rd|th)?\\b`).test(text) && text.toLowerCase().includes(MONTHS[p.month0].toLowerCase().slice(0, 3))));
};

export function isRecorded(spec: InstrumentSpec, draft: InstrumentDraft, context: ContextView): boolean {
  if (spec.kind === 'money' && draft.kind === 'money') {
    return context.relationships.some(r => r.kind === 'PAYMENT_CONDITION' && typeof r.qualifiers.amount === 'string' && sameAmount(r.qualifiers.amount, draft.amount));
  }
  if (spec.kind === 'who' && draft.kind === 'who') {
    const ks = draft.ks.toUpperCase();
    return context.entities.some(e => (e.attributes.ksnumber ?? '').toUpperCase() === ks || e.name.toUpperCase().includes(ks));
  }
  if (spec.kind === 'when' && draft.kind === 'when') return !!draft.date && mentionsDate(dateTexts(context), draft.date);
  if (spec.kind === 'when-range' && draft.kind === 'when-range') {
    const texts = dateTexts(context);
    return !!draft.start && !!draft.end && mentionsDate(texts, draft.start) && mentionsDate(texts, draft.end);
  }
  if (spec.kind === 'where' && draft.kind === 'where') {
    const place = draft.place.trim().toLowerCase();
    return context.entities.some(e => e.type === 'PLACE' && (e.name.toLowerCase().includes(place) || place.includes(e.name.toLowerCase())));
  }
  return false;
}
