import { formatMinor } from '../discovery/money';

/**
 * Exact money input and display. Financial amounts are integer MINOR units; nothing here uses floating point as authority.
 * (The previous code did `Math.round(Number(input) * 100)`, which accepts exponent notation, `Infinity`, negatives and more than two
 * decimals, and silently rounds.) The scale is 2 decimal places (cents): SecurePay's amounts are `long` minor units and the backend
 * exposes no per-currency scale, so anything more precise is REJECTED, never rounded.
 */
export type AmountParse = { ok: true; minor: number } | { ok: false; reason: 'empty' | 'malformed' | 'too-precise' | 'zero' | 'too-large' };

const DECIMAL = /^(\d{1,15})(?:\.(\d*))?$/;
export function parseMinorUnits(input: string): AmountParse {
  const text = input.trim();
  if (!text) return { ok: false, reason: 'empty' };
  const match = DECIMAL.exec(text);
  if (!match) return { ok: false, reason: 'malformed' }; // signs, exponent, commas, spaces, Infinity, NaN, letters
  const fraction = match[2] ?? '';
  if (text.endsWith('.') && fraction === '') return { ok: false, reason: 'malformed' };
  if (fraction.length > 2) return { ok: false, reason: 'too-precise' };
  const total = BigInt(match[1]) * 100n + BigInt(fraction.padEnd(2, '0') || '0');
  if (total === 0n) return { ok: false, reason: 'zero' };
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) return { ok: false, reason: 'too-large' };
  return { ok: true, minor: Number(total) };
}

export const AMOUNT_PROBLEM: Record<Exclude<AmountParse, { ok: true }>['reason'], string> = {
  empty: 'Enter an amount.',
  malformed: 'Enter the amount using digits and at most two decimal places, for example 1500 or 1500.50.',
  'too-precise': 'SecurePay amounts have at most two decimal places.',
  zero: 'The amount has to be more than zero.',
  'too-large': 'That amount is too large to send safely.',
};

/** Display from integer minor units only. A value that is not a safe integer is never guessed: it says so. */
export function moneyText(minor: number | null | undefined, currency: string | null | undefined): string {
  if (minor === null || minor === undefined) return 'Not shown';
  return formatMinor(minor, currency ?? '') ?? 'An amount SecurePay can’t show safely';
}

/** Some SecurePay DTOs carry minor units as decimal STRINGS. Only a plain non-negative safe integer is shown; anything else is not guessed. */
export function minorFromString(value: string | null | undefined): number | null {
  if (value === null || value === undefined || !/^\d{1,16}$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}
