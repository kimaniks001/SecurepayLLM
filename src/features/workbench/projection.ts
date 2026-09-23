import type { ContextView } from '../agent/controller';
import { formatMoney, formatTime12h, fromIso, isValidTime, longDate, parseAmount, type InstrumentSpec } from '../instruments/model';
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
/**
 * KS001 Upgrade Phase 2 final acceptance correction (item 4) -- the universal Phase 2 BUILD workbench
 * taxonomy: WHAT WE'RE MAKING HAPPEN, PEOPLE, RESPONSIBILITIES, MONEY, TIMING & PLACE, COMPLETION/
 * CONDITIONS, AUTHORITY, plus the read-only `other` fallback for anything genuinely outside these. Maps
 * onto EXISTING relationship/entity kinds only -- no new ontology: ROLE/PARTICIPATION -> people,
 * RESPONSIBILITY -> responsibilities, PAYMENT_CONDITION/MONEY -> money, DATE/DATE_RANGE/RECURRENCE/
 * date-shaped CONDITION/PLACE -> timingPlace, non-date CONDITION/DELIVERY -> completion, AUTHORITY_RULE
 * -> authority. "Still to decide" is rendered separately from `context.sufficiency`, not as a section here
 * (it is never itself a Trade Context fact).
 */
export type WorkbenchSection = 'what' | 'people' | 'responsibilities' | 'money' | 'timingPlace' | 'completion' | 'authority' | 'other';
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
  /** WHAT only: a real ITEM/SERVICE the person named can be looked for on SecurePay (a product, or someone
   *  to do it) -- shown once the person has EXPLICITLY accepted discovery for this exact entity (DISCOVERY
   *  INVITED, from the server's own interactionState -- see ContextView). */
  find?: { kind: 'PRODUCT' | 'SERVICE'; what: string };
  /** WHAT only: KS001 has OFFERED to help find this exact entity, but the person has not yet explicitly
   *  accepted (see AgentState#offeredDiscoveryEntityIds). Clicking the resulting action calls
   *  `controller.requestDiscovery(targetEntityId)` -- the ONLY thing that ever transitions this to `find`. */
  offer?: { targetEntityId: string };
  /** WHO only: a named person with no KS Number understood yet. Candidate understanding, not a participant. */
  identityUnresolved?: boolean;
  /**
   * KS001 Upgrade Phase 3 completion correction (item 1) -- bounded, server-resolved lineage when this
   * row's primary fact came from a source (a pasted plan/uploaded document/photo), never a fabricated
   * badge for an ordinary conversational fact. `null` for the latter.
   */
  source?: { displayName: string; locator: string; removed: boolean } | null;
}
export interface WorkbenchAdd { key: 'who' | 'when' | 'where' | 'money'; label: string; spec: InstrumentSpec }
export interface Workbench { items: WorkbenchItem[]; adds: WorkbenchAdd[]; empty: boolean }

const SECTION_ORDER: WorkbenchSection[] = ['what', 'people', 'responsibilities', 'money', 'timingPlace', 'completion', 'authority', 'other'];
export const SECTION_LABEL: Record<WorkbenchSection, string> = {
  what: "What we're making happen", people: 'People', responsibilities: 'Responsibilities', money: 'Money',
  timingPlace: 'Timing & place', completion: 'Completion', authority: 'Authority', other: 'Also understood',
};

const ROLE_LABELS: Record<string, string> = {
  SELLER: 'Seller', BUYER: 'Buyer', LANDLORD: 'Landlord', TENANT: 'Tenant', ORGANIZER: 'Organizer', LENDER: 'Lender', BORROWER: 'Borrower',
  RECIPIENT: 'Recipient', COUNTERPARTY: 'Counterparty', SERVICE_PROVIDER: 'Service provider', CLIENT: 'Client', PROVIDER_CANDIDATE: 'Being considered',
};
const humanize = (token: string): string => ROLE_LABELS[token] ?? token.toLowerCase().replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
const INTERNAL_KEYS = new Set(['status', 'domain']);
const isKs = (text: string): boolean => /^KS\d{3,}$/i.test(text.trim());

/**
 * Generic, non-domain-specific attribute keys never shown/offered as an ordinary descriptive detail
 * (Phase 4 review correction, Section 7/12) -- the SAME identity/authority reservation the backend enforces
 * (`ReservedTradeContextAttributeKeys`), plus this workbench's own known internal/legacy bookkeeping keys.
 * Everything else an entity's `attributes` carries is, by construction, an ORDINARY bounded descriptive
 * detail (a shoe's `size`, a painter's `finish`, a parcel's `area`, ...) -- there is deliberately no
 * per-concept allowlist: genericity comes from EXCLUDING the known non-descriptive keys, never from
 * enumerating the descriptive ones.
 */
const RESERVED_DETAIL_KEYS = new Set([
  'ksnumber', 'canonicalksnumber', 'identityid', 'identitytype', 'identitystatus', 'identityresolved',
  'verifiedidentity', 'participanteligible', 'eligible', 'consented', 'accepted', 'authenticated', 'authority',
  'purposesubject', 'purposetype', 'status', 'domain', 'latitude', 'longitude', 'coordinatesource',
  'date', 'time', 'startdate', 'enddate',
  // KS001 Upgrade Phase 1 final integration fix -- retained defensively even though the backend no longer
  // ever writes this as a Trade Context entity attribute at all: discovery consent moved to the server's
  // own interactionState projection (see ContextView#interactionState / DiscoveryEligibility's own
  // javadoc for the full root-cause explanation of why an entity attribute was the wrong shape). If this
  // key were ever reintroduced by mistake, it must still never render as an ordinary descriptive detail.
  'discoveryinvited',
]);
const isReservedDetailKey = (key: string): boolean => key.startsWith('_') || RESERVED_DETAIL_KEYS.has(key.toLowerCase());

/** The generic, server-projected descriptive-detail fields for an entity -- never a per-concept list. */
function describeEntityDetails(attributes: Record<string, string>): { key: string; label: string; value: string }[] {
  return Object.entries(attributes)
    .filter(([key, value]) => !isReservedDetailKey(key) && value.trim() !== '')
    .map(([key, value]) => ({ key, label: humanize(key), value }));
}

function describeQualifiers(q: Record<string, string>): string {
  return Object.entries(q).filter(([key, value]) => !INTERNAL_KEYS.has(key) && value.trim() !== '').map(([, value]) => value).join(' · ');
}

/**
 * `offeredDiscoveryEntityIds`: session-local DISCOVERY OFFERED state (see {@code AgentState}'s own
 * javadoc) -- never the authoritative source. `context.interactionState.discoveryInvitedEntityIds` (the
 * server-owned, persisted DISCOVERY INVITED truth) always takes display priority over it for the SAME
 * entity: once accepted, a row shows `find` (the real "See on SecurePay" action), never `offer` again.
 */
export function projectWorkbench(context: ContextView | null, offeredDiscoveryEntityIds: ReadonlySet<string> = new Set()): Workbench {
  const items: WorkbenchItem[] = [];
  const entities = context?.entities ?? [];
  const relationships = context?.relationships ?? [];
  const discoveryInvitedEntityIds = new Set(context?.interactionState?.discoveryInvitedEntityIds ?? []);
  const byId = new Map(entities.map(entity => [entity.id, entity]));
  const shownEntityIds = new Set<string>();
  const usedRelationshipIds = new Set<string>();
  const relationsOf = (entityId: string) => relationships.filter(r => r.subjectEntityId === entityId);

  // --- PEOPLE (ROLE and, KS001 Upgrade Phase 2 final acceptance correction item 4, PARTICIPATION) -----
  for (const entity of entities) {
    if (entity.type !== 'PERSON' && entity.type !== 'ORGANIZATION') continue;
    shownEntityIds.add(entity.id);
    const ks = entity.attributes.ksnumber && isKs(entity.attributes.ksnumber) ? entity.attributes.ksnumber.toUpperCase() : (isKs(entity.name) ? entity.name.toUpperCase() : null);
    // A real, server-verified identity association (identityResolved=true), never merely "the name looks
    // like a KS Number" -- this decides both whether the KS Number itself is visibly shown (Phase 4 final
    // closeout, Section 2) and whether re-binding a second identity is ever offered (Section 4).
    const identityResolved = entity.attributes.identityResolved === 'true' && !!ks;
    // PARTICIPATION (group participation, no new ontology) is folded in alongside ROLE -- a participant
    // with no individual role qualifier still appears here, never silently dropped (mirrors the backend's
    // own whoDetailed).
    const roles = relationsOf(entity.id).filter(r => r.kind === 'ROLE' || r.kind === 'PARTICIPATION');
    const details: string[] = [];
    if (identityResolved) details.push(ks!); // "Maua Shoes / KS003 / Seller" -- KS Number visible, never an internal id
    const adopt: AdoptTarget[] = [];
    for (const role of roles) {
      usedRelationshipIds.add(role.id);
      const code = role.qualifiers.role ?? '';
      if (code === 'DELIVERY_LOCATION') continue;
      const fallback = role.kind === 'PARTICIPATION' ? 'Participant' : humanize('OTHER');
      const label = code ? humanize(code) : fallback;
      details.push(code === 'OTHER' && role.qualifiers.descriptor ? role.qualifiers.descriptor : label);
      if (role.state === 'CANDIDATE') adopt.push({ id: role.id, targetKind: 'RELATIONSHIP' });
    }
    if (entity.state === 'CANDIDATE') adopt.unshift({ id: entity.id, targetKind: 'ENTITY' });
    // KS001 Upgrade Phase 3 completion correction (item 1) -- a role's own lineage is preferred (the more
    // specific "who said this role") when it has one, mirroring the backend's own whoDetailed doctrine.
    const roleWithSource = roles.find(role => role.source);
    items.push({
      key: `who:${entity.id}`, section: 'people', value: entity.name, details, state: entity.state, adopt,
      identityUnresolved: !ks,
      source: roleWithSource?.source ?? entity.source ?? null,
      // A still-CANDIDATE person/organization's role can be corrected in place (ASSIGN_ROLE); if their
      // identity is not yet resolved, the SAME target also lets the Who instrument bind a real KS Number
      // to this exact entity (existingTradeEntityId) -- never as plain text, always server-verified. A
      // CONFIRMED row is read-only here, changed only in conversation. `identityResolved` on the spec
      // tells the instrument this entity already has a verified identity, so it must never offer to bind a
      // SECOND, different one (Phase 4 final closeout, Section 4).
      spec: entity.state === 'CANDIDATE'
        ? { kind: 'who', origin: 'understood', targetEntityId: entity.id, currentName: entity.name, takenNames: [], identityResolved }
        : null,
    });
  }

  // --- RESPONSIBILITIES (KS001 Upgrade Phase 2 final acceptance correction item 4) ------------------
  // A dedicated section, no longer folded into a person's own PEOPLE row (avoiding the double-render the
  // mandate calls out) -- subject-name-prefixed where a real PERSON/ORGANIZATION subject is known, exactly
  // mirroring the backend's own responsibilitiesDetailed. Never assumes a subject is always a listed
  // person: a RESPONSIBILITY with an unknown/other subject still renders, text-only.
  for (const relation of relationships) {
    if (relation.kind !== 'RESPONSIBILITY') continue;
    const subject = relation.subjectEntityId ? byId.get(relation.subjectEntityId) : undefined;
    const text = relation.qualifiers.action || describeQualifiers(relation.qualifiers);
    if (!text) continue;
    usedRelationshipIds.add(relation.id);
    items.push({
      key: `responsibility:${relation.id}`, section: 'responsibilities',
      value: subject ? `${subject.name}: ${text}` : text, details: [], state: relation.state,
      adopt: relation.state === 'CANDIDATE' ? [{ id: relation.id, targetKind: 'RELATIONSHIP' }] : [],
      spec: null, source: relation.source ?? null,
    });
  }

  // --- TIMING & PLACE: place (a place, optionally with a role such as delivery location) ------------
  let hasPlaceItem = false;
  for (const entity of entities) {
    if (entity.type !== 'PLACE') continue;
    shownEntityIds.add(entity.id);
    hasPlaceItem = true;
    const details: string[] = [];
    // A quiet, truthful indication that real GPS accompanies this place -- never a fake map or reverse
    // geocode (Phase 4 final closeout, Section 6).
    if (entity.attributes.coordinateSource === 'USER_SHARED') details.push('GPS shared');
    const adopt: AdoptTarget[] = entity.state === 'CANDIDATE' ? [{ id: entity.id, targetKind: 'ENTITY' }] : [];
    for (const role of relationsOf(entity.id).filter(r => r.kind === 'ROLE')) {
      usedRelationshipIds.add(role.id);
      details.push(humanize(role.qualifiers.role ?? 'OTHER'));
      if (role.state === 'CANDIDATE') adopt.push({ id: role.id, targetKind: 'RELATIONSHIP' });
    }
    items.push({
      key: `where:${entity.id}`, section: 'timingPlace', value: entity.name, details, state: entity.state, adopt,
      spec: entity.state === 'CANDIDATE' ? { kind: 'where', origin: 'understood', targetEntityId: entity.id, currentPlace: entity.name } : null,
      source: entity.source ?? null,
    });
  }

  // --- WHAT --------------------------------------------------------------------------------------
  for (const entity of entities) {
    const purpose = entity.attributes.purposeSubject ?? entity.attributes.purposeType;
    const isWhat = entity.type === 'SERVICE' || entity.type === 'ITEM' || (entity.type === 'CONCEPT' && !!purpose);
    if (!isWhat) continue;
    shownEntityIds.add(entity.id);
    // Generic, bounded descriptive details (a shoe's size, a painter's finish, a parcel's area, ...) --
    // whatever this entity's own attributes actually hold, never a hard-coded "known concept" list (Phase
    // 4 review correction, Section 12).
    const detailFields = describeEntityDetails(entity.attributes);
    items.push({
      key: `what:${entity.id}`, section: 'what', value: entity.type === 'CONCEPT' && purpose ? purpose : entity.name,
      details: detailFields.map(field => `${field.label}: ${field.value}`), state: entity.state,
      adopt: entity.state === 'CANDIDATE' ? [{ id: entity.id, targetKind: 'ENTITY' }] : [],
      // Editable in place via the generic CORRECT_ENTITY_DETAIL editor -- only when there is at least one
      // ordinary detail to correct and the row is still a revisable CANDIDATE.
      spec: entity.state === 'CANDIDATE' && detailFields.length > 0
        ? { kind: 'detail', origin: 'understood', targetEntityId: entity.id, entityName: entity.name, fields: detailFields }
        : null,
      // KS001 Upgrade Phase 1, Section 14, hardened by the final integration fix -- "See on SecurePay" is
      // no longer shown merely because a WHAT row exists, and it is NEVER driven by a Trade Context entity
      // attribute (discovery consent moved to real interaction state -- see AgentConversation#
      // discoveryInvitedEntityIds' own javadoc). It appears only once the SERVER's own persisted
      // interactionState reports this exact entity id as DISCOVERY INVITED -- i.e. only after the person
      // has explicitly accepted (via requestDiscovery). Before that, if KS001 has merely OFFERED to help
      // find this exact entity (DISCOVERY_OFFER this session, never Trade Context), `offer` lets the
      // person explicitly accept; an ordinary row with neither gets no discovery affordance at all.
      find: (entity.type === 'ITEM' || entity.type === 'SERVICE') && discoveryInvitedEntityIds.has(entity.id)
        ? { kind: entity.type === 'ITEM' ? 'PRODUCT' : 'SERVICE', what: entity.name }
        : undefined,
      offer: (entity.type === 'ITEM' || entity.type === 'SERVICE')
          && !discoveryInvitedEntityIds.has(entity.id) && offeredDiscoveryEntityIds.has(entity.id)
        ? { targetEntityId: entity.id }
        : undefined,
      source: entity.source ?? null,
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
      : entity.type === 'DATE_RANGE'
        ? { kind: 'when' as const, origin: 'understood' as const, mode: 'range' as const, targetEntityId: entity.id, currentDate: entity.attributes.startDate, currentEndDate: entity.attributes.endDate }
        : null;
    const rangeLabel = entity.type === 'DATE_RANGE' && entity.attributes.startDate && entity.attributes.endDate
      ? `${longDate(entity.attributes.startDate)} to ${longDate(entity.attributes.endDate)}` : entity.name;
    // Human-friendly presentation only -- the canonical date/time attributes underneath are unchanged and
    // no timezone is invented (Phase 4 final closeout, Section 5). DATE_RANGE presentation is unchanged.
    const dateLabel = entity.type === 'DATE' && fromIso(entity.attributes.date ?? '') ? longDate(entity.attributes.date!) : entity.name;
    const timeDetail = entity.type === 'DATE' && entity.attributes.time && isValidTime(entity.attributes.time)
      ? [formatTime12h(entity.attributes.time)] : [];
    items.push({
      key: `when:${entity.id}`, section: 'timingPlace', value: entity.type === 'DATE_RANGE' ? rangeLabel : entity.type === 'DATE' ? dateLabel : entity.name,
      details: entity.type === 'RECURRENCE' ? ['Repeats'] : timeDetail, state: entity.state,
      adopt: entity.state === 'CANDIDATE' ? [{ id: entity.id, targetKind: 'ENTITY' }] : [],
      spec: entity.state === 'CANDIDATE' ? editable : null, source: entity.source ?? null,
    });
  }
  let hasMoneyItem = false;
  for (const relation of relationships) {
    if (usedRelationshipIds.has(relation.id)) continue;
    const adopt: AdoptTarget[] = relation.state === 'CANDIDATE' ? [{ id: relation.id, targetKind: 'RELATIONSHIP' }] : [];
    const q = relation.qualifiers;
    if (relation.kind === 'CONDITION' && (q.date || q.startDate)) {
      usedRelationshipIds.add(relation.id);
      const text = q.date ?? q.startDate ?? '';
      items.push({
        key: `when:${relation.id}`, section: 'timingPlace', value: fromIso(text) ? longDate(text) : text, details: q.startDate && !q.date ? ['Starts'] : [], state: relation.state, adopt,
        // A legacy CONDITION-relationship-based date (from an external-fact/quotation source) has no
        // matching structured-input target -- unlike a real DATE entity above, it stays read-only.
        spec: null, source: relation.source ?? null,
      });
    } else if (relation.kind === 'PAYMENT_CONDITION' && q.amount) {
      usedRelationshipIds.add(relation.id);
      hasMoneyItem = true;
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
        source: relation.source ?? null,
      });
    }
  }
  for (const entity of entities) {
    if (entity.type !== 'MONEY') continue;
    shownEntityIds.add(entity.id);
    hasMoneyItem = true;
    items.push({ key: `money:${entity.id}`, section: 'money', value: entity.name, details: [], state: entity.state, adopt: entity.state === 'CANDIDATE' ? [{ id: entity.id, targetKind: 'ENTITY' }] : [], spec: null, source: entity.source ?? null });
  }

  // --- COMPLETION / CONDITIONS (non-date CONDITION, DELIVERY -- KS001 Upgrade Phase 2 final acceptance
  // correction item 4) --------------------------------------------------------------------------------
  for (const relation of relationships) {
    if (usedRelationshipIds.has(relation.id)) continue;
    if (relation.kind !== 'CONDITION' && relation.kind !== 'DELIVERY') continue;
    const text = describeQualifiers(relation.qualifiers);
    if (!text) continue;
    usedRelationshipIds.add(relation.id);
    const subject = relation.subjectEntityId ? byId.get(relation.subjectEntityId) : undefined;
    items.push({
      key: `completion:${relation.id}`, section: 'completion', value: text,
      details: subject && subject.type !== 'CONCEPT' ? [subject.name] : [], state: relation.state,
      adopt: relation.state === 'CANDIDATE' ? [{ id: relation.id, targetKind: 'RELATIONSHIP' }] : [], spec: null,
      source: relation.source ?? null,
    });
  }

  // --- AUTHORITY (AUTHORITY_RULE -- KS001 Upgrade Phase 2 final acceptance correction item 4) --------
  // A governance/decision rule, e.g. "Treasurer approves supplier payment" -- a review fact only, never
  // itself real Agreement/Money authority (Section 32's own doctrine).
  for (const relation of relationships) {
    if (usedRelationshipIds.has(relation.id)) continue;
    if (relation.kind !== 'AUTHORITY_RULE') continue;
    const text = describeQualifiers(relation.qualifiers);
    if (!text) continue;
    usedRelationshipIds.add(relation.id);
    const subject = relation.subjectEntityId ? byId.get(relation.subjectEntityId) : undefined;
    items.push({
      key: `authority:${relation.id}`, section: 'authority', value: text,
      details: subject && subject.type !== 'CONCEPT' ? [subject.name] : [], state: relation.state,
      adopt: relation.state === 'CANDIDATE' ? [{ id: relation.id, targetKind: 'RELATIONSHIP' }] : [], spec: null,
      source: relation.source ?? null,
    });
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
      source: relation.source ?? null,
    });
  }
  for (const entity of entities) {
    if (shownEntityIds.has(entity.id) || entity.type === 'CONCEPT' && referenced.has(entity.id)) continue;
    items.push({ key: `other:${entity.id}`, section: 'other', value: entity.name, details: [], state: entity.state, adopt: entity.state === 'CANDIDATE' ? [{ id: entity.id, targetKind: 'ENTITY' }] : [], spec: null, source: entity.source ?? null });
  }

  items.sort((a, b) => SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section));

  // "Add" is offered only for a FIRST date/place/amount -- a deliberate simplicity choice (avoiding an
  // ambiguous pile of unrelated dates/places), not a backend limitation: an existing CANDIDATE row of any
  // of these already has its own real, precise edit control above (targetEntityId/targetRelationshipId).
  // KS001 Upgrade Phase 2 final acceptance correction (item 4) -- "where" no longer has its own coarse
  // section (place merged into the broader TIMING & PLACE section alongside date), so presence is tracked
  // directly during the place loop above (`hasPlaceItem`) rather than derived from `item.section`.
  const hasDeadline = relationships.some(r => r.kind === 'CONDITION' && typeof r.qualifiers.date === 'string') || entities.some(e => e.type === 'DATE' || e.type === 'DATE_RANGE');
  const adds: WorkbenchAdd[] = [];
  const takenNames = entities.filter(e => e.type === 'PERSON' || e.type === 'ORGANIZATION').map(e => e.name);
  adds.push({ key: 'who', label: 'Person', spec: { kind: 'who', origin: 'add', takenNames } });
  if (!hasDeadline) adds.push({ key: 'when', label: 'Date', spec: { kind: 'when', origin: 'add' } });
  if (!hasPlaceItem) adds.push({ key: 'where', label: 'Place', spec: { kind: 'where', origin: 'add' } });
  if (!hasMoneyItem) adds.push({ key: 'money', label: 'Amount', spec: { kind: 'money', origin: 'add' } });
  return { items, adds, empty: items.length === 0 };
}

/**
 * An Agent-proposed input affordance (`INSTRUMENT_PROMPT`) opens the SAME instrument a workbench row
 * would -- but only when that instrument can really record the result. Otherwise the person gets an
 * honest note instead of a control that would add a conflicting second date/place/amount.
 */
export type PromptResolution = { spec: InstrumentSpec } | { note: string };
export function specForPrompt(prompt: InstrumentPromptView, workbench: Workbench): PromptResolution {
  // KS001 Upgrade Phase 2 final acceptance correction (item 4) -- "when"/"where" no longer have their own
  // coarse sections (both now live under the broader TIMING & PLACE section), so items are matched by
  // their stable key prefix (unchanged by the section restructure) rather than by section membership.
  // `money` keeps its own unchanged section, but is matched the same way for consistency.
  const itemsByPrefix = (prefix: string) => workbench.items.filter(item => item.key.startsWith(prefix));
  switch (prompt.instrument) {
    case 'who': {
      const add = workbench.adds.find(a => a.key === 'who')?.spec;
      return { spec: { kind: 'who', origin: 'agent', role: prompt.hints.role, takenNames: add?.kind === 'who' ? add.takenNames : [] } };
    }
    case 'when': {
      // A DATE_RANGE_PICKER proposal always opens a fresh range selection -- ranges are additive (a
      // second, distinct period), never assumed to replace an existing single date (Phase 4 review
      // correction, Section 14/26).
      if (prompt.hints.mode === 'range') return { spec: { kind: 'when', origin: 'agent', mode: 'range' } };
      if (workbench.adds.some(a => a.key === 'when')) return { spec: { kind: 'when', origin: 'agent', hintDate: prompt.hints.date } };
      const when = itemsByPrefix('when:');
      const editable = when.length === 1 ? when[0].spec : null;
      return editable?.kind === 'when' ? { spec: { ...editable, origin: 'agent' } } : { note: 'SecurePay already holds a date here. Open it from UNDERSTOOD to correct it, or tell KS001 if it has changed.' };
    }
    case 'money': {
      const money = itemsByPrefix('money:');
      if (money.length === 0) return { spec: { kind: 'money', origin: 'agent' } };
      const editable = money.length === 1 ? money[0].spec : null;
      return editable?.kind === 'money' ? { spec: { ...editable, origin: 'agent' } } : { note: 'SecurePay already holds an amount here. Open it from UNDERSTOOD to correct it, or tell KS001 in the conversation.' };
    }
    case 'where': {
      if (workbench.adds.some(a => a.key === 'where')) return { spec: { kind: 'where', origin: 'agent' } };
      const where = itemsByPrefix('where:');
      const editable = where.length === 1 ? where[0].spec : null;
      return editable?.kind === 'where' ? { spec: { ...editable, origin: 'agent' } } : { note: 'SecurePay already holds a place here. Open it from UNDERSTOOD to correct it, or tell KS001 if it has changed.' };
    }
  }
}
