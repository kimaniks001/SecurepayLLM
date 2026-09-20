import type { ContextView } from '../agent/controller';
import { canonicalRole } from '../../api/securepay/agent/roles';
import { FORMATION_CURRENCY, fromIso, sameAmount, type InstrumentDraft, type InstrumentSpec } from './model';

/**
 * "Did the real Trade Context prove the EXACT meaning the person selected?" -- never HTTP 200, never a
 * nearby fact. Each check states the meaning and refuses anything weaker.
 *
 * Active facts only (the backend's public view already omits superseded/invalidated ones). A fact's
 * state (CANDIDATE vs CONFIRMED) never changes what it MEANS, so it is deliberately ignored here:
 * whether a fact is adopted is the person's separate, explicit "Use this".
 */
const activeDates = (context: ContextView) => context.relationships.filter(r => r.kind === 'CONDITION' && typeof r.qualifiers.date === 'string');

/**
 * WHO: the intended entity carries the selected KS Number, AND a ROLE relationship has THAT SAME entity as
 * subject, AND that role is the canonical role of the word the person picked (never a label match).
 */
export function isWhoLinked(context: ContextView, who: { ks: string; role: string; entityName?: string }): boolean {
  const canonical = canonicalRole(who.role);
  if (!canonical || !who.ks) return false;
  const ks = who.ks.toUpperCase();
  return context.entities
    .filter(e => (e.type === 'PERSON' || e.type === 'ORGANIZATION') && (e.attributes.ksnumber ?? '').toUpperCase() === ks && (!who.entityName || e.name === who.entityName))
    .some(e => context.relationships.some(r => r.kind === 'ROLE' && r.subjectEntityId === e.id && r.qualifiers.role === canonical));
}

export function isRecorded(spec: InstrumentSpec, draft: InstrumentDraft, context: ContextView): boolean {
  if (spec.kind === 'money' && draft.kind === 'money') {
    // amount AND currency: KES 4,000 is not USD 4,000.
    return draft.currency === FORMATION_CURRENCY && context.relationships.some(r => r.kind === 'PAYMENT_CONDITION'
      && typeof r.qualifiers.amount === 'string' && sameAmount(r.qualifiers.amount, draft.amount)
      && (r.qualifiers.currency ?? '').toUpperCase() === draft.currency);
  }
  if (spec.kind === 'who' && draft.kind === 'who') return isWhoLinked(context, { ks: draft.ks, role: draft.role, entityName: spec.entityName });
  if (spec.kind === 'when' && draft.kind === 'when') {
    // Formation stores the ISO date. Exactly that one date must be the active deadline: a stale, different one still present is NOT resolved.
    if (!draft.date || !fromIso(draft.date)) return false;
    const dates = activeDates(context).map(r => r.qualifiers.date);
    return dates.length > 0 && dates.every(d => d === draft.date);
  }
  if (spec.kind === 'where' && draft.kind === 'where') {
    // One active PLACE, and it is the selected one -- an older, different place still active is a conflict, not a success.
    const places = context.entities.filter(e => e.type === 'PLACE');
    return places.length > 0 && places.every(e => e.name.toLowerCase() === draft.place.trim().toLowerCase());
  }
  return false;
}
