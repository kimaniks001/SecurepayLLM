import { parseJoinInterest, type JoinInterest } from '../join/share';

const TRUST_PATH_PATTERN = /^\/(?:trust|trust-project)\/?$/;
const TRUST_HASH_PATTERN = /^#\/?(?:trust|trust-project)\/?(?:\?(.*))?$/;

export interface TrustProjectDoorRoute {
  interest: JoinInterest | null;
  source: 'path' | 'hash';
}

/**
 * Public Trust Project doorway.
 *
 * It is presentation-only routing: no identity, membership, invitation authority or referral
 * provenance is carried here. Membership still happens only through the existing Join experience
 * after explicit acceptance of the current 12 Principles.
 */
export function parseTrustProjectDoor(pathname: string, search: string, hash: string): TrustProjectDoorRoute | null {
  if (TRUST_PATH_PATTERN.test(pathname)) {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    return { interest: parseJoinInterest(params.get('interest')), source: 'path' };
  }
  const match = TRUST_HASH_PATTERN.exec(hash);
  if (!match) return null;
  const params = new URLSearchParams(match[1] ?? '');
  return { interest: parseJoinInterest(params.get('interest')), source: 'hash' };
}

export const TRUST_PROJECT_PATH = '/trust';

/** Human-facing invitation doorway. It never grants membership or carries an inviter identity. */
export function trustProjectUrl(origin: string, interest: JoinInterest | null): string {
  const base = origin.replace(/\/+$/, '');
  return interest
    ? `${base}${TRUST_PROJECT_PATH}?interest=${encodeURIComponent(interest)}`
    : `${base}${TRUST_PROJECT_PATH}`;
}
