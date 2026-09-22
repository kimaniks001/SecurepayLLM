import type { ContextView } from '../agent/controller';
import { formatMoney, fromIso, longDate, parseAmount, type InstrumentSpec } from '../instruments/model';
import type { InstrumentPromptView } from '../../api/securepay/agent/instruments';

/**
 * UNDERSTOOD as a WORKBENCH: a projection of what the backend's Trade Context actually holds,
 * annotated with the instrument (if any) that can safely refine each fact.
 *
 * Deliberately NOT a form. There is no fixed WHAT/WHO/WHEN/WHERE/MONEY schema, no "required" slot
 * and no invented "not set" placeholder for something the backend never said was missing. Rows exist
 * only for facts SecurePay really holds; the `adds` list is merely the set of instruments that could
 * genuinely be opened (each backed by a real path), shown as quiet invitations.
 *
 * Phase 4 of the Agent/Trade-Context Convergence -- CAPABILITY CONVERGENCE: a row is directly
 * actionable wherever a real, precise structured-input target exists (the row's own entity/relationship
 * id, via SecurePay's `/structured-inputs` endpoint). An already-recorded PERSON/ORGANIZATION's role can
 * be corrected in place (`ASSIGN_ROLE`, `targetEntityId`); an amount row can be edited in place
 * (`SET_AMOUNT`, `targetRelationshipId`); a real DATE/DATE_RANGE entity can be corrected in place
 * (`SET_DATE`/`SET_DATE_RANGE`, `targetEntityId`); a PLACE can be corrected in place (`SET_LOCATION`,
 * `targetEntityId`). An identity-resolved WHO row's KS Number itself is never editable as plain text here
 * (identity stays a server-verified, separate action) -- only its role. A legacy CONDITION-relationship-
 * based date fact (from an external-fact/quotation source, never a real DATE entity) has no matching
 * structured-input target and remains read-only, changed in conversation. New details can be ADDED (a
 * first person/role, date, place or amount) through `adds`. Nothing in this file assigns or infers
 * Agreement, participant, confirmation, identity or Money authority.
 */
export type WorkbenchSection = 'what' | 'who' | 'when' | 'where' | 'money' | 'other';
export interface AdoptTarget { id: string; targetKind: 'ENTITY' | 'RELATIONSHIP' }
export interface WorkbenchItem {
  key: string;
  section: WorkbenchSection;
  value: string;
  /** Short qualifying phrases: a role, "Being considered", "Starts ...", "monthly". Always factual. */
  details: string[];
  /** Backend state of the primary fact, verbatim (CANDIDATE | CONFIRMED | ...). Never derived from UI events. */
  state: string;
  /** Candidate facts in this row that the person may explicitly "Use" (real adopt endpoint). */
  adopt: AdoptTarget[];
  spec: InstrumentSpec | null;
  /** WHAT only: a real ITEM/SERVICE the person named can be looked for on SecurePay (a product, or someone to do it). */
  find?: { kind: 'PRODUCT' | 'SERVICE'; what: string };
  /** WHO only: a named person with no KS Number understood yet. Candidate understanding, not a participant. */
  identityUnresolved?: boolean;
}
export interface WorkbenchAdd { key: 'who' | 'when' | 'where' | 'money'; label: string; spec: InstrumentSpec }
export interface Workbench { items: WorkbenchItem[]; adds: WorkbenchAdd[]; empty: boolean }

const SECTION_ORDER: WorkbenchSection[] = ['what', 'who', 'when', 'where', 'money', 'other'];
export const SECTION_LABEL: Record<WorkbenchSection, string> = { what: 'What', who: 'Who', when: 'When', where: 'Where', money: 'Money', other: 'Also understood' };

const ROLE_LABELS: Record<string, string> = {
  SELLER: 'Seller', BUYER: 'Buyer', LANDLORD: 'Landlord', TENANT: 'Tenant', ORGANIZER: 'Organizer', LENDER: 'Lender', BORROWER: 'Borrower',
  RECIPIENT: 'Recipient', COUNTERPARTY: 'Counterparty', SERVICE_PROVIDER: 'Service provider', CLIENT: 'Client', PROVIDER_CANDIDATE: 'Being considered',
};
const humanize = (token: string): string => ROLE_LABELS[token] ?? token.toLowerCase().replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
const INTERNAL_KEYS = new Set(['status', 'domain']);
const isKs = (text: string): boolean => /^KS\d{3,}$/i.test(text.trim());

function describeQualifiers(q: Record<string, string>): string {
  return Object.entries(q).filter(([key, value]) => !INTERNAL_KEYS.has(key) && value.trim() !== '').map(([, value]) => value).join(' · ');
}

export function projectWorkbench(context: ContextView | null): Workbench {
  const items: WorkbenchItem[] = [];
  const entities = context?.entities ?? [];
  const relationships = context?.relationships ?? [];
  const byId = new Map(entities.map(entity => [entity.id, entity]));
  const shownEntityIds = new Set<string>();
  const usedRelationshipIds = new Set<string>();
  const relationsOf = (entityId: string) => relationships.filter(r => r.subjectEntityId === entityId);

  // --- WHO -------------------------------------------------------------------------------------
  for (const entity of entities) {
    if (entity.type !== 'PERSON' && entity.type !== 'ORGANIZATION') continue;
    shownEntityIds.add(entity.id);
    const ks = entity.attributes.ksnumber && isKs(entity.attributes.ksnumber) ? entity.attributes.ksnumber.toUpperCase() : (isKs(entity.name) ? entity.name.toUpperCase() : null);
    const roles = relationsOf(entity.id).filter(r => r.kind === 'ROLE');
    const details: string[] = [];
    const adopt: AdoptTarget[] = [];
    for (const role of roles) {
      usedRelationshipIds.add(role.id);
      const code = role.qualifiers.role ?? '';
      if (code === 'DELIVERY_LOCATION') continue;
      const label = humanize(code || 'OTHER');
      details.push(code === 'OTHER' && role.qualifiers.descriptor ? role.qualifiers.descriptor : label);
      if (role.state === 'CANDIDATE') adopt.push({ id: role.id, targetKind: 'RELATIONSHIP' });
    }
    for (const duty of relationsOf(entity.id).filter(r => r.kind === 'RESPONSIBILITY')) {
      usedRelationshipIds.add(duty.id);
      if (duty.qualifiers.action) details.push(`will ${duty.qualifiers.action}`);
    }
    if (entity.state === 'CANDIDATE') adopt.unshift({ id: entity.id, targetKind: 'ENTITY' });
    items.push({
      key: `who:${entity.id}`, section: 'who', value: entity.name, details, state: entity.state, adopt,
      identityUnresolved: !ks,
      // A still-CANDIDATE person/organization's role can be corrected in place (ASSIGN_ROLE); if their
      // identity is not yet resolved, the SAME target also lets the Who instrument bind a real KS Number
      // to this exact entity (existingTradeEntityId) -- never as plain text, always server-verified. A
      // CONFIRMED row is read-only here, changed only in conversation.
      spec: entity.state === 'CANDIDATE' ? { kind: 'who', origin: 'understood', targetEntityId: entity.id, currentName: entity.name, takenNames: [] } : null,
    });
  }

  // --- WHERE (a place, optionally with a role such as delivery location) --------------------------
  for (const entity of entities) {
    if (entity.type !== 'PLACE') continue;
    shownEntityIds.add(entity.id);
    const details: string[] = [];
    const adopt: AdoptTarget[] = entity.state === 'CANDIDATE' ? [{ id: entity.id, targetKind: 'ENTITY' }] : [];
    for (const role of relationsOf(entity.id).filter(r => r.kind === 'ROLE')) {
      usedRelationshipIds.add(role.id);
      details.push(humanize(role.qualifiers.role ?? 'OTHER'));
      if (role.state === 'CANDIDATE') adopt.push({ id: role.id, targetKind: 'RELATIONSHIP' });
    }
    items.push({
      key: `where:${entity.id}`, section: 'where', value: entity.name, details, state: entity.state, adopt,
      spec: entity.state === 'CANDIDATE' ? { kind: 'where', origin: 'understood', targetEntityId: entity.id, currentPlace: entity.name } : null,
    });
  }

  // --- WHAT --------------------------------------------------------------------------------------
  for (const entity of entities) {
    const purpose = entity.attributes.purposeSubject ?? entity.attributes.purposeType;
    const isWhat = entity.type === 'SERVICE' || entity.type === 'ITEM' || (entity.type === 'CONCEPT' && !!purpose);
    if (!isWhat) continue;
    shownEntityIds.add(entity.id);
    items.push({
      key: `what:${entity.id}`, section: 'what', value: entity.type === 'CONCEPT' && purpose ? purpose : entity.name, details: [], state: entity.state,
      adopt: entity.state === 'CANDIDATE' ? [{ id: entity.id, targetKind: 'ENTITY' }] : [], spec: null,
      find: entity.type === 'ITEM' || entity.type === 'SERVICE' ? { kind: entity.type === 'ITEM' ? 'PRODUCT' : 'SERVICE', what: entity.name } : undefined,
    });
  }

  // --- WHEN / MONEY (deal-level relationships and date/money entities) -------------------------------
  for (const entity of entities) {
    if (entity.type !== 'DATE' && entity.type !== 'DATE_RANGE' && entity.type !== 'RECURRENCE') continue;
    shownEntityIds.add(entity.id);
    // A real DATE/DATE_RANGE entity (Phase 4's own structured-input convention) can be corrected in
    // place (SET_DATE/SET_DATE_RANGE, targetEntityId). RECURRENCE has no matching structured-input
        // action yet and stays read-only, changed in conversation.
    const editable = entity.type === 'DATE'
      ? { kind: 'when' as const, origin: 'understood' as const, targetEntityId: entity.id, currentDate: entity.attributes.date, currentTime: entity.attributes.time }
      : null;
    items.push({
      key: `when:${entity.id}`, section: 'when', value: entity.name, details: entity.type === 'RECURRENCE' ? ['Repeats'] : [], state: entity.state,
      adopt: entity.state === 'CANDIDATE' ? [{ id: entity.id, targetKind: 'ENTITY' }] : [],
      spec: entity.state === 'CANDIDATE' ? editable : null,
    });
  }
  for (const relation of relationships) {
    if (usedRelationshipIds.has(relation.id)) continue;
    const adopt: AdoptTarget[] = relation.state === 'CANDIDATE' ? [{ id: relation.id, targetKind: 'RELATIONSHIP' }] : [];
    const q = relation.qualifiers;
    if (relation.kind === 'CONDITION' && (q.date || q.startDate)) {
      usedRelationshipIds.add(relation.id);
      const text = q.date ?? q.startDate ?? '';
      items.push({
        key: `when:${relation.id}`, section: 'when', value: fromIso(text) ? longDate(text) : text, details: q.startDate && !q.date ? ['Starts'] : [], state: relation.state, adopt,
        // A legacy CONDITION-relationship-based date (from an external-fact/quotation source) has no
        // matching structured-input target -- unlike a real DATE entity above, it stays read-only.
        spec: null,
      });
    } else if (relation.kind === 'PAYMENT_CONDITION' && q.amount) {
      usedRelationshipIds.add(relation.id);
      const parsed = parseAmount(q.amount);
      const currency = (q.currency ?? '').trim().toUpperCase();
      const extras = Object.entries(q).filter(([key, value]) => key !== 'amount' && key !== 'currency' && value.trim() !== '' && value !== 'true' && !INTERNAL_KEYS.has(key)).map(([, value]) => value);
      if (q.recurring === 'true') extras.unshift('Recurring');
      const plain = Object.keys(q).every(key => key === 'amount' || key === 'currency');
      items.push({
        key: `money:${relation.id}`, section: 'money',
        value: parsed.ok ? formatMoney(parsed.value, currency) : `${currency} ${q.amount}`.trim(), details: extras, state: relation.state, adopt,
        // Editable as any real currency now (Phase 4 removes the old KES-only assumption) -- only when
        // the row is a plain amount+currency pair the person could unambiguously re-type; a row already
        // carrying other qualifiers (recurring, appliesTo, ...) stays read-only, changed in conversation.
        spec: plain && parsed.ok && relation.state === 'CANDIDATE'
          ? { kind: 'money', origin: 'understood', amount: parsed.value, currency: currency || undefined, targetRelationshipId: relation.id }
          : null,
      });
    }
  }
  for (const entity of entities) {
    if (entity.type !== 'MONEY') continue;
    shownEntityIds.add(entity.id);
    items.push({ key: `money:${entity.id}`, section: 'money', value: entity.name, details: [], state: entity.state, adopt: entity.state === 'CANDIDATE' ? [{ id: entity.id, targetKind: 'ENTITY' }] : [], spec: null });
  }

  // --- Everything else, read-only ---------------------------------------------------------------------
  const referenced = new Set(relationships.flatMap(r => [r.subjectEntityId, r.objectEntityId ?? '']));
  for (const relation of relationships) {
    if (usedRelationshipIds.has(relation.id)) continue;
    const text = describeQualifiers(relation.qualifiers);
    if (!text) continue;
    const subject = byId.get(relation.subjectEntityId);
    items.push({
      key: `other:${relation.id}`, section: 'other', value: text, details: subject && subject.type !== 'CONCEPT' ? [subject.name] : [], state: relation.state,
      adopt: relation.state === 'CANDIDATE' ? [{ id: relation.id, targetKind: 'RELATIONSHIP' }] : [], spec: null,
    });
  }
  for (const entity of entities) {
    if (shownEntityIds.has(entity.id) || entity.type === 'CONCEPT' && referenced.has(entity.id)) continue;
    items.push({ key: `other:${entity.id}`, section: 'other', value: entity.name, details: [], state: entity.state, adopt: entity.state === 'CANDIDATE' ? [{ id: entity.id, targetKind: 'ENTITY' }] : [], spec: null });
  }

  items.sort((a, b) => SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section));

  // "Add" is offered only for a FIRST date/place/amount -- a deliberate simplicity choice (avoiding an
  // ambiguous pile of unrelated dates/places), not a backend limitation: an existing CANDIDATE row of any
  // of these already has its own real, precise edit control above (targetEntityId/targetRelationshipId).
  const has = (section: WorkbenchSection) => items.some(item => item.section === section);
  const hasDeadline = relationships.some(r => r.kind === 'CONDITION' && typeof r.qualifiers.date === 'string') || entities.some(e => e.type === 'DATE' || e.type === 'DATE_RANGE');
  const adds: WorkbenchAdd[] = [];
  const takenNames = entities.filter(e => e.type === 'PERSON' || e.type === 'ORGANIZATION').map(e => e.name);
  adds.push({ key: 'who', label: 'Person', spec: { kind: 'who', origin: 'add', takenNames } });
  if (!hasDeadline) adds.push({ key: 'when', label: 'Date', spec: { kind: 'when', origin: 'add' } });
  if (!has('where')) adds.push({ key: 'where', label: 'Place', spec: { kind: 'where', origin: 'add' } });
  if (!has('money')) adds.push({ key: 'money', label: 'Amount', spec: { kind: 'money', origin: 'add' } });
  return { items, adds, empty: items.length === 0 };
}

/**
 * An Agent-proposed input affordance (`INSTRUMENT_PROMPT`) opens the SAME instrument a workbench row
 * would -- but only when that instrument can really record the result. Otherwise the person gets an
 * honest note instead of a control that would add a conflicting second date/place/amount.
 */
export type PromptResolution = { spec: InstrumentSpec } | { note: string };
export function specForPrompt(prompt: InstrumentPromptView, workbench: Workbench): PromptResolution {
  const items = (section: WorkbenchSection) => workbench.items.filter(item => item.section === section);
  switch (prompt.instrument) {
    case 'who': {
      const add = workbench.adds.find(a => a.key === 'who')?.spec;
      return { spec: { kind: 'who', origin: 'agent', role: prompt.hints.role, takenNames: add?.kind === 'who' ? add.takenNames : [] } };
    }
    case 'when': {
      if (workbench.adds.some(a => a.key === 'when')) return { spec: { kind: 'when', origin: 'agent', hintDate: prompt.hints.date } };
      const when = items('when');
      const editable = when.length === 1 ? when[0].spec : null;
      return editable?.kind === 'when' ? { spec: { ...editable, origin: 'agent' } } : { note: 'SecurePay already holds a date here. Open it from UNDERSTOOD to correct it, or tell KS001 if it has changed.' };
    }
    case 'money': {
      const money = items('money');
      if (money.length === 0) return { spec: { kind: 'money', origin: 'agent' } };
      const editable = money.length === 1 ? money[0].spec : null;
      return editable?.kind === 'money' ? { spec: { ...editable, origin: 'agent' } } : { note: 'SecurePay already holds an amount here. Open it from UNDERSTOOD to correct it, or tell KS001 in the conversation.' };
    }
    case 'where': {
      if (workbench.adds.some(a => a.key === 'where')) return { spec: { kind: 'where', origin: 'agent' } };
      const where = items('where');
      const editable = where.length === 1 ? where[0].spec : null;
      return editable?.kind === 'where' ? { spec: { ...editable, origin: 'agent' } } : { note: 'SecurePay already holds a place here. Open it from UNDERSTOOD to correct it, or tell KS001 if it has changed.' };
    }
  }
}
