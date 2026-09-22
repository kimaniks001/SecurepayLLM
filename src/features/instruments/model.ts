import { canonicalRole } from '../../api/securepay/agent/roles';
import type { StructuredInputRequest } from '../../api/securepay/agent/dto';

/**
 * SecurePay INTERACTION INSTRUMENTS -- the single grammar for every contextual control summoned by
 * the conversation (an Agent-proposed PERSON_PICKER / DATE_PICKER / AMOUNT_INPUT ...) or by a row of
 * UNDERSTOOD.
 *
 * An instrument is NOT a card and NOT a form. It is a short-lived, cancelable, single-purpose
 * control that knows which fact it is helping settle (`InstrumentSpec`), holds the person's
 * in-progress input (`draft`) OUTSIDE the component tree so it survives BUILD/UNDERSTOOD switching
 * and recoverable failures, and finishes with ONE explicit structured action to SecurePay
 * (`structuredInputFor`) -- never a fabricated chat sentence.
 *
 * Doctrine that this file makes structural rather than conventional:
 *
 *  - Phase 4's LOCKED PRINCIPLE: a UI selection is an explicit, user-originated STRUCTURED action, not
 *    fake conversation. It is not "the person typing a sentence" -- it is validated and applied by
 *    SecurePay's own `/structured-inputs` (or, for KS identity, `/identity-selections`) endpoint,
 *    through the SAME Trade Context engine every conversational mutation already uses.
 *  - Direct edit != confirmation. Whether the resulting fact is CANDIDATE or CONFIRMED is decided by
 *    the backend and read back from Trade Context; nothing here sets or assumes a state.
 *  - Money is decimal STRINGS end to end. `Number` is used only for calendar arithmetic on days.
 *  - AN INSTRUMENT MAY CLOSE ONLY WHEN TRADE CONTEXT PROVES THE EXACT MEANING SELECTED (see verify.ts).
 */

export type InstrumentKind = 'who' | 'when' | 'money' | 'where' | 'detail';

/** Where the instrument was summoned from -- affects only presentation and focus return. */
export type InstrumentOrigin = 'understood' | 'agent' | 'add';

/**
 * WHO = ADD A PERSON/ORGANIZATION, with an optional role -- OR, if a real KS Number is supplied, an
 * exact, server-verified identity selection (see ksformat.ts / the Who instrument). `targetEntityId`,
 * when present, names an existing CANDIDATE entity this instrument is correcting (its role, or binding
 * it to a resolved identity) rather than adding a new one. `takenNames`: people SecurePay already
 * holds, used only to avoid an obviously duplicate NEW name.
 */
/** `identityResolved`: this exact target entity already carries a real, server-verified KS Number (Phase 4
 *  final closeout, Section 4) -- the instrument must never offer to bind it to a DIFFERENT identity; only
 *  its role remains editable. */
export interface WhoSpec { kind: 'who'; origin: InstrumentOrigin; role?: string; takenNames?: string[]; targetEntityId?: string; currentName?: string; identityResolved?: boolean }
/**
 * WHEN: a single date, optionally timed -- OR, when `mode === 'range'`, a start/end date pair (the real
 * `SET_DATE_RANGE` structured action). `targetEntityId` (a real DATE/DATE_RANGE entity) means "correct
 * this one in place"; `currentEndDate` only applies in range mode.
 */
export interface WhenSpec {
  kind: 'when'; origin: InstrumentOrigin; mode?: 'date' | 'range'; hintDate?: string; targetEntityId?: string;
  currentDate?: string; currentTime?: string; currentEndDate?: string;
}
/**
 * MONEY: a decimal amount with an explicit currency (never hard-coded). `targetRelationshipId` (an
 * existing PAYMENT_CONDITION row from UNDERSTOOD) means "edit this exact row in place"; without it, a
 * brand-new amount is recorded as its own candidate fact.
 */
export interface MoneySpec { kind: 'money'; origin: InstrumentOrigin; amount?: string; currency?: string; targetRelationshipId?: string }
/** WHERE: bounded, free, multi-word place text -- never restricted to one capitalized word -- OR user-shared
 *  GPS coordinates alone (no place text required). `targetEntityId` means "correct this PLACE in place." */
export interface WhereSpec { kind: 'where'; origin: InstrumentOrigin; targetEntityId?: string; currentPlace?: string }
/**
 * DETAIL -- the UNDERSTOOD workbench's own GENERIC, bounded descriptive-detail editor (Phase 4 review
 * correction, Section 13). Works identically for any entity's own ordinary attributes (a shoe's `size`, a
 * painter's `finish`, a parcel's `area`, ...) with zero per-concept code: `fields` are SERVER-PROJECTED --
 * read directly off the entity Trade Context already holds -- never invented or guessed by the UI. Editing
 * only ever changes the value of a key that already exists on this entity; the UI never introduces a new
 * attribute key SecurePay has not already shown it.
 */
export interface DetailField { key: string; label: string; value: string }
export interface DetailSpec { kind: 'detail'; origin: InstrumentOrigin; targetEntityId: string; entityName: string; fields: DetailField[] }
export type InstrumentSpec = WhoSpec | WhenSpec | MoneySpec | WhereSpec | DetailSpec;

export type InstrumentDraft =
  | { kind: 'who'; name: string; role: string; ks: string; participantType: 'PERSON' | 'ORGANIZATION' }
  | { kind: 'when'; date: string | null; time: string; endDate: string | null }
  | { kind: 'money'; amount: string; currency: string }
  | { kind: 'where'; place: string; latitude: number | null; longitude: number | null }
  | { kind: 'detail'; values: Record<string, string> };

/** A sensible default shown in the currency field -- never an enforced/only-supported currency. The
 *  backend validates the real ISO-4217 code the person actually confirms (java.util.Currency). */
export const DEFAULT_CURRENCY = 'KES';

export function emptyDraft(spec: InstrumentSpec): InstrumentDraft {
  switch (spec.kind) {
    case 'who': return { kind: 'who', name: '', role: spec.role ?? '', ks: '', participantType: 'PERSON' };
    case 'when': return { kind: 'when', date: spec.currentDate ?? null, time: spec.currentTime ?? '', endDate: spec.currentEndDate ?? null };
    case 'money': return { kind: 'money', amount: spec.amount ?? '', currency: spec.currency ?? DEFAULT_CURRENCY };
    case 'where': return { kind: 'where', place: spec.currentPlace ?? '', latitude: null, longitude: null };
    case 'detail': return { kind: 'detail', values: Object.fromEntries(spec.fields.map(field => [field.key, field.value])) };
  }
}

// ---------------------------------------------------------------------------------------------
// Amounts -- decimal strings only.
// ---------------------------------------------------------------------------------------------

/** Accepts "4000", "4,000", "4 000", "4000.5", "4,000.50". Rejects ambiguous / negative / exponent / >2 decimals. */
export function parseAmount(raw: string): { ok: true; value: string } | { ok: false; reason: 'empty' | 'invalid' | 'zero' } {
  const cleaned = raw.replace(/[,\s]/g, '');
  if (cleaned === '') return { ok: false, reason: 'empty' };
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(cleaned)) return { ok: false, reason: 'invalid' };
  const [whole, fraction = ''] = cleaned.split('.');
  const normalizedWhole = whole.replace(/^0+(?=\d)/, '');
  const trimmedFraction = fraction.replace(/0+$/, '');
  if (/^0*$/.test(normalizedWhole) && trimmedFraction === '') return { ok: false, reason: 'zero' };
  return { ok: true, value: trimmedFraction ? `${normalizedWhole}.${trimmedFraction}` : normalizedWhole };
}
/** Digit-group a decimal string without ever converting it to a number. */
export function groupAmount(value: string): string {
  const [whole, fraction] = value.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction ? `${grouped}.${fraction.padEnd(2, '0')}` : grouped;
}
export const formatMoney = (amount: string, currency: string): string => `${currency ? `${currency} ` : ''}${groupAmount(amount)}`;
export const sameAmount = (a: string, b: string): boolean => {
  const left = parseAmount(a); const right = parseAmount(b);
  return left.ok && right.ok && left.value === right.value;
};
/** A bounded, well-formed ISO-4217-SHAPED code (three uppercase letters). The real currency-exists check
 *  is the backend's (`java.util.Currency`) -- this is only "is this even a plausible code to submit." */
export const isCurrencyCode = (value: string): boolean => /^[A-Z]{3}$/.test(value);

// ---------------------------------------------------------------------------------------------
// Calendar -- pure, `today` is always injected (no hard-coded year/month anywhere).
// ---------------------------------------------------------------------------------------------

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export const pad = (n: number): string => String(n).padStart(2, '0');
export const toIso = (year: number, month0: number, day: number): string => `${year}-${pad(month0 + 1)}-${pad(day)}`;
export function fromIso(iso: string): { year: number; month0: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]); const month0 = Number(match[2]) - 1; const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month0, day));
  return check.getUTCFullYear() === year && check.getUTCMonth() === month0 && check.getUTCDate() === day ? { year, month0, day } : null;
}
/** Local calendar "today" as an ISO date. Injected into the pure functions below. */
export const todayIso = (now: Date = new Date()): string => toIso(now.getFullYear(), now.getMonth(), now.getDate());
export const weekdayOf = (iso: string): number => {
  const p = fromIso(iso);
  return p ? new Date(Date.UTC(p.year, p.month0, p.day)).getUTCDay() : 0;
};
export const daysInMonth = (year: number, month0: number): number => new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
export const addMonths = (year: number, month0: number, delta: number): { year: number; month0: number } => {
  const index = year * 12 + month0 + delta;
  return { year: Math.floor(index / 12), month0: ((index % 12) + 12) % 12 };
};
export const addDays = (iso: string, delta: number): string => {
  const p = fromIso(iso)!;
  const d = new Date(Date.UTC(p.year, p.month0, p.day + delta));
  return toIso(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};
export const longDate = (iso: string): string => {
  const p = fromIso(iso);
  return p ? `${WEEKDAYS[weekdayOf(iso)]}, ${p.day} ${MONTHS[p.month0]} ${p.year}` : iso;
};
/** A plain 24h `HH:mm` check -- the backend validates the real ISO-8601 time; this only bounds the shape. */
export const isValidTime = (raw: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(raw.trim());
/** A human-friendly 12-hour presentation of a validated `HH:mm` string -- pure string arithmetic, never a
 *  `Date` object, so there is no timezone conversion risk. The canonical `HH:mm` value underneath is never
 *  altered; this is presentation only (Phase 4 final closeout, Section 5). */
export function formatTime12h(raw: string): string {
  if (!isValidTime(raw)) return raw;
  const [hourText, minute] = raw.trim().split(':');
  const hour24 = Number(hourText);
  const period = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minute} ${period}`;
}
export interface MonthCell { iso: string; day: number }
/** Monday-first weeks, `null` padding, so a month renders as complete rows of seven. */
export function monthGrid(year: number, month0: number): (MonthCell | null)[][] {
  const lead = (new Date(Date.UTC(year, month0, 1)).getUTCDay() + 6) % 7;
  const cells: (MonthCell | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= daysInMonth(year, month0); day += 1) cells.push({ iso: toIso(year, month0, day), day });
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, row) => cells.slice(row * 7, row * 7 + 7));
}

// ---------------------------------------------------------------------------------------------
// Names and places -- bounded, free text. Phase 4 removes the old single-capitalized-word grammar
// restriction (an artifact of the retired free-text interpreter, not a real backend limit): the real
// structured-input endpoint accepts any bounded name/place string, validated server-side.
// ---------------------------------------------------------------------------------------------

const MAX_NAME_LENGTH = 200;
const MAX_PLACE_LENGTH = 300;
/** Same bound as the backend's own generic entity-attribute value length (`TradeContextMutationApplier
 *  .MAX_VALUE_LENGTH` = 500) -- a plain descriptive detail (size, finish, colour, area, ...) is always
 *  short text. */
export const MAX_DETAIL_VALUE_LENGTH = 500;

export function parsePlace(raw: string): { ok: true; value: string } | { ok: false; reason: 'empty' | 'too-long' } {
  const trimmed = raw.replace(/\s+/g, ' ').trim();
  if (!trimmed) return { ok: false, reason: 'empty' };
  if (trimmed.length > MAX_PLACE_LENGTH) return { ok: false, reason: 'too-long' };
  return { ok: true, value: trimmed };
}

/**
 * A person/organization's name as bounded free text -- a name SecurePay already holds (`taken`) is
 * refused here: correcting or re-role-ing an EXISTING person is a separate `targetEntityId`-carrying
 * action (`ASSIGN_ROLE`/`CORRECT_ENTITY_DETAIL`), never a second "add" of the same name.
 */
export function parsePersonName(raw: string, taken: readonly string[] = []): { ok: true; value: string } | { ok: false; reason: 'empty' | 'too-long' | 'taken' } {
  const trimmed = raw.replace(/\s+/g, ' ').trim();
  if (!trimmed) return { ok: false, reason: 'empty' };
  if (trimmed.length > MAX_NAME_LENGTH) return { ok: false, reason: 'too-long' };
  return taken.some(name => name.toLowerCase() === trimmed.toLowerCase()) ? { ok: false, reason: 'taken' } : { ok: true, value: trimmed };
}

// ---------------------------------------------------------------------------------------------
// Structured inputs -- the ONE thing an instrument ever sends (besides a KS identity selection, which
// is its own separate, trusted-user-action endpoint -- see the Who instrument). Never a chat sentence.
// ---------------------------------------------------------------------------------------------

type StructuredInputBody = Omit<StructuredInputRequest, 'expectedTradeContextVersion' | 'clientActionId'>;

/**
 * Builds the exact, closed-vocabulary body SecurePay's `/structured-inputs` endpoint expects for this
 * instrument's current draft, or `null` if nothing submittable is selected yet. `expectedTradeContextVersion`
 * and `clientActionId` are added by the instruments controller (the caller), which owns idempotency.
 */
export function structuredInputFor(spec: InstrumentSpec, draft: InstrumentDraft): StructuredInputBody | null {
  if (spec.kind === 'who' && draft.kind === 'who') {
    if (!canonicalRole(draft.role)) return null;
    // Editing an existing candidate only ever corrects its role -- the name is irrelevant to this action.
    if (spec.targetEntityId) return { type: 'ASSIGN_ROLE', targetEntityId: spec.targetEntityId, roleFreeText: draft.role.trim() };
    const name = parsePersonName(draft.name, spec.takenNames);
    if (!name.ok) return null;
    // A plain candidate name may be a person OR an organization/business -- the person's own explicit
    // choice, never hard-coded (Phase 4 review correction, Section 15A).
    return { type: 'ADD_PARTICIPANT_CANDIDATE', participantType: draft.participantType, name: name.value, roleFreeText: draft.role.trim() || undefined };
  }
  if (spec.kind === 'when' && draft.kind === 'when') {
    if (spec.mode === 'range') {
      if (!draft.date || !fromIso(draft.date) || !draft.endDate || !fromIso(draft.endDate)) return null;
      if (draft.date > draft.endDate) return null;
      return { type: 'SET_DATE_RANGE', targetEntityId: spec.targetEntityId, isoStartDate: draft.date, isoEndDate: draft.endDate };
    }
    if (!draft.date || !fromIso(draft.date)) return null;
    if (draft.time && !isValidTime(draft.time)) return null;
    return { type: 'SET_DATE', targetEntityId: spec.targetEntityId, isoDate: draft.date, isoTime: draft.time || undefined };
  }
  if (spec.kind === 'money' && draft.kind === 'money') {
    const parsed = parseAmount(draft.amount);
    if (!parsed.ok || !isCurrencyCode(draft.currency)) return null;
    // With a real UNDERSTOOD row to edit, target it exactly; otherwise SecurePay records a new,
    // context-wide amount (no WHAT entity required yet) -- never the unrelated external-fact/quotation
    // intake, which would misrepresent this as coming from an external source.
    return spec.targetRelationshipId
      ? { type: 'SET_AMOUNT', targetRelationshipId: spec.targetRelationshipId, amount: parsed.value, currency: draft.currency }
      : { type: 'SET_AMOUNT', amount: parsed.value, currency: draft.currency };
  }
  if (spec.kind === 'where' && draft.kind === 'where') {
    // GPS-only is legitimate (Phase 4 review correction, Section 10/27): a person who shares their
    // current location without typing a name for it. placeText may be blank ONLY when coordinates are
    // present -- SecurePay itself creates a truthful "Shared location" entity, never a fabricated address.
    const hasCoordinates = draft.latitude != null && draft.longitude != null;
    const place = parsePlace(draft.place);
    if (place.ok) {
      return {
        type: 'SET_LOCATION', targetEntityId: spec.targetEntityId, placeText: place.value,
        latitude: draft.latitude ?? undefined, longitude: draft.longitude ?? undefined,
      };
    }
    if (place.reason === 'empty' && hasCoordinates) {
      return {
        type: 'SET_LOCATION', targetEntityId: spec.targetEntityId, placeText: '',
        latitude: draft.latitude ?? undefined, longitude: draft.longitude ?? undefined,
      };
    }
    return null;
  }
  if (spec.kind === 'detail' && draft.kind === 'detail') {
    // Only keys that actually changed from their server-projected original value, and only keys this
    // entity already carries -- the UI never invents a new attribute key (Phase 4 review correction,
    // Section 6/13).
    const attributeChanges: Record<string, string> = {};
    for (const field of spec.fields) {
      const next = (draft.values[field.key] ?? '').trim();
      if (!next || next.length > MAX_DETAIL_VALUE_LENGTH) continue;
      if (next !== field.value) attributeChanges[field.key] = next;
    }
    if (Object.keys(attributeChanges).length === 0) return null;
    return { type: 'CORRECT_ENTITY_DETAIL', targetEntityId: spec.targetEntityId, attributeChanges };
  }
  return null;
}
