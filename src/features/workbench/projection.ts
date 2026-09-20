import type { ContextView } from '../agent/controller';
import { KNOWN_ROLES } from '../../api/securepay/agent/instruments';
import { formatMoney, parseAmount, type InstrumentSpec } from '../instruments/model';
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
 * A row is directly actionable only when a SAFE, real path exists for it:
 *  - WHO   -> KSFinder (participant-safe identity read + a statement to the Agent)
 *  - WHEN  -> Calendar (a statement to the Agent)
 *  - MONEY -> Amount editor, only for a plain amount+currency fact
 *  - WHERE -> a named place (a statement; there is no geocoder or map behind it)
 * Everything else (WHAT, responsibilities, conditions, rules, contribution plans...) stays
 * conversational and is shown read-only. Nothing in this file assigns or infers Agreement,
 * participant, confirmation or Money state.
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
    let roleForSpec: string | undefined;
    for (const role of roles) {
      usedRelationshipIds.add(role.id);
      const code = role.qualifiers.role ?? '';
      if (code === 'DELIVERY_LOCATION') continue;
      const label = humanize(code || 'OTHER');
      details.push(code === 'OTHER' && role.qualifiers.descriptor ? role.qualifiers.descriptor : label);
      if (KNOWN_ROLES.includes(label.toLowerCase() as typeof KNOWN_ROLES[number]) && code !== 'PROVIDER_CANDIDATE') roleForSpec = label.toLowerCase();
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
      spec: { kind: 'who', origin: 'understood', entityName: ks ? undefined : entity.name, role: roleForSpec },
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
    items.push({ key: `where:${entity.id}`, section: 'where', value: entity.name, details, state: entity.state, adopt, spec: { kind: 'where', origin: 'understood', currentText: entity.name } });
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
    });
  }

  // --- WHEN / MONEY (deal-level relationships and date/money entities) -------------------------------
  for (const entity of entities) {
    if (entity.type !== 'DATE' && entity.type !== 'DATE_RANGE' && entity.type !== 'RECURRENCE') continue;
    shownEntityIds.add(entity.id);
    items.push({
      key: `when:${entity.id}`, section: 'when', value: entity.name, details: entity.type === 'RECURRENCE' ? ['Repeats'] : [], state: entity.state,
      adopt: entity.state === 'CANDIDATE' ? [{ id: entity.id, targetKind: 'ENTITY' }] : [],
      spec: entity.type === 'RECURRENCE' ? null : { kind: entity.type === 'DATE_RANGE' ? 'when-range' : 'when', origin: 'understood', currentText: entity.name },
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
        key: `when:${relation.id}`, section: 'when', value: text, details: q.startDate && !q.date ? ['Starts'] : [], state: relation.state, adopt,
        spec: { kind: 'when', origin: 'understood', currentText: text },
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
        spec: plain && parsed.ok ? { kind: 'money', origin: 'understood', amount: parsed.value, currency: currency || 'KES' } : null,
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

  const has = (section: WorkbenchSection) => items.some(item => item.section === section);
  const adds: WorkbenchAdd[] = [];
  if (!has('who')) adds.push({ key: 'who', label: 'Who', spec: { kind: 'who', origin: 'add' } });
  if (!has('when')) adds.push({ key: 'when', label: 'When', spec: { kind: 'when', origin: 'add' } });
  if (!has('where')) adds.push({ key: 'where', label: 'Where', spec: { kind: 'where', origin: 'add' } });
  if (!has('money')) adds.push({ key: 'money', label: 'Amount', spec: { kind: 'money', origin: 'add' } });
  return { items, adds, empty: items.length === 0 };
}

/**
 * An Agent-proposed input affordance (`INSTRUMENT_PROMPT`) opens the SAME instrument a workbench row
 * would, seeded from what is already understood -- so "Which Friday?" shows the real Fridays for the
 * "Friday" SecurePay already holds, rather than opening a blank calendar. Payload hints are optional
 * and were validated by the bridge; existing understood facts always take precedence over them.
 */
export function specForPrompt(prompt: InstrumentPromptView, workbench: Workbench): InstrumentSpec {
  const existing = (section: WorkbenchSection, kinds: InstrumentSpec['kind'][]) => workbench.items.find(item => item.section === section && item.spec && kinds.includes(item.spec.kind))?.spec ?? null;
  switch (prompt.instrument) {
    case 'who': {
      const spec = workbench.items.find(item => item.section === 'who' && item.identityUnresolved)?.spec;
      return spec?.kind === 'who' ? { ...spec, origin: 'agent', role: spec.role ?? prompt.hints.role } : { kind: 'who', origin: 'agent', role: prompt.hints.role };
    }
    case 'when': case 'when-range': {
      const spec = existing('when', ['when']);
      return { kind: prompt.instrument, origin: 'agent', currentText: prompt.instrument === 'when' && spec?.kind === 'when' ? spec.currentText : undefined, hintDate: prompt.hints.date };
    }
    case 'money': {
      const spec = existing('money', ['money']);
      return spec?.kind === 'money' ? { ...spec, origin: 'agent' } : { kind: 'money', origin: 'agent', currency: prompt.hints.currency };
    }
    case 'where': {
      const spec = existing('where', ['where']);
      return { kind: 'where', origin: 'agent', currentText: spec?.kind === 'where' ? spec.currentText : undefined };
    }
  }
}
