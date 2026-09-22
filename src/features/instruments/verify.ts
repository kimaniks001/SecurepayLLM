import type { ContextView } from '../agent/controller';
import { canonicalRole } from '../../api/securepay/agent/roles';
import { fromIso, parsePersonName, sameAmount, type InstrumentDraft, type InstrumentSpec } from './model';

/**
 * "Did the real Trade Context prove the EXACT meaning the person selected?" -- never HTTP 200, never a
 * nearby fact. Each check states the meaning and refuses anything weaker.
 *
 * Active facts only (the backend's public view already omits superseded/invalidated ones). A fact's
 * state (CANDIDATE vs CONFIRMED) never changes what it MEANS, so it is deliberately ignored here:
 * whether a fact is adopted is the person's separate, explicit "Use this".
 */

/**
 * ADD A PERSON: the SAME entity (a PERSON named exactly as entered) has a ROLE relationship whose canonical
 * role is the chosen word's. Claims nothing about identity: no KS Number, participant or invitation.
 */
export function isPersonAdded(context: ContextView, who: { name: string; role: string }): boolean {
  const canonical = canonicalRole(who.role);
  if (!canonical || !who.name) return false;
  return context.entities
    .filter(e => e.type === 'PERSON' && e.name === who.name.trim())
    .some(e => context.relationships.some(r => r.kind === 'ROLE' && r.subjectEntityId === e.id && r.qualifiers.role === canonical));
}

/** An EXISTING entity (by id -- a role correction, not a name match) has a ROLE relationship whose
 *  canonical role is the chosen word's. Used for ASSIGN_ROLE edits on an already-recorded person. */
export function isRoleAssigned(context: ContextView, entityId: string, role: string): boolean {
  const canonical = canonicalRole(role);
  return !!canonical && context.relationships.some(r => r.kind === 'ROLE' && r.subjectEntityId === entityId && r.qualifiers.role === canonical);
}

/**
 * KS-LINKED WHO: the intended entity carries the selected KS Number, AND a ROLE relationship has THAT SAME
 * entity as subject, AND that role is the canonical role of the word the person picked (never a label
 * match). Verifies the real, server-verified `/identity-selections` association (Phase 4, Part C).
 */
export function isWhoLinked(context: ContextView, who: { ks: string; role: string; entityName?: string }): boolean {
  const canonical = canonicalRole(who.role);
  if (!who.ks) return false;
  const ks = who.ks.toUpperCase();
  const entities = context.entities.filter(e => (e.type === 'PERSON' || e.type === 'ORGANIZATION') && (e.attributes.ksnumber ?? '').toUpperCase() === ks && (!who.entityName || e.name === who.entityName));
  if (!canonical) return entities.length > 0; // no role requested -- resolution/association alone is what is being verified
  return entities.some(e => context.relationships.some(r => r.kind === 'ROLE' && r.subjectEntityId === e.id && r.qualifiers.role === canonical));
}

export function isRecorded(spec: InstrumentSpec, draft: InstrumentDraft, context: ContextView): boolean {
  if (spec.kind === 'money' && draft.kind === 'money') {
    // amount AND currency: KES 4,000 is not USD 4,000.
    return context.relationships.some(r => r.kind === 'PAYMENT_CONDITION'
      && typeof r.qualifiers.amount === 'string' && sameAmount(r.qualifiers.amount, draft.amount)
      && (r.qualifiers.currency ?? '').toUpperCase() === draft.currency.toUpperCase());
  }
  if (spec.kind === 'who' && draft.kind === 'who') {
    if (draft.ks.trim()) return isWhoLinked(context, { ks: draft.ks, role: draft.role });
    if (spec.targetEntityId) return isRoleAssigned(context, spec.targetEntityId, draft.role);
    const name = parsePersonName(draft.name, spec.takenNames);
    return name.ok && isPersonAdded(context, { name: name.value, role: draft.role });
  }
  if (spec.kind === 'when' && draft.kind === 'when') {
    if (!draft.date || !fromIso(draft.date)) return false;
    return context.entities.some(e => (e.type === 'DATE' || e.type === 'DATE_RANGE') && e.attributes.date === draft.date);
  }
  if (spec.kind === 'where' && draft.kind === 'where') {
    const trimmed = draft.place.trim().toLowerCase();
    return context.entities.some(e => e.type === 'PLACE' && e.name.trim().toLowerCase() === trimmed);
  }
  return false;
}
