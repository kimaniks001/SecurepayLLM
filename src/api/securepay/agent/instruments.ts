import type { ComponentDto } from './dto';
import { KNOWN_ROLES } from './roles';
export { KNOWN_ROLES };

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
export type InstrumentPromptKind = 'who' | 'when' | 'money' | 'where';
export interface InstrumentHints { label?: string; role?: string; currency?: string; date?: string; mode?: 'range' }
export interface InstrumentPromptView { type: 'INSTRUMENT_PROMPT'; instrument: InstrumentPromptKind; hints: InstrumentHints }
/**
 * Inputs the backend cannot honestly support yet, rendered as an honest note: PHOTO_UPLOAD / DOCUMENT_UPLOAD
 * (no durable pre-Agreement media/blob storage exists). The bridge still PARSES them. KSNUMBER_PICKER is
 * real (Phase 4 of the Agent/Trade-Context Convergence, Part C): it opens the Who instrument, whose "I have
 * a KS Number" path performs a real, server-verified identity lookup. DATE_RANGE_PICKER is ALSO now real
 * (Phase 4 review correction, Section 14): it opens the SAME "when" instrument in range mode, backed by the
 * real `SET_DATE_RANGE` structured action -- it is no longer treated as an external blocker.
 */
export interface UnavailableInputView { type: 'UNAVAILABLE_INPUT'; input: 'photo' | 'document' }

const KIND: Record<string, InstrumentPromptKind> = {
  PERSON_PICKER: 'who', DATE_PICKER: 'when', DATE_RANGE_PICKER: 'when',
  AMOUNT_INPUT: 'money', LOCATION_PICKER: 'where',
  KSNUMBER_PICKER: 'who',
};

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
  if (role && KNOWN_ROLES.includes(role)) hints.role = role;
  const currency = text(data.currency, 3)?.toUpperCase();
  if (currency && /^[A-Z]{3}$/.test(currency)) hints.currency = currency;
  const date = text(data.date, 10) ?? text(data.month, 10);
  if (date && isRealIsoDate(date)) hints.date = date;
  if (component.type === 'DATE_RANGE_PICKER') hints.mode = 'range';
  return { type: 'INSTRUMENT_PROMPT', instrument, hints };
}
