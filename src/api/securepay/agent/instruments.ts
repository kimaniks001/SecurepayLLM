import type { ComponentDto } from './dto';

/**
 * Phase 1 Production Agent Component Bridge.
 *
 * SecurePayAPI lets the model PROPOSE a small, closed set of safe input affordances
 * (MODEL_PROPOSABLE_COMPONENT_TYPES in SecurePayAgentOrchestrator): PERSON_PICKER, KSNUMBER_PICKER,
 * DATE_PICKER, DATE_RANGE_PICKER, AMOUNT_INPUT, LOCATION_PICKER, PHOTO_UPLOAD, DOCUMENT_UPLOAD.
 * The `data` bag of each is NOT a documented contract (loose string map, <=20 entries, <=2000 chars
 * each, no absolute URLs). So this bridge treats the component `type` as the whole instruction and
 * reads only a few OPTIONAL, strictly validated hints; it never trusts a payload to carry people,
 * dates, amounts, options or media. A hint that fails validation is dropped, never repaired.
 *
 * A proposal is an INVITATION to open an instrument, never an action: nothing here selects a
 * person, sets a date/amount, or uploads anything.
 */
export type InstrumentPromptKind = 'who' | 'when' | 'when-range' | 'money' | 'where';
export interface InstrumentHints { label?: string; role?: string; currency?: string; date?: string }
export interface InstrumentPromptView { type: 'INSTRUMENT_PROMPT'; instrument: InstrumentPromptKind; hints: InstrumentHints }
/** PHOTO_UPLOAD / DOCUMENT_UPLOAD: no durable pre-Agreement upload path exists (see Phase 1 doc). Rendered as an honest note. */
export interface UnavailableInputView { type: 'UNAVAILABLE_INPUT'; input: 'photo' | 'document' }

const KIND: Record<string, InstrumentPromptKind> = {
  PERSON_PICKER: 'who', KSNUMBER_PICKER: 'who', DATE_PICKER: 'when', DATE_RANGE_PICKER: 'when-range',
  AMOUNT_INPUT: 'money', LOCATION_PICKER: 'where',
};
export const KNOWN_ROLES = ['seller', 'buyer', 'service provider', 'client', 'landlord', 'tenant', 'lender', 'borrower', 'organizer', 'recipient', 'counterparty'] as const;

const text = (value: unknown, max = 120): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed.length > 0 && trimmed.length <= max && !/^https?:\/\//i.test(trimmed) ? trimmed : undefined;
};
export function isRealIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function instrumentComponentView(component: ComponentDto): InstrumentPromptView | UnavailableInputView | null {
  if (component.type === 'PHOTO_UPLOAD') return { type: 'UNAVAILABLE_INPUT', input: 'photo' };
  if (component.type === 'DOCUMENT_UPLOAD') return { type: 'UNAVAILABLE_INPUT', input: 'document' };
  const instrument = KIND[component.type];
  if (!instrument || typeof component.data !== 'object' || component.data === null || Array.isArray(component.data)) return null;
  const data = component.data;
  const hints: InstrumentHints = {};
  const label = text(data.label) ?? text(data.prompt);
  if (label) hints.label = label;
  const role = text(data.role)?.toLowerCase();
  if (role && (KNOWN_ROLES as readonly string[]).includes(role)) hints.role = role;
  const currency = text(data.currency, 3)?.toUpperCase();
  if (currency && /^[A-Z]{3}$/.test(currency)) hints.currency = currency;
  const date = text(data.date, 10) ?? text(data.month, 10);
  if (date && isRealIsoDate(date)) hints.date = date;
  return { type: 'INSTRUMENT_PROMPT', instrument, hints };
}
