import { ApiError } from '../http';
import type { CircleProfileResponse, CircleVerificationStatus } from './dto';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// Exact verified enum (ke.securepay.platform.identity.model.IdentityStatus, echoed by
// CircleProfileResponse.verificationStatus). An unrecognized value is refused, never guessed at — see
// task section 4 "Unknown backend enum/status values must fail closed."
const VERIFICATION_STATUSES: readonly CircleVerificationStatus[] = ['PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED'];
function assertKnownVerificationStatus(status: string): asserts status is CircleVerificationStatus {
  if (!(VERIFICATION_STATUSES as readonly string[]).includes(status)) {
    throw new ApiError('invalid-response', `SecurePay returned an unrecognized Circle verification status: ${status}`);
  }
}

// Same fixed, non-locale-dependent "DD Mon YYYY" format as Store's own asOfDate (api/securepay/store/adapters.ts) —
// this is a plain identity-record timestamp (ks_identities.created_at), never a fabricated "joined Circle" date.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function asOfDate(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;
  return `${String(date.getUTCDate()).padStart(2, '0')} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export interface CircleProfileView {
  canonicalKsNumber: string;
  displayName: string | null;
  verificationStatus: CircleVerificationStatus;
  memberSince: string;
  referredTraderCount: number;
  activatedReferredTraderCount: number;
  agreementsBroughtInCount: number;
}

/**
 * Final Phase 4 Economy correction (programme decision): `growthCreditTotal` is no longer part of
 * the real backend contract or this view -- the weighted-points mechanic it represented conflicted
 * with the locked no-points/no-gamification doctrine. Only real, separately-computed factual counts
 * remain (referredTraderCount, activatedReferredTraderCount, agreementsBroughtInCount).
 */
export function circleProfileView(dto: CircleProfileResponse): CircleProfileView {
  if (!isRecord(dto) || typeof dto.canonicalKsNumber !== 'string' || typeof dto.verificationStatus !== 'string'
    || typeof dto.memberSince !== 'string' || typeof dto.referredTraderCount !== 'number'
    || typeof dto.activatedReferredTraderCount !== 'number' || typeof dto.agreementsBroughtInCount !== 'number'
    || (dto.displayName !== null && typeof dto.displayName !== 'string')) {
    throw new ApiError('invalid-response', 'SecurePay returned an unreadable Circle profile.');
  }
  assertKnownVerificationStatus(dto.verificationStatus);
  return {
    canonicalKsNumber: dto.canonicalKsNumber,
    displayName: dto.displayName,
    verificationStatus: dto.verificationStatus,
    memberSince: asOfDate(dto.memberSince),
    referredTraderCount: dto.referredTraderCount,
    activatedReferredTraderCount: dto.activatedReferredTraderCount,
    agreementsBroughtInCount: dto.agreementsBroughtInCount,
  };
}
