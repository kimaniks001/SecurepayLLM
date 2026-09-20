/**
 * SecurePay INTERACTION INSTRUMENTS -- the single grammar for every contextual control summoned by
 * the conversation (an Agent-proposed PERSON_PICKER / DATE_PICKER / AMOUNT_INPUT ...) or by a row of
 * UNDERSTOOD.
 *
 * An instrument is NOT a card and NOT a form. It is a short-lived, cancelable, single-purpose
 * control that knows which fact it is helping settle (`InstrumentSpec`), holds the person's
 * in-progress input (`draft`) OUTSIDE the component tree so it survives BUILD/UNDERSTOOD switching
 * and recoverable failures, and finishes by saying ONE thing to the real Agent (`statementFor`).
 *
 * Doctrine that this file makes structural rather than conventional:
 *
 *  - An instrument can only ever produce a STATEMENT -- the same authority as the person typing the
 *    sentence. It cannot create an Agreement, join, confirm, invite, fund or release anything.
 *  - Direct edit != confirmation. Whether the resulting fact is CANDIDATE or CONFIRMED is decided by
 *    the backend and read back from Trade Context; nothing here sets or assumes a state.
 *  - Money is decimal STRINGS end to end. `Number` is used only for calendar arithmetic on days.
 *  - AN INSTRUMENT MAY CLOSE ONLY WHEN TRADE CONTEXT PROVES THE EXACT MEANING SELECTED (see verify.ts),
 *    and it is offered ONLY where the real formation path (RuleBasedAgreementInterpreter ->
 *    LegacyFactTradeContextAdapter) can represent and read back that meaning. Where it cannot, the
 *    instrument is deliberately not offered -- see docs/UI_COMPLETION_PHASE1_CONVERSATIONAL_WORKBENCH.md.
 */

export type InstrumentKind = 'who' | 'when' | 'money' | 'where';

/** Where the instrument was summoned from -- affects only presentation and focus return. */
export type InstrumentOrigin = 'understood' | 'agent' | 'add';

/** WHO: KSFinder. Production cannot resolve or link a KS Number yet (see ksformat.ts); the spec still carries context. */
export interface WhoSpec { kind: 'who'; origin: InstrumentOrigin; entityName?: string; role?: string }
/** WHEN: a FIRST date only. Formation files it as `deadline.value` (ISO) and cannot supersede it. */
export interface WhenSpec { kind: 'when'; origin: InstrumentOrigin; hintDate?: string }
/** MONEY: KES only -- the interpreter forces `value.currency = KES` for every amount it recognises. */
export interface MoneySpec { kind: 'money'; origin: InstrumentOrigin; amount?: string }
/** WHERE: a FIRST single-word place only. Formation creates one PLACE entity per name and never replaces it. */
export interface WhereSpec { kind: 'where'; origin: InstrumentOrigin }
export type InstrumentSpec = WhoSpec | WhenSpec | MoneySpec | WhereSpec;

export type InstrumentDraft =
  | { kind: 'who'; ks: string; role: string }
  | { kind: 'when'; date: string | null }
  | { kind: 'money'; amount: string; currency: string }
  | { kind: 'where'; place: string };

export const FORMATION_CURRENCY = 'KES';

export function emptyDraft(spec: InstrumentSpec): InstrumentDraft {
  switch (spec.kind) {
    case 'who': return { kind: 'who', ks: '', role: spec.role ?? '' };
    case 'when': return { kind: 'when', date: null };
    case 'money': return { kind: 'money', amount: spec.amount ?? '', currency: FORMATION_CURRENCY };
    case 'where': return { kind: 'where', place: '' };
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
export interface MonthCell { iso: string; day: number }
/** Monday-first weeks, `null` padding, so a month renders as complete rows of seven. */
export function monthGrid(year: number, month0: number): (MonthCell | null)[][] {
  const lead = (new Date(Date.UTC(year, month0, 1)).getUTCDay() + 6) % 7;
  const cells: (MonthCell | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= daysInMonth(year, month0); day += 1) cells.push({ iso: toIso(year, month0, day), day });
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, row) => cells.slice(row * 7, row * 7 + 7));
}

/** Local 24h and weekday helpers intentionally absent: SecurePay formation stores a bare ISO date, nothing else. */

// ---------------------------------------------------------------------------------------------
// Places -- mirrors RuleBasedAgreementInterpreter.PLACE_PREPOSITION and NAME_STOPWORDS.
// ---------------------------------------------------------------------------------------------

/**
 * The formation parser reads a place ONLY as `(in|at) <Capitalised single word>` (`[A-Z][a-z]{1,30}`);
 * "Kilimani, Nairobi" would record just "Kilimani", "Kilimani Road" just "Kilimani", "westlands" nothing.
 * Words on its name stoplist are never taken as names.
 */
const PLACE_STOPWORDS = new Set(['I', 'The', 'This', 'That', 'My', 'Our', 'We', 'You', 'He', 'She', 'They', 'It', 'A', 'An', 'Is', 'Are', 'Was', 'Were', 'For', 'And', 'But', 'So', 'If', 'When', 'Then', 'There', 'Another', 'Different', 'Second', 'More', 'Other', 'Same', 'By', 'Way', 'Also', 'However', 'Actually', 'Please', 'Once', 'After', 'Before', 'During', 'Since', 'While', 'Because', 'Though', 'Although', 'Kes', 'Kshs', 'Ksh', 'Shs', 'Bob', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', ...MONTHS, 'Contribution', 'Contributing', 'Buying', 'Building', 'Selling', 'Paying', 'Hiring', 'Collecting', 'Funeral', 'Wedding', 'Forming', 'Setting', 'Making', 'Purchase', 'Purchasing', 'Rent', 'Church', 'Chama', 'Securepay']);
export function parsePlace(raw: string): { ok: true; value: string } | { ok: false; reason: 'empty' | 'one-word' | 'reserved' } {
  const trimmed = raw.replace(/\s+/g, ' ').trim();
  if (!trimmed) return { ok: false, reason: 'empty' };
  const value = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  if (!/^[A-Z][a-z]{1,30}$/.test(value)) return { ok: false, reason: 'one-word' };
  if (PLACE_STOPWORDS.has(value)) return { ok: false, reason: 'reserved' };
  return { ok: true, value };
}

// ---------------------------------------------------------------------------------------------
// Statements -- the ONLY thing an instrument ever sends. Ordinary conversational sentences chosen
// to match the grammar the real formation interpreter recognises (proved in tests/ui-phase1.test.mjs).
// ---------------------------------------------------------------------------------------------

export function statementFor(spec: InstrumentSpec, draft: InstrumentDraft, ctx: { previousAmount?: string; previousCurrency?: string } = {}): string | null {
  if (spec.kind === 'who') return null; // production cannot link a KS Number: there is never a statement to send
  if (spec.kind === 'when' && draft.kind === 'when') {
    // "D Month YYYY" is the one date shape the interpreter reads; it stores the ISO date as `deadline.value`.
    return draft.date && fromIso(draft.date) ? `The date is ${longDate(draft.date)}.` : null;
  }
  if (spec.kind === 'money' && draft.kind === 'money') {
    const parsed = parseAmount(draft.amount);
    if (!parsed.ok || draft.currency !== FORMATION_CURRENCY) return null; // the interpreter would file any figure as KES
    const next = formatMoney(parsed.value, FORMATION_CURRENCY);
    const changed = !!ctx.previousAmount && (!sameAmount(ctx.previousAmount, parsed.value) || (ctx.previousCurrency ?? FORMATION_CURRENCY) !== FORMATION_CURRENCY);
    return changed ? `Correction: the amount is ${next}, not ${formatMoney(ctx.previousAmount!, ctx.previousCurrency ?? FORMATION_CURRENCY)}.` : `The amount is ${next}.`;
  }
  if (spec.kind === 'where' && draft.kind === 'where') {
    const place = parsePlace(draft.place);
    return place.ok ? `The place is in ${place.value}.` : null;
  }
  return null;
}
