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
 */

export type InstrumentKind = 'who' | 'when' | 'when-range' | 'money' | 'where';

/** Where the instrument was summoned from -- affects only presentation and focus return. */
export type InstrumentOrigin = 'understood' | 'agent' | 'add';

export interface WhoSpec { kind: 'who'; origin: InstrumentOrigin; entityName?: string; role?: string }
export interface WhenSpec { kind: 'when' | 'when-range'; origin: InstrumentOrigin; currentText?: string; hintDate?: string }
export interface MoneySpec { kind: 'money'; origin: InstrumentOrigin; amount?: string; currency?: string }
export interface WhereSpec { kind: 'where'; origin: InstrumentOrigin; currentText?: string }
export type InstrumentSpec = WhoSpec | WhenSpec | MoneySpec | WhereSpec;

export type InstrumentDraft =
  | { kind: 'who'; ks: string; role: string }
  | { kind: 'when'; date: string | null; time: string }
  | { kind: 'when-range'; start: string | null; end: string | null }
  | { kind: 'money'; amount: string; currency: string }
  | { kind: 'where'; place: string };

export function emptyDraft(spec: InstrumentSpec): InstrumentDraft {
  switch (spec.kind) {
    case 'who': return { kind: 'who', ks: '', role: spec.role ?? '' };
    case 'when': return { kind: 'when', date: null, time: '' };
    case 'when-range': return { kind: 'when-range', start: null, end: null };
    case 'money': return { kind: 'money', amount: spec.amount ?? '', currency: spec.currency ?? 'KES' };
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

/**
 * "Friday" / "next friday" / "on Fri" -> weekday index, so an AMBIGUOUS weekday can be resolved by
 * showing the real Fridays instead of silently choosing one. Only a bare weekday counts as
 * ambiguous: anything containing a digit or a month name is treated as an already-specific date.
 */
export function ambiguousWeekday(text: string | undefined): number | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (/\d/.test(lower) || MONTHS.some(month => lower.includes(month.toLowerCase()))) return null;
  const index = WEEKDAYS.findIndex(day => new RegExp(`\\b${day.toLowerCase().slice(0, 3)}(?:${day.toLowerCase().slice(3)})?\\b`).test(lower));
  return index >= 0 ? index : null;
}
/** Best-effort read of an already-recorded date string, used only to place the calendar's initial month/selection. */
export function readDateText(text: string | undefined, today: string): string | null {
  if (!text) return null;
  if (fromIso(text.trim())) return text.trim();
  const named = /(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([A-Za-z]{3,9})\.?,?\s*(\d{4})?/.exec(text) ?? null;
  if (named) {
    const month0 = MONTHS.findIndex(m => m.toLowerCase().startsWith(named[2].toLowerCase().slice(0, 3)));
    const year = named[3] ? Number(named[3]) : Number(today.slice(0, 4));
    const iso = month0 >= 0 ? toIso(year, month0, Number(named[1])) : '';
    if (fromIso(iso)) return iso;
  }
  return null;
}

/** Local 24h "HH:MM" -> "3:00 pm". */
export function friendlyTime(hhmm: string): string | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!match) return null;
  const hour = Number(match[1]);
  return `${hour % 12 === 0 ? 12 : hour % 12}:${match[2]} ${hour < 12 ? 'am' : 'pm'}`;
}

// ---------------------------------------------------------------------------------------------
// Statements -- the ONLY thing an instrument ever sends. Ordinary conversational sentences, so the
// existing Agent (and its correction handling) is the sole authority on what they mean.
// ---------------------------------------------------------------------------------------------

const article = (role: string): string => /^[aeiou]/i.test(role) ? 'an' : 'a';

export function statementFor(spec: InstrumentSpec, draft: InstrumentDraft, ctx: { previousAmount?: string; previousCurrency?: string; previousDateText?: string; previousPlace?: string } = {}): string | null {
  if (spec.kind === 'who' && draft.kind === 'who') {
    const ks = draft.ks.trim();
    const role = draft.role.trim().toLowerCase();
    if (!ks || !role) return null;
    return spec.entityName
      ? `${ks} is ${spec.entityName}, ${article(role)} ${role} in this.`
      : `${ks} is the ${role}.`;
  }
  if ((spec.kind === 'when') && draft.kind === 'when') {
    if (!draft.date) return null;
    const time = friendlyTime(draft.time);
    const when = `${longDate(draft.date)}${time ? ` at ${time}` : ''}`;
    return ctx.previousDateText && ambiguousWeekday(ctx.previousDateText) === null ? `Correction: the date is ${when}, not ${ctx.previousDateText}.` : `The date is ${when}.`;
  }
  if (spec.kind === 'when-range' && draft.kind === 'when-range') {
    if (!draft.start || !draft.end) return null;
    return `The dates are from ${longDate(draft.start)} to ${longDate(draft.end)}.`;
  }
  if (spec.kind === 'money' && draft.kind === 'money') {
    const parsed = parseAmount(draft.amount);
    if (!parsed.ok || !isCurrencyCode(draft.currency)) return null;
    const next = formatMoney(parsed.value, draft.currency);
    if (ctx.previousAmount && !sameAmount(ctx.previousAmount, parsed.value)) {
      return `Correction: the amount is ${next}, not ${formatMoney(ctx.previousAmount, ctx.previousCurrency ?? draft.currency)}.`;
    }
    return `The amount is ${next}.`;
  }
  if (spec.kind === 'where' && draft.kind === 'where') {
    const place = draft.place.replace(/\s+/g, ' ').trim();
    if (!place || place.length > 200) return null;
    return ctx.previousPlace ? `Correction: the location is ${place}, not ${ctx.previousPlace}.` : `The location is ${place}.`;
  }
  return null;
}
