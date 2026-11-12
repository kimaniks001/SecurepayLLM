import { miniFirstPartyOriginsAligned } from './miniFirstPartyOrigin.mjs';
export { validateMiniFirstPartyOrigin, miniFirstPartyOriginsAligned } from './miniFirstPartyOrigin.mjs';

/**
 * First-party Mini KS001 is permitted ONLY for the same isolated staging API
 * as the rest of Mini. This does not prove the API/DB/rail isolation or Vercel
 * proxy configuration; those remain independent operator activation gates.
 */
export function getMiniFirstPartyOrigin(): string | null {
  return miniFirstPartyOriginsAligned(
    String(import.meta.env.VITE_MINI_FIRST_PARTY_API_ORIGIN || ''),
    String(import.meta.env.VITE_SECUREPAY_API_BASE_URL || ''),
  );
}
