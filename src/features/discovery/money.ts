/**
 * Money for discovery is shown from the backend's integer MINOR units with integer arithmetic only:
 * no float division, no locale rounding. `priceMinor: null` means the seller published no price.
 */
export function formatMinor(minor: number | null | undefined, currency: string): string | null {
  if (minor === null || minor === undefined || !Number.isSafeInteger(minor) || minor < 0) return null;
  const big = BigInt(minor);
  const whole = (big / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const cents = big % 100n;
  const amount = cents === 0n ? whole : `${whole}.${cents.toString().padStart(2, '0')}`;
  return currency ? `${currency} ${amount}` : amount;
}
/** Exact decimal string ("4000", "4000.5") for a minor amount -- what the formation path expects. */
export function minorToDecimal(minor: number): string | null {
  if (!Number.isSafeInteger(minor) || minor < 0) return null;
  const big = BigInt(minor);
  const cents = big % 100n;
  return cents === 0n ? (big / 100n).toString() : `${big / 100n}.${cents.toString().padStart(2, '0').replace(/0$/, '')}`;
}
