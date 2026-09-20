/**
 * Formats a decimal-string minor-unit amount (e.g. Master's `quotedCostMinor`, the Agreement/
 * KeyContract-derived Plug-attribution referral `amountMinor`) into a customer-facing major.minor
 * money string without ever converting the amount through JS `Number`. Those two amounts are kept as
 * decimal strings by their own DTOs specifically because a large integer minor-unit value can lose
 * precision once it exceeds `Number.MAX_SAFE_INTEGER` under `Number(...)`/parseFloat-style coercion --
 * this uses `BigInt` for the integral division instead, which is exact at any size. Presentational
 * only: no rounding, no estimation, no FX, no currency conversion. Kept separate from the several
 * `number`-typed `money()` helpers already local to the Money World / R11A referral files, whose own
 * DTOs genuinely carry `number` minor units and do not have this precision exposure.
 */
export function decimalMoney(minor: string, currency: string): string {
  const trimmed = minor.trim();
  const negative = trimmed.startsWith('-');
  const digits = negative ? trimmed.slice(1) : trimmed;
  if (!/^\d+$/.test(digits)) return `${currency} ${minor}`;

  const value = BigInt(digits);
  const majorDigits = (value / 100n).toString();
  const minorDigits = (value % 100n).toString().padStart(2, '0');
  const grouped = majorDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return `${negative ? '-' : ''}${currency} ${grouped}.${minorDigits}`;
}
